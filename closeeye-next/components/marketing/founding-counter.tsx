'use client'

import * as React from 'react'
import { Users } from 'lucide-react'
import { fetchFoundingCount, FOUNDING_GOAL } from '@/lib/db/founding'
import { cn } from '@/lib/utils'

/**
 * Founding-100 scarcity counter — honest, wired to real founding-family data via the
 * anon `founding_count()` RPC. State-aware copy (exclusivity when few have joined →
 * scarcity as places fill) so it's never a deflating "0 of 100". Renders nothing until
 * the count is known (no flash). `onDark` inverts it for dark sections (e.g. FinalCta).
 */
export function FoundingCounter({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  const [count, setCount] = React.useState<number | null>(null)
  React.useEffect(() => {
    let alive = true
    fetchFoundingCount().then((n) => { if (alive) setCount(n) }).catch(() => {})
    return () => { alive = false }
  }, [])
  if (count === null) return null

  const claimed = Math.min(count, FOUNDING_GOAL)
  const left = Math.max(0, FOUNDING_GOAL - claimed)
  const pct = Math.max(3, Math.round((claimed / FOUNDING_GOAL) * 100))
  const showNumber = claimed >= 10 && left > 0

  const line =
    left <= 0 ? `All ${FOUNDING_GOAL} founding places have been claimed.`
    : showNumber ? `${claimed} of ${FOUNDING_GOAL} founding families have joined`
    : `Be one of the first ${FOUNDING_GOAL} founding families in Hyderabad`
  const sub = left <= 0 ? 'Join the waitlist for the next cohort.' : showNumber ? `Only ${left} founding ${left === 1 ? 'place' : 'places'} left.` : 'Founding families lock their price for life.'

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-2xl border px-5 py-4',
        onDark ? 'border-white/15 bg-white/[0.06]' : 'border-green/20 bg-accent-soft/50',
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', onDark ? 'bg-white/10 text-white' : 'bg-green text-ivory')}>
          <Users className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className={cn('text-body-sm font-semibold leading-tight', onDark ? 'text-white' : 'text-ink')}>{line}</p>
          <p className={cn('text-caption leading-tight', onDark ? 'text-white/70' : 'text-muted')}>{sub}</p>
        </div>
      </div>
      {(showNumber || left <= 0) && (
        <div className={cn('h-1.5 overflow-hidden rounded-full', onDark ? 'bg-white/15' : 'bg-green/15')}>
          <div className={cn('h-full rounded-full transition-all', onDark ? 'bg-white' : 'bg-green')} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
