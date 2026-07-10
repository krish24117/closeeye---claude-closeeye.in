import { ArrowUpRight, Minus, AlertTriangle } from 'lucide-react'
import type { TrendRowData, TrendStatus } from '@/lib/family-report'
import { cn } from '@/lib/utils'

const TONE: Record<TrendStatus, { chip: string; icon: typeof Minus }> = {
  good: { chip: 'bg-success/12 text-success', icon: ArrowUpRight },
  stable: { chip: 'bg-accent-soft text-green', icon: Minus },
  attention: { chip: 'bg-warning/12 text-warning', icon: AlertTriangle },
}

/** WellnessTrendCard — the week at a glance, in plain words. Reusable. */
export function WellnessTrendCard({ rows }: { rows: TrendRowData[] }) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const tone = TONE[r.status]
          const Icon = tone.icon
          return (
            <li key={r.label} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-ink">{r.label}</p>
                <p className="text-caption text-muted">{r.value}</p>
              </div>
              <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold', tone.chip)}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2} /> {r.statusLabel}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
