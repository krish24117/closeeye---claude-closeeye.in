'use client'

import Link from 'next/link'
import { Target, ListChecks, Siren, MessageCircle, Phone, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { PRESENCE_MANAGER, type GuardianVisit } from '@/lib/guardian-data'
import { useVisit } from '../visit-state'
import { VisitTimer } from '../visit-timer'
import { objectiveOf } from '../derive'

const CARE_PREVIEW = ['Wellbeing', 'Mobility & medication', 'Conversation', 'Home & safety']

/** Screen 5 — a calm, minimal "you're with them now" screen. Few distractions. */
export function StartStep({ visit }: { visit: GuardianVisit }) {
  const { startedAt, dispatch } = useVisit()
  const objective = objectiveOf(visit)
  const familyPhone = visit.emergencyContacts[0]?.phone

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Presence */}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-line bg-card p-7 text-center shadow-sm">
        <Avatar initials={visit.memberInitials} size="xl" />
        <div>
          <h1 className="text-h2 text-ink">You’re with {visit.memberName.split(' ')[0]}</h1>
          <p className="mt-1.5 text-body text-muted">Be present. There’s no rush.</p>
        </div>
        {startedAt && (
          <div className="flex items-baseline gap-2 rounded-full bg-accent-soft px-5 py-2">
            <VisitTimer startedAt={startedAt} className="text-h3 font-bold text-green" />
            <span className="text-caption text-muted">
              started {new Date(startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Today's objective */}
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

      {/* Care preview */}
      <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-muted">
          <ListChecks className="h-4 w-4 text-green" strokeWidth={1.75} /> What we’ll note together
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CARE_PREVIEW.map((c) => (
            <span key={c} className="rounded-full border border-line bg-ivory px-3 py-1.5 text-caption font-medium text-muted">{c}</span>
          ))}
        </div>
      </section>

      <Button size="lg" className="w-full" onClick={() => dispatch({ type: 'next' })}>
        Begin care <ArrowRight className="h-5 w-5" strokeWidth={2} />
      </Button>

      {/* Quiet support row */}
      <div className="grid grid-cols-3 gap-2.5">
        <a href="tel:108" className="flex flex-col items-center gap-1.5 rounded-md border border-error/25 bg-card py-3 text-caption font-semibold text-error transition-colors hover:bg-error/5">
          <Siren className="h-5 w-5" strokeWidth={1.75} /> Emergency
        </a>
        <Link href="/guardian/messages" className="flex flex-col items-center gap-1.5 rounded-md border border-line bg-card py-3 text-caption font-semibold text-ink transition-colors hover:border-ink/25">
          <MessageCircle className="h-5 w-5 text-green" strokeWidth={1.75} /> Message {PRESENCE_MANAGER.name.split(' ')[0]}
        </Link>
        <a
          href={familyPhone ? `tel:${familyPhone.replace(/\s/g, '')}` : undefined}
          className="flex flex-col items-center gap-1.5 rounded-md border border-line bg-card py-3 text-caption font-semibold text-ink transition-colors hover:border-ink/25"
        >
          <Phone className="h-5 w-5 text-green" strokeWidth={1.75} /> Call family
        </a>
      </div>
    </div>
  )
}
