import { Minus, TrendingUp, AlertTriangle } from 'lucide-react'
import type { HealthCardData, HealthStatus } from '@/lib/family-report'
import { cn } from '@/lib/utils'

const TONE: Record<HealthStatus, { text: string; chip: string; stroke: string; icon: typeof Minus }> = {
  normal: { text: 'text-success', chip: 'bg-success/12 text-success', stroke: 'stroke-success', icon: Minus },
  watch: { text: 'text-warning', chip: 'bg-warning/12 text-warning', stroke: 'stroke-warning', icon: TrendingUp },
  attention: { text: 'text-error', chip: 'bg-error/10 text-error', stroke: 'stroke-error', icon: AlertTriangle },
}

/** HealthSnapshotCard — one reading and its status. Reusable. */
export function HealthSnapshotCard({ card }: { card: HealthCardData }) {
  const tone = TONE[card.status]
  const Icon = tone.icon
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-caption text-muted">{card.label}</p>
          <p className="text-h3 leading-none text-ink">
            {card.value} <span className="text-caption font-medium text-muted">{card.unit}</span>
          </p>
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide', tone.chip)}>
          <Icon className="h-3 w-3" strokeWidth={2} /> {card.statusLabel}
        </span>
      </div>
      <p className="text-caption text-muted">{card.note}</p>
    </div>
  )
}

export function HealthSnapshot({ cards }: { cards: HealthCardData[] }) {
  if (cards.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <HealthSnapshotCard key={c.key} card={c} />
      ))}
    </div>
  )
}
