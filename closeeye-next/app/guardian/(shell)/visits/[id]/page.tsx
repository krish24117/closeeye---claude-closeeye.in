import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Navigation,
  Star,
  HeartPulse,
  Sparkles,
  ClipboardList,
  MessageSquareText,
  Eye,
  History,
  Phone,
  Target,
  Clock,
  Car,
  ArrowRight,
} from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { StatusBadge, type StatusTone } from '@/components/family/badges'
import { Button } from '@/components/ui/button'
import { FamilyRequestsInbox } from '@/components/guardian/family-requests-inbox'
import { TODAY_VISITS, visitById, type GuardianVisit } from '@/lib/guardian-data'
import { objectiveOf } from '@/features/guardian/derive'

export function generateStaticParams() {
  return TODAY_VISITS.map((v) => ({ id: v.id }))
}

const STATUS: Record<GuardianVisit['status'], { tone: StatusTone; label: string }> = {
  upcoming: { tone: 'info', label: 'Upcoming' },
  'en-route': { tone: 'info', label: 'En route' },
  'in-progress': { tone: 'attention', label: 'In progress' },
  completed: { tone: 'positive', label: 'Completed' },
}

function Brief({ icon: Icon, title, children }: { icon: typeof Star; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-body-sm font-semibold uppercase tracking-widest text-muted">
        <Icon className="h-4 w-4 text-green" strokeWidth={1.75} /> {title}
      </h2>
      <div className="mt-2.5 text-body-sm text-ink">{children}</div>
    </section>
  )
}

const bullets = (items: string[]) => (
  <ul className="flex flex-col gap-1.5">
    {items.map((i) => (
      <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {i}</li>
    ))}
  </ul>
)

export default async function GuardianVisitBrief({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const v = visitById(id)
  if (!v) notFound()
  const s = STATUS[v.status]
  const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.address)}`
  const objective = objectiveOf(v)
  const familyPhone = v.emergencyContacts[0]?.phone

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="text" className="self-start">
        <Link href="/guardian"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Today</Link>
      </Button>

      {/* Header */}
      <header className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <Avatar initials={v.memberInitials} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h3">{v.memberName}</h1>
              <StatusBadge label={s.label} tone={s.tone} dot={false} />
            </div>
            <p className="text-caption text-muted">{v.familyName} · {v.relationship} · {v.age}</p>
          </div>
        </div>
        <p className="mt-4 text-body-sm text-muted">{v.address}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-caption text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> {v.timeLabel} · {v.durationLabel}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> {v.distanceLabel}{v.driveLabel ? ` · ${v.driveLabel}` : ''}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button asChild variant="secondary" size="sm">
            <a href={mapsLink} target="_blank" rel="noopener noreferrer"><Navigation className="h-4 w-4" strokeWidth={1.75} /> Directions</a>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={familyPhone ? `tel:${familyPhone.replace(/\s/g, '')}` : undefined}><Phone className="h-4 w-4" strokeWidth={1.75} /> Call family</a>
          </Button>
        </div>
      </header>

      {/* Today's objective — what the family hopes for */}
      <section className="rounded-lg border border-line bg-accent-soft/50 p-5">
        <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
          <Target className="h-4 w-4" strokeWidth={1.75} /> Today’s objective
        </h2>
        <ul className="mt-2.5 flex flex-col gap-2">
          {objective.map((o) => (
            <li key={o} className="flex gap-2 text-body-sm leading-relaxed text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {o}
            </li>
          ))}
        </ul>
      </section>

      {/* Requests the family prepared for this visit */}
      <FamilyRequestsInbox memberName={v.memberName} />

      {/* Begin the visit journey — navigate, arrive, check in */}
      {v.status !== 'completed' && (
        <Button asChild size="lg" className="w-full">
          <Link href={`/guardian/visits/${v.id}/visit`}>I’m here · Begin check-in <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
        </Button>
      )}

      <Brief icon={Star} title="Special notes"><p>{v.specialNotes}</p></Brief>
      <Brief icon={HeartPulse} title="Medical notes">{bullets(v.medicalNotes)}</Brief>
      <Brief icon={ClipboardList} title="Family instructions">{bullets(v.familyInstructions)}</Brief>
      <Brief icon={Sparkles} title="Personal preferences">{bullets(v.preferences)}</Brief>
      <Brief icon={MessageSquareText} title="Conversation ideas">{bullets(v.conversationSuggestions)}</Brief>
      <Brief icon={Eye} title="Things to observe">{bullets(v.thingsToObserve)}</Brief>
      {v.previousSummary && <Brief icon={History} title="Last visit"><p className="italic">{v.previousSummary}</p></Brief>}

      <Brief icon={Phone} title="Emergency contacts">
        <ul className="flex flex-col gap-2">
          {v.emergencyContacts.map((c) => (
            <li key={c.name} className="flex items-center justify-between gap-2">
              <span>{c.name} · <span className="text-muted">{c.relation}</span></span>
              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="font-semibold text-green hover:underline">{c.phone}</a>
            </li>
          ))}
        </ul>
      </Brief>
    </div>
  )
}
