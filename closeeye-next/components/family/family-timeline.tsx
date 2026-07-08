import Link from 'next/link'
import { Camera, Mic, ChevronRight, CalendarClock, Footprints } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { MoodBadge, VisitStatusBadge } from '@/components/family/badges'
import { CapturedPhotos } from '@/components/family/captured-media'
import { MEMBERS, type Visit } from '@/lib/family-data'
import { cn } from '@/lib/utils'

/** A single memory on the timeline. */
function TimelineEntry({ visit, last }: { visit: Visit; last: boolean }) {
  const member = MEMBERS.find((m) => m.id === visit.memberId)
  const clickable = visit.status !== 'cancelled'
  const upcoming = visit.status === 'upcoming'

  const body = (
    <div
      className={cn(
        'flex-1 rounded-lg border border-line bg-card p-5 shadow-sm transition-all duration-200 ease-premium',
        clickable && 'group-hover:-translate-y-0.5 group-hover:border-accent group-hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-widest text-green">{visit.dayLabel}</p>
          <p className="text-body font-semibold text-ink">{visit.memberName}</p>
          <p className="text-caption text-muted">{visit.dateLabel} · {visit.timeLabel} · {visit.guardianName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <VisitStatusBadge status={visit.status} />
          {visit.mood && <MoodBadge mood={visit.mood} />}
        </div>
      </div>

      <p className="mt-3 text-body-sm text-ink">{visit.summary}</p>

      {/* Memory chips: photos, voice, an activity */}
      {(visit.photoCount || visit.hasVoiceNote || visit.wellbeing) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {visit.photoCount ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-medium text-green">
              <Camera className="h-3.5 w-3.5" strokeWidth={1.5} /> {visit.photoCount} photos
            </span>
          ) : null}
          {visit.hasVoiceNote ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-medium text-green">
              <Mic className="h-3.5 w-3.5" strokeWidth={1.5} /> Voice note
            </span>
          ) : null}
          {visit.wellbeing?.find((w) => w.label === 'Mobility') ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-medium text-green">
              <Footprints className="h-3.5 w-3.5" strokeWidth={1.5} /> {visit.wellbeing.find((w) => w.label === 'Mobility')?.value}
            </span>
          ) : null}
        </div>
      )}

      {visit.photoCount ? <CapturedPhotos memberName={visit.memberName} fallbackCount={Math.min(visit.photoCount, 3)} max={3} interactive={false} className="mt-3 max-w-[15rem]" /> : null}

      {visit.followUp && (
        <p className="mt-3 flex items-center gap-1.5 text-caption text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Follow-up: {visit.followUp}
        </p>
      )}

      {clickable && (
        <p className="mt-3 inline-flex items-center gap-1 text-body-sm font-semibold text-green">
          {upcoming ? 'View details' : 'Read the full report'}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
        </p>
      )}
    </div>
  )

  return (
    <li className="relative flex gap-4">
      {/* spine */}
      {!last && <span className="absolute left-5 top-11 h-[calc(100%-1rem)] w-px bg-line" aria-hidden />}
      {/* node */}
      <span
        className={cn(
          'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ring-ivory',
          upcoming ? 'border border-dashed border-accent bg-ivory text-green' : 'bg-accent-soft text-green',
        )}
      >
        {upcoming ? <CalendarClock className="h-5 w-5" strokeWidth={1.5} /> : <Avatar initials={member?.initials ?? '··'} size="sm" className="h-8 w-8" />}
      </span>

      {clickable ? (
        <Link href={`/family/visits/${visit.id}`} className="group flex flex-1">
          {body}
        </Link>
      ) : (
        <div className="flex flex-1 opacity-75">{body}</div>
      )}
    </li>
  )
}

/** The family journal — every visit as a memory, newest first. */
export function FamilyTimeline({ visits }: { visits: Visit[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {visits.map((v, i) => (
        <TimelineEntry key={v.id} visit={v} last={i === visits.length - 1} />
      ))}
    </ol>
  )
}
