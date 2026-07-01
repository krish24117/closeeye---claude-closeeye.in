// Resolver for the "Visit" tab: jumps to the in-progress visit if one exists,
// otherwise the next upcoming visit, otherwise shows an empty state.
import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { PersonStanding, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export function CompanionActiveVisit() {
  const { user } = useAuth()
  const [target, setTarget] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'empty' | 'go'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) return
      // 1) in-progress visit
      const { data: active } = await supabase.from('bookings')
        .select('id').eq('companion_id', user.id).eq('status', 'in_progress')
        .is('checked_out_at', null).order('checked_in_at', { ascending: false }).limit(1).maybeSingle()
      if (cancelled) return
      if (active?.id) { setTarget(active.id); setState('go'); return }

      // 2) next upcoming assigned visit
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { data: next } = await supabase.from('bookings')
        .select('id').eq('companion_id', user.id).eq('status', 'companion_assigned')
        .gte('scheduled_at', today.toISOString()).order('scheduled_at', { ascending: true }).limit(1).maybeSingle()
      if (cancelled) return
      if (next?.id) { setTarget(next.id); setState('go'); return }
      setState('empty')
    })()
    return () => { cancelled = true }
  }, [user])

  if (state === 'go' && target) return <Navigate to={`/companion/visit/${target}`} replace />

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-[#6E6E73]">
        <Loader2 size={26} className="animate-spin text-[#0E2A1F]" />
        <p className="text-sm mt-3">Finding your visit…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center text-center px-6 py-24">
      <PersonStanding size={48} className="text-[#E5E5EA] mb-4" />
      <p className="text-[18px] font-bold text-[#1D1D1F]">No active visit</p>
      <p className="text-[14px] text-[#6E6E73] mt-1.5 max-w-[240px]">
        You have no visit in progress or scheduled. Your next visit will appear here.
      </p>
      <Link to="/companion" className="mt-6 bg-[#0E2A1F] text-white px-8 py-3 rounded-[12px] text-[14px] font-semibold">
        Back to Today
      </Link>
    </div>
  )
}
