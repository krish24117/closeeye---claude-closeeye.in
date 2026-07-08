import Link from 'next/link'
import { ArrowRight, Quote } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { MoodBadge } from '@/components/family/badges'
import { CapturedPhotos, CapturedVoice } from '@/components/family/captured-media'
import { PRESENCE_MANAGER, type Visit } from '@/lib/family-data'

/** The latest visit, told personally — photos, a note, the Guardian's warmth. */
export function LatestUpdate({ visit }: { visit: Visit }) {
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar initials={visit.memberName.split(' ').map((w) => w[0]).join('')} size="sm" />
          <div>
            <p className="text-body-sm font-semibold text-ink">{visit.memberName}</p>
            <p className="text-caption text-muted">{visit.dateLabel} · with {visit.guardianName}</p>
          </div>
        </div>
        {visit.mood && <MoodBadge mood={visit.mood} />}
      </header>

      <div className="flex flex-col gap-5 px-6 py-5">
        <p className="text-body text-ink">{visit.summary}</p>

        {visit.photoCount ? <CapturedPhotos memberName={visit.memberName} fallbackCount={Math.min(visit.photoCount, 3)} max={3} /> : null}

        {visit.hasVoiceNote && <CapturedVoice memberName={visit.memberName} guardianName={visit.guardianName} />}

        {visit.wellbeing && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md bg-accent-soft/40 p-4">
            {visit.wellbeing.slice(0, 4).map((w) => (
              <div key={w.label}>
                <dt className="text-caption text-muted">{w.label}</dt>
                <dd className="text-body-sm font-medium text-ink">{w.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {visit.pmReview && (
          <div className="flex gap-3 rounded-md border border-line p-4">
            <Quote className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.5} />
            <div>
              <p className="text-body-sm text-ink">{visit.pmReview}</p>
              <p className="mt-1 text-caption text-muted">{PRESENCE_MANAGER.name}, your Presence Manager</p>
            </div>
          </div>
        )}
      </div>

      <Link
        href={`/family/visits/${visit.id}`}
        className="flex items-center justify-center gap-1.5 border-t border-line py-3.5 text-body-sm font-semibold text-green transition-colors hover:bg-accent-soft/40"
      >
        Read the full report <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </article>
  )
}
