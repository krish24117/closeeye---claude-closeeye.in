import { TrendingUp, Minus, AlertTriangle } from 'lucide-react'
import { LEVEL_LABEL, type Level } from '@/lib/cloza-engine'
import { cn } from '@/lib/utils'

const TONE: Record<Level, { chip: string; icon: typeof Minus }> = {
  improving: { chip: 'bg-success/12 text-success', icon: TrendingUp },
  stable: { chip: 'bg-accent-soft text-green', icon: Minus },
  attention: { chip: 'bg-warning/12 text-warning', icon: AlertTriangle },
}

/** The only three intelligence verdicts, in human language. */
export function StatusPill({ level, className }: { level: Level; className?: string }) {
  const t = TONE[level]
  const Icon = t.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold', t.chip, className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} /> {LEVEL_LABEL[level]}
    </span>
  )
}
