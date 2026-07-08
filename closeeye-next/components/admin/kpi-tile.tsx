import { TrendingUp, TrendingDown } from 'lucide-react'
import type { Kpi } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

/** KpiTile — one headline business number with an optional period-over-period delta. */
export function KpiTile({ kpi }: { kpi: Kpi }) {
  const d = kpi.delta
  // Colour the delta by whether the movement is good for the business.
  const goodMove = d && kpi.good ? d.dir === kpi.good : undefined
  const deltaTone = goodMove === undefined ? 'text-muted' : goodMove ? 'text-success' : 'text-error'
  const Arrow = d?.dir === 'up' ? TrendingUp : TrendingDown

  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <p className="text-caption font-medium text-muted">{kpi.label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className={cn('text-h2 leading-none', kpi.tone === 'warning' ? 'text-warning' : 'text-ink')}>{kpi.value}</p>
        {d && (
          <span className={cn('inline-flex items-center gap-0.5 text-caption font-semibold', deltaTone)}>
            <Arrow className="h-3.5 w-3.5" strokeWidth={2} /> {d.pct}%
          </span>
        )}
      </div>
    </div>
  )
}
