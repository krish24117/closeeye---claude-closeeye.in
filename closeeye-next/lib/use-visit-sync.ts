'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Keep the Customer App in sync with the shared source of truth. Re-runs
 * `onChange` whenever the family's bookings / booking_requests change (Supabase
 * realtime — a Guardian completing a visit flips `bookings.status='completed'`),
 * and whenever the app regains focus/visibility. So the dashboard + visit history
 * reflect a completed visit automatically — never a manual refresh.
 */
export function useVisitSync(userId: string | undefined, onChange: () => void): void {
  const cb = React.useRef(onChange)
  cb.current = onChange

  React.useEffect(() => {
    if (!userId) return
    const fire = () => cb.current()
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') fire()
    }

    window.addEventListener('focus', fire)
    document.addEventListener('visibilitychange', onVisible)

    const channel = supabase
      .channel(`visit-sync-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `family_user_id=eq.${userId}` }, fire)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_requests', filter: `user_id=eq.${userId}` }, fire)
      .subscribe()

    return () => {
      window.removeEventListener('focus', fire)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [userId])
}
