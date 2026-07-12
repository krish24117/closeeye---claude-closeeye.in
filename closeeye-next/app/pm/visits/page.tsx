'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, CalendarClock } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { VisitStatusBadge } from '@/components/console/visit-status-badge'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleVisits, type ConsoleScheduleItem, type ConsoleVisitStatus } from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'

const GROUPS: { label: string; statuses: ConsoleVisitStatus[] }[] = [
  { label: 'Happening now', statuses: ['on-site', 'en-route'] },
  { label: 'Upcoming today', statuses: ['upcoming'] },
  { label: 'Completed', statuses: ['completed'] },
  { label: 'Cancelled', statuses: ['cancelled'] },
]

export default function VisitsPage() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [visits, setVisits] = React.useState<ConsoleScheduleItem[] | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    if (!isStaff) return
    setError(false)
    fetchConsoleVisits()
      .then((r) => { setVisits(r); setError(false) })
      .catch(() => { setVisits(null); setError(true) })
  }, [isStaff])

  React.useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Today&apos;s Presence</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This is only available to Close Eye team members." />
      </div>
    )
  }

  const active = (visits ?? []).filter((v) => v.status === 'on-site' || v.status === 'en-route').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Today&apos;s Presence</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          Every visit to your families today, live.
          {active > 0 && <span className="font-semibold text-success"> {active} happening now.</span>}
        </p>
      </div>

      {error ? (
        <ErrorState title="Couldn’t load today’s Presence" message="This is a connection error — NOT an all-clear. Please retry." onRetry={load} />
      ) : visits === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : visits.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No Presence today" hint="Visits scheduled for your families will appear here as they happen." />
      ) : (
        <div className="flex flex-col gap-6">
          {GROUPS.map((g) => {
            const rows = visits.filter((v) => g.statuses.includes(v.status))
            if (rows.length === 0) return null
            return (
              <section key={g.label}>
                <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">{g.label} · {rows.length}</p>
                <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
                  <ul className="divide-y divide-line">
                    {rows.map((v) => (
                      <li key={v.id}>
                        <Link href={v.lovedOneId ? `/pm/families/${v.lovedOneId}` : '/pm/families'} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent-soft/30">
                          <span className="w-16 shrink-0 text-caption font-bold text-ink">{v.timeLabel}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-sm font-semibold text-ink">{v.memberName}</span>
                            {v.guardianName && <span className="block truncate text-caption text-muted">{v.guardianName}</span>}
                          </span>
                          <VisitStatusBadge status={v.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
