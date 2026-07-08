import { Minus, TrendingUp, AlertTriangle } from 'lucide-react'
import type { HealthCardData, HealthStatus } from '@/lib/family-report'
import { cn } from '@/lib/utils'

const TONE: Record<HealthStatus, { text: string; chip: string; stroke: string; icon: typeof Minus }> = {
  normal: { text: 'text-success', chip: 'bg-success/12 text-success', stroke: 'stroke-success', icon: Minus },
  watch: { text: 'text-warning', chip: 'bg-warning/12 text-warning', stroke: 'stroke-warning', icon: TrendingUp },
  attention: { text: 'text-error', chip: 'bg-error/10 text-error', stroke: 'stroke-error', icon: AlertTriangle },
}

/** A small, gentle trend line — illustrative, never a clinical chart. */
function Spark({ points, className }: { points: number[]; className?: string }) {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100
      const y = 26 - ((p - min) / span) * 22
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn('h-7 w-full', className)} aria-hidden>
      <path d={d} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** HealthSnapshotCard — one reading, its status, and a subtle trend. Reusable. */
export function HealthSnapshotCard({ card }: { card: HealthCardData }) {
  const tone = TONE[card.status]
  const Icon = tone.icon
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4 shadow-sm">
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
      <Spark points={card.spark} className={tone.stroke} />
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
