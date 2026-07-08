import Link from 'next/link'
import { Navigation, Car, Clock, ArrowRight, CheckCircle2, CalendarDays } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { VisitCard } from '@/components/guardian/visit-card'
import { Button } from '@/components/ui/button'
import { TODAY_VISITS } from '@/lib/guardian-data'

const mapsLink = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

/** Check In tab — the launchpad into a visit. Surfaces the next one, ready to begin. */
export default function CheckInPage() {
  const next = TODAY_VISITS.find((v) => v.status !== 'completed')
  const later = TODAY_VISITS.filter((v) => v.status !== 'completed' && v.id !== next?.id)
  const done = TODAY_VISITS.filter((v) => v.status === 'completed').length

  if (!next) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-8 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-success/12 text-success">
          <CheckCircle2 className="h-10 w-10" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-h2 text-ink">All visits complete</h1>
          <p className="mt-2 text-body leading-relaxed text-muted">You cared for every family on today’s route. Rest well — you’ve earned it.</p>
        </div>
        <Button asChild variant="secondary" size="lg">
          <Link href="/guardian"><CalendarDays className="h-5 w-5" strokeWidth={1.75} /> Back to today</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-ink">Ready when you are</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          {done > 0 ? `${done} done · ` : ''}Your next visit is below. Begin whenever you reach the door.
        </p>
      </div>

      {/* Next visit — hero */}
      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <div className="bg-accent-soft/40 px-5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-green">
            <Clock className="h-3.5 w-3.5" strokeWidth={2} /> Next · {next.timeLabel}
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3.5">
            <Avatar initials={next.memberInitials} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-h3 leading-snug text-ink">{next.memberName}</p>
              <p className="mt-1 text-caption text-muted">{next.relationship} · {next.age} · {next.familyName}</p>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-body-sm text-muted">
            <Car className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} />
            <span className="font-semibold text-ink">{next.distanceLabel}</span>
            {next.driveLabel && <span>· {next.driveLabel}</span>}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <Button asChild size="lg" className="w-full">
              <Link href={`/guardian/visits/${next.id}/visit`}>Begin check-in <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button asChild variant="secondary" size="sm">
                <a href={mapsLink(next.address)} target="_blank" rel="noopener noreferrer"><Navigation className="h-4 w-4" strokeWidth={1.75} /> Directions</a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/guardian/visits/${next.id}`}>View brief</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Later today */}
      {later.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-h4">Later today</h2>
          {later.map((v) => (
            <VisitCard key={v.id} visit={v} />
          ))}
        </section>
      )}
    </div>
  )
}
