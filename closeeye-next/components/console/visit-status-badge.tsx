import {
  CalendarClock, Clock, Navigation, MapPin, CheckCircle2, AlarmClock, XCircle, RefreshCw, CircleSlash,
  HeartPulse, Stethoscope, Users, Siren, Video, Cake,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { VisitStatus, VisitType } from '@/lib/console-data'
import { cn } from '@/lib/utils'

/**
 * One place for every operational visit status — each with its own distinct look
 * (built only from the design system's semantic tones; no new colours). Reused by
 * the live monitor, the schedule and the family timeline.
 */
export const VISIT_STATUS: Record<VisitStatus, { label: string; chip: string; icon: LucideIcon }> = {
  scheduled: { label: 'Scheduled', chip: 'bg-ink/[0.05] text-muted', icon: CalendarClock },
  upcoming: { label: 'Upcoming', chip: 'bg-accent-soft text-green', icon: Clock },
  'en-route': { label: 'En route', chip: 'border border-green/40 bg-card text-green', icon: Navigation },
  'on-site': { label: 'On site', chip: 'bg-green text-ivory', icon: MapPin },
  completed: { label: 'Completed', chip: 'bg-success/12 text-success', icon: CheckCircle2 },
  delayed: { label: 'Delayed', chip: 'bg-warning/15 text-warning', icon: AlarmClock },
  cancelled: { label: 'Cancelled', chip: 'bg-error/10 text-error', icon: XCircle },
  rescheduled: { label: 'Rescheduled', chip: 'border border-warning/45 bg-warning/[0.06] text-warning', icon: RefreshCw },
  missed: { label: 'Missed', chip: 'bg-error text-ivory', icon: CircleSlash },
}

export function VisitStatusBadge({ status, className }: { status: VisitStatus; className?: string }) {
  const s = VISIT_STATUS[status]
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold', s.chip, className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2} /> {s.label}
    </span>
  )
}

/** Visit types — used for calendar colours and the legend. */
export const VISIT_TYPE: Record<VisitType, { label: string; chip: string; dot: string; icon: LucideIcon }> = {
  wellbeing: { label: 'Wellbeing', chip: 'bg-accent-soft text-green', dot: 'bg-green', icon: HeartPulse },
  hospital: { label: 'Hospital', chip: 'bg-warning/12 text-warning', dot: 'bg-warning', icon: Stethoscope },
  companion: { label: 'Companion', chip: 'bg-success/12 text-success', dot: 'bg-success', icon: Users },
  emergency: { label: 'Emergency', chip: 'bg-error/10 text-error', dot: 'bg-error', icon: Siren },
  video: { label: 'Video call', chip: 'bg-ink/[0.06] text-ink', dot: 'bg-ink', icon: Video },
  birthday: { label: 'Birthday', chip: 'border border-green/40 bg-card text-green', dot: 'bg-accent', icon: Cake },
}
