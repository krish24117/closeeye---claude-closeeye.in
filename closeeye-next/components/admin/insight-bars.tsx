import type { InsightRow } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

/** InsightBars — ranked horizontal bars (revenue-by-X, sources, reasons…). */
export function InsightBars({ rows, format, className }: { rows: InsightRow[]; format?: (n: number) => string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-body-sm">
            <span className="font-medium text-ink">{r.label}</span>
            <span className="font-semibold text-ink">{format ? format(r.value) : r.value}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-soft">
            <div className={cn('h-full rounded-full', i === 0 ? 'bg-green' : 'bg-green/50')} style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
