'use client'

import { useCallback, useEffect, useState } from 'react'
import { cancelVisit, clearOp, readOps, rescheduleVisit, type OpsMap } from '@/lib/visit-ops'

// Same-tab broadcast so every consumer (board, metrics, profile) stays in sync —
// the native `storage` event only fires in *other* tabs.
const EVENT = 'ce-visit-ops'
function broadcast() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
}

/** Client hook over the visit-ops store — mutate and the whole console updates live. */
export function useVisitOps() {
  const [ops, setOps] = useState<OpsMap>({})

  useEffect(() => {
    const read = () => setOps(readOps())
    read()
    window.addEventListener('storage', read)
    window.addEventListener(EVENT, read)
    return () => {
      window.removeEventListener('storage', read)
      window.removeEventListener(EVENT, read)
    }
  }, [])

  const cancel = useCallback((id: string, reason: string) => {
    cancelVisit(id, reason)
    broadcast()
  }, [])

  const reschedule = useCallback((id: string, opts: { rescheduledTo: string; assigneeId?: string }) => {
    rescheduleVisit(id, opts)
    broadcast()
  }, [])

  const reset = useCallback((id: string) => {
    clearOp(id)
    broadcast()
  }, [])

  return { ops, cancel, reschedule, reset }
}
