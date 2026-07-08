'use client'

import { useEffect, useState } from 'react'
import { FAMILIES, type ConsoleFamily, type HealthStatus } from '@/lib/console-data'
import { getReport, reportKey } from '@/lib/visit-reports'
import { listRequests } from '@/lib/family-requests'

/**
 * The console, connected to the rest of the ecosystem. This reads the same shared
 * stores the Guardian App writes to and Family Space reads from — so a completed
 * visit or a family request shows up here live. Swap the stores for Supabase
 * realtime subscriptions and this hook is the only thing that changes.
 */
export interface LiveFamily extends ConsoleFamily {
  pendingRequests: number
  hasReport: boolean
  liveStatus: HealthStatus
  liveReason: string
  liveLastVisit: string
}

function base(f: ConsoleFamily): LiveFamily {
  return { ...f, pendingRequests: 0, hasReport: false, liveStatus: f.status, liveReason: f.reason, liveLastVisit: f.lastVisitLabel }
}

function augment(f: ConsoleFamily): LiveFamily {
  const pending = listRequests(f.memberName).length
  const report = getReport(reportKey(f.memberName))
  let status = f.status
  let reason = f.reason
  let lastVisit = f.lastVisitLabel
  if (report) lastVisit = 'Just now · new report'
  if (pending > 0 && status === 'green') {
    status = 'yellow'
    reason = `${pending} family request${pending > 1 ? 's' : ''} pending for the next visit`
  }
  return { ...f, pendingRequests: pending, hasReport: Boolean(report), liveStatus: status, liveReason: reason, liveLastVisit: lastVisit }
}

export function useLiveFamilies(): LiveFamily[] {
  const [live, setLive] = useState<LiveFamily[]>(() => FAMILIES.map(base))
  useEffect(() => {
    const read = () => setLive(FAMILIES.map(augment))
    read()
    // Reflect changes made in other tabs (e.g. the family submitting a request).
    window.addEventListener('storage', read)
    return () => window.removeEventListener('storage', read)
  }, [])
  return live
}

export function useLiveFamily(memberName: string): LiveFamily | undefined {
  return useLiveFamilies().find((f) => f.memberName === memberName)
}
