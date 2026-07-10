'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, CalendarClock } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { VisitStatusBadge } from '@/components/console/visit-status-badge'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleCalendar, type ConsoleCalendarDay } from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'

export default function CalendarPage() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [days, setDays] = React.useState<ConsoleCalendarDay[] | null>(null)

  React.useEffect(() => {
    if (!isStaff) return
    fetchConsoleCalendar()
      .then(setDays)
      .catch(() => setDays([]))
  }, [isStaff])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Calendar</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This is only available to Close Eye team members." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Calendar</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Upcoming Presence across your families, day by day.</p>
      </div>

      {days === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : days.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nothing scheduled" hint="Upcoming visits for your families will appear here." />
      ) : (
        days.map((d) => (
          <section key={d.key}>
            <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">{d.isToday ? 'Today' : d.label} · {d.items.length}</p>
            <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
              <ul className="divide-y divide-line">
                {d.items.map((v) => (
                  <li key={v.id}>
                    <Link href={v.lovedOneId ? `/console/families/${v.lovedOneId}` : '/console/families'} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent-soft/30">
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
        ))
      )}
    </div>
  )
}
