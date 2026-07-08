import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MessageCircle, CalendarClock } from 'lucide-react'
import { VisitStatusBadge, MoodBadge } from '@/components/family/badges'
import { Avatar } from '@/components/family/avatar'
import { VisitExperience } from '@/components/family/visit-experience'
import { Button } from '@/components/ui/button'
import { VISITS, PRESENCE_MANAGER } from '@/lib/family-data'
import { whatsappLink } from '@/lib/site'

export function generateStaticParams() {
  return VISITS.map((v) => ({ id: v.id }))
}

export default async function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const visit = VISITS.find((v) => v.id === id)
  if (!visit) notFound()

  const initials = visit.memberName.split(' ').map((w) => w[0]).join('')

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="text" className="self-start">
        <Link href="/family/visits">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> All visits
        </Link>
      </Button>

      {/* Header */}
      <header className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-card p-6 shadow-sm">
        <Avatar initials={initials} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h3">{visit.memberName}</h1>
            <VisitStatusBadge status={visit.status} />
            {visit.mood && <MoodBadge mood={visit.mood} />}
          </div>
          <p className="mt-1 text-body-sm text-muted">
            {visit.serviceName} · {visit.dateLabel} · {visit.timeLabel} · with {visit.guardianName}
          </p>
        </div>
      </header>

      {visit.status === 'upcoming' ? (
        <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-h4">
            <CalendarClock className="h-5 w-5 text-green" strokeWidth={1.5} /> This visit is scheduled
          </h2>
          <p className="mt-4 text-body text-muted">
            {visit.summary} We&apos;ll share the story, photos, a warm summary and the full wellbeing
            report right here as soon as the visit is complete.
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Button asChild size="sm"><Link href="/family/messages"><MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Message Presence Manager</Link></Button>
            <Button asChild variant="secondary" size="sm">
              <a href={whatsappLink(`Hi ${PRESENCE_MANAGER.name.split(' ')[0]} — I'd like to reschedule ${visit.memberName}'s visit on ${visit.dateLabel}.`)}>Reschedule</a>
            </Button>
          </div>
        </section>
      ) : (
        <VisitExperience visit={visit} />
      )}
    </div>
  )
}
