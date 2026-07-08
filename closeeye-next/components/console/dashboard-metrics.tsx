'use client'

import { CheckCircle2, CalendarClock, AlarmClock, XCircle, RefreshCw, CircleSlash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TODAY_VISITS } from '@/lib/console-data'
import { visitMetrics } from '@/lib/visit-ops'
import { useVisitOps } from '@/features/console/use-visit-ops'
import { cn } from '@/lib/utils'

/** Live operational metrics — update the moment a visit is cancelled or rescheduled. */
export function DashboardMetrics() {
  const { ops } = useVisitOps()
  const m = visitMetrics(TODAY_VISITS, ops)
  const cells: { label: string; value: number; icon: LucideIcon; tone: string }[] = [
    { label: 'Completed', value: m.completed, icon: CheckCircle2, tone: 'text-success' },
    { label: 'Upcoming', value: m.upcoming, icon: CalendarClock, tone: 'text-green' },
    { label: 'Delayed', value: m.delayed, icon: AlarmClock, tone: 'text-warning' },
    { label: 'Cancelled', value: m.cancelled, icon: XCircle, tone: 'text-error' },
    { label: 'Rescheduled', value: m.rescheduled, icon: RefreshCw, tone: 'text-warning' },
    { label: 'No-show', value: m.noShow, icon: CircleSlash, tone: 'text-error' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {cells.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.label} className="rounded-lg border border-line bg-card p-3.5 shadow-sm">
            <Icon className={cn('h-4 w-4', c.tone)} strokeWidth={1.75} />
            <p className="mt-2 text-h3 leading-none text-ink">{c.value}</p>
            <p className="mt-1 text-caption text-muted">{c.label}</p>
          </div>
        )
      })}
    </div>
  )
}
