import type { HealthStatus } from '@/lib/console-data'
import { cn } from '@/lib/utils'

/**
 * Relationship & Service Health — never a medical score. Green on track, yellow
 * follow-up, red immediate attention. The colours are the design system's semantic
 * success / warning / error.
 */
export const HEALTH: Record<HealthStatus, { label: string; heading: string; dot: string; chip: string; ring: string; emoji: string }> = {
  green: { label: 'On track', heading: 'Everything on track', dot: 'bg-success', chip: 'bg-success/12 text-success', ring: 'ring-success/30', emoji: '🟢' },
  yellow: { label: 'Follow-up', heading: 'Follow-up recommended', dot: 'bg-warning', chip: 'bg-warning/12 text-warning', ring: 'ring-warning/30', emoji: '🟡' },
  red: { label: 'Attention', heading: 'Immediate attention', dot: 'bg-error', chip: 'bg-error/10 text-error', ring: 'ring-error/30', emoji: '🔴' },
}

export function HealthBadge({ status, className }: { status: HealthStatus; className?: string }) {
  const h = HEALTH[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold', h.chip, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', h.dot)} /> {h.label}
    </span>
  )
}
