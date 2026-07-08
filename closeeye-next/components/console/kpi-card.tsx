import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** OperationsKPICard — one calm operational metric. Reusable. */
export function OperationsKPICard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  tone?: 'neutral' | 'positive' | 'warning'
}) {
  const toneChip =
    tone === 'positive' ? 'bg-success/12 text-success' : tone === 'warning' ? 'bg-warning/12 text-warning' : 'bg-accent-soft text-green'
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={cn('grid h-9 w-9 place-items-center rounded-full', toneChip)}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-3 text-h2 leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-caption font-medium text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-caption text-muted/80">{sub}</p>}
    </div>
  )
}
