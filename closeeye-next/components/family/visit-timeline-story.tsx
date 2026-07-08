import {
  LogIn, Utensils, Coffee, Pill, HeartPulse, Footprints, MessageSquareText,
  Video, Music, BookOpen, Sparkles, PartyPopper, Camera, Mic, CheckCircle2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TimelineIcon, TimelineEventData } from '@/lib/family-report'
import { cn } from '@/lib/utils'

const ICONS: Record<TimelineIcon, LucideIcon> = {
  arrive: LogIn,
  meal: Utensils,
  tea: Coffee,
  medication: Pill,
  vitals: HeartPulse,
  walk: Footprints,
  memories: MessageSquareText,
  call: Video,
  music: Music,
  reading: BookOpen,
  prayer: Sparkles,
  celebration: PartyPopper,
  photo: Camera,
  voice: Mic,
  complete: CheckCircle2,
}

/** TimelineEvent — one moment on the visit's story timeline. Reusable. */
export function TimelineEvent({ event, last }: { event: TimelineEventData; last: boolean }) {
  const Icon = ICONS[event.icon]
  const isComplete = event.icon === 'complete'
  return (
    <li className="relative flex gap-4 pb-5 last:pb-0">
      {!last && <span className="absolute left-[1.1rem] top-9 h-[calc(100%-1.25rem)] w-px bg-line" aria-hidden />}
      <span
        className={cn(
          'relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-card',
          isComplete ? 'bg-success/12 text-success' : 'bg-accent-soft text-green',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <p className="text-caption font-semibold uppercase tracking-wide text-muted">{event.timeLabel}</p>
        <p className="text-body-sm font-semibold text-ink">{event.title}</p>
        {event.detail && <p className="text-caption text-muted">{event.detail}</p>}
        {(event.hasPhoto || event.hasVoice) && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-semibold text-green">
            {event.hasPhoto ? <Camera className="h-3 w-3" strokeWidth={1.75} /> : <Mic className="h-3 w-3" strokeWidth={1.75} />}
            {event.hasPhoto ? 'Photo' : 'Voice note'}
          </span>
        )}
      </div>
    </li>
  )
}

/** The visit told as a story — every event with its own moment in time. */
export function VisitStoryTimeline({ events }: { events: TimelineEventData[] }) {
  return (
    <ol className="flex flex-col">
      {events.map((e, i) => (
        <TimelineEvent key={e.id} event={e} last={i === events.length - 1} />
      ))}
    </ol>
  )
}
