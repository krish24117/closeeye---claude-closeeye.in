import { ShieldCheck, CheckCircle2, Mic, Camera, MessageSquareHeart, Sparkles, TriangleAlert, CalendarDays, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityItem as ActivityData, ActivityKind } from '@/lib/console-data'
import { cn } from '@/lib/utils'

const ICON: Record<ActivityKind, LucideIcon> = {
  checkin: ShieldCheck,
  completed: CheckCircle2,
  voice: Mic,
  photo: Camera,
  request: MessageSquareHeart,
  story: Sparkles,
  escalation: TriangleAlert,
  appointment: CalendarDays,
  delay: Clock,
}

/** ActivityItem — one line on the operational activity feed. Reusable. */
export function ActivityItem({ item, last }: { item: ActivityData; last?: boolean }) {
  const Icon = ICON[item.kind]
  const warn = item.kind === 'escalation' || item.kind === 'delay'
  return (
    <li className={cn('flex gap-3 py-3', !last && 'border-b border-line')}>
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', warn ? 'bg-warning/12 text-warning' : 'bg-accent-soft text-green')}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-ink">{item.text}</p>
        <p className="text-caption text-muted">{item.timeLabel}</p>
      </div>
    </li>
  )
}
