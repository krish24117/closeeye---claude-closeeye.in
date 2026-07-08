import { HeartPulse, Stethoscope, Users, Siren, Cake, Video, XCircle, RefreshCw, Plane } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarKind =
  | 'wellbeing' | 'hospital' | 'companion' | 'emergency' | 'birthday' | 'video' | 'cancelled' | 'rescheduled' | 'leave'

const CAL: Record<CalendarKind, { label: string; icon: LucideIcon; dot: string; borderL: string; chip: string }> = {
  wellbeing: { label: 'Wellbeing Visit', icon: HeartPulse, dot: 'bg-green', borderL: 'border-l-green', chip: 'bg-accent-soft text-green' },
  hospital: { label: 'Hospital Visit', icon: Stethoscope, dot: 'bg-warning', borderL: 'border-l-warning', chip: 'bg-warning/12 text-warning' },
  companion: { label: 'Companion Visit', icon: Users, dot: 'bg-success', borderL: 'border-l-success', chip: 'bg-success/12 text-success' },
  emergency: { label: 'Emergency Visit', icon: Siren, dot: 'bg-error', borderL: 'border-l-error', chip: 'bg-error/10 text-error' },
  birthday: { label: 'Birthday Visit', icon: Cake, dot: 'bg-accent', borderL: 'border-l-accent', chip: 'border border-green/40 bg-card text-green' },
  video: { label: 'Video Call', icon: Video, dot: 'bg-ink', borderL: 'border-l-ink', chip: 'bg-ink/[0.06] text-ink' },
  cancelled: { label: 'Cancelled', icon: XCircle, dot: 'bg-error', borderL: 'border-l-error', chip: 'bg-error/10 text-error' },
  rescheduled: { label: 'Rescheduled', icon: RefreshCw, dot: 'bg-warning', borderL: 'border-l-warning', chip: 'bg-warning/[0.08] text-warning' },
  leave: { label: 'Guardian Leave', icon: Plane, dot: 'bg-line', borderL: 'border-l-line', chip: 'bg-ink/[0.06] text-muted' },
}

export const LEGEND_ORDER: CalendarKind[] = ['wellbeing', 'hospital', 'companion', 'emergency', 'birthday', 'video', 'cancelled', 'rescheduled']

/** The visit-type legend — sits at the top of the calendar. */
export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-line bg-card px-4 py-3 shadow-sm">
      {LEGEND_ORDER.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5 text-caption text-muted">
          <span className={cn('h-2.5 w-2.5 rounded-full', CAL[k].dot)} /> {CAL[k].label}
        </span>
      ))}
    </div>
  )
}

export interface CalendarEntry {
  id: string
  time: string
  title: string
  sub: string
  kind: CalendarKind
}

/** CalendarCard — one agenda entry, colour-coded by visit type. */
export function CalendarCard({ entry }: { entry: CalendarEntry }) {
  const k = CAL[entry.kind]
  const Icon = k.icon
  const muted = entry.kind === 'cancelled'
  return (
    <div className={cn('flex items-center gap-3 rounded-md border border-l-4 border-line bg-card p-3.5 shadow-sm', k.borderL, muted && 'opacity-70')}>
      <span className="w-16 shrink-0 text-caption font-semibold text-muted">{entry.time}</span>
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', k.chip)}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-body-sm font-semibold text-ink', muted && 'line-through')}>{entry.title}</p>
        <p className="truncate text-caption text-muted">{entry.sub}</p>
      </div>
      <span className={cn('hidden shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold sm:inline', k.chip)}>{k.label}</span>
    </div>
  )
}
