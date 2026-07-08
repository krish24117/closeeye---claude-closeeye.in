'use client'

import { useState } from 'react'
import { CalendarX } from 'lucide-react'
import { FamilyTimeline } from '@/components/family/family-timeline'
import { cn } from '@/lib/utils'
import type { Visit, VisitStatus } from '@/lib/family-data'

const TABS: { key: VisitStatus; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

export function VisitTabs({ visits }: { visits: Visit[] }) {
  const [tab, setTab] = useState<VisitStatus>('completed')
  const filtered = visits.filter((v) => v.status === tab)

  return (
    <div>
      <div role="tablist" aria-label="Visit status" className="flex gap-1 rounded-sm border border-line bg-card p-1">
        {TABS.map((t) => {
          const count = visits.filter((v) => v.status === t.key).length
          const active = tab === t.key
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 rounded-[calc(var(--r-sm)-4px)] px-3 py-2 text-body-sm font-medium transition-colors',
                active ? 'bg-accent-soft text-green' : 'text-muted hover:text-ink',
              )}
            >
              {t.label} <span className="text-caption">({count})</span>
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {filtered.length > 0 ? (
          <FamilyTimeline visits={filtered} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-card/50 px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-green">
              <CalendarX className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="text-body-sm text-muted">No {tab} visits right now — and that&apos;s perfectly okay.</p>
          </div>
        )}
      </div>
    </div>
  )
}
