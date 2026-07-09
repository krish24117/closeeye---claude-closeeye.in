'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, HeartPulse, Loader2, MapPin, MessageSquareHeart,
  Navigation, Phone, PlayCircle, ShieldAlert, Sparkles, Target,
} from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchGuardianVisitFull, type GuardianVisitFull } from '@/lib/db/guardian'
import type { LucideIcon } from 'lucide-react'

const mapsLink = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

function fmtWhen(iso: string | null): string {
  if (!iso) return 'Time to be confirmed'
  try {
    return new Date(iso).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return '—'
  }
}

/** A brief section that only renders when it has content. */
function ListCard({ icon: Icon, title, items, tone = 'green' }: { icon: LucideIcon; title: string; items: string[]; tone?: 'green' | 'amber' }) {
  if (!items.length) return null
  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <p className={`flex items-center gap-2 text-caption font-semibold uppercase tracking-widest ${tone === 'amber' ? 'text-warning' : 'text-green'}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} /> {title}
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2 text-body-sm leading-relaxed text-ink">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green/50" /> {t}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function VisitBriefPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const [data, setData] = React.useState<GuardianVisitFull | null | undefined>(undefined)

  React.useEffect(() => {
    if (!user?.id || !params.id) {
      setData(null)
      return
    }
    fetchGuardianVisitFull(user.id, params.id).then(setData).catch(() => setData(null))
  }, [user?.id, params.id])

  const back = (
    <Link href="/guardian" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Today
    </Link>
  )

  if (data === undefined) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <EmptyState icon={CalendarClock} title="Visit not found" hint="This visit may have been reassigned or isn't assigned to you." action={<Button asChild><Link href="/guardian">Back to today</Link></Button>} />
      </div>
    )
  }

  const v = data.visit
  const completed = v.status === 'completed'
  const inProgress = v.status === 'in-progress'

  return (
    <div className="flex flex-col gap-6 pb-4">
      {back}

      <header className="flex items-center gap-4 rounded-lg border border-line bg-card p-5 shadow-sm">
        <Avatar initials={initialsOf(v.memberName)} size="xl" tone="solid" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h3 leading-tight text-ink">{v.memberName}</h1>
          <p className="mt-0.5 truncate text-body-sm text-muted">
            {[v.relationship, v.age ? `${v.age}` : '', v.service].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      {completed && (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-success/[0.06] p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-success" strokeWidth={1.75} />
          <p className="text-body-sm font-semibold text-ink">This visit is complete. Thank you for showing up.</p>
        </div>
      )}

      {/* When / where */}
      <section className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-green" strokeWidth={1.75} />
          <div><p className="text-caption text-muted">When</p><p className="text-body-sm font-medium text-ink">{fmtWhen(data.scheduledAt)}</p></div>
        </div>
        {v.address && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-green" strokeWidth={1.75} />
              <div><p className="text-caption text-muted">Where</p><p className="text-body-sm font-medium text-ink">{v.address}</p></div>
            </div>
            <Button asChild variant="secondary" size="sm">
              <a href={mapsLink(v.address)} target="_blank" rel="noopener noreferrer"><Navigation className="h-4 w-4" strokeWidth={1.75} /> Directions</a>
            </Button>
          </div>
        )}
      </section>

      {v.previousSummary && (
        <section className="rounded-lg border border-green/20 bg-accent-soft/40 p-5">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
            <MessageSquareHeart className="h-4 w-4" strokeWidth={1.75} /> Last time
          </p>
          <p className="mt-2 text-body-sm italic leading-relaxed text-ink">“{v.previousSummary}”</p>
        </section>
      )}

      {v.specialNotes && (
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
            <Target className="h-4 w-4" strokeWidth={1.75} /> For this visit
          </p>
          <p className="mt-2 text-body-sm leading-relaxed text-ink">{v.specialNotes}</p>
        </section>
      )}

      <ListCard icon={HeartPulse} title="Health notes" items={v.medicalNotes} tone="amber" />
      <ListCard icon={CheckCircle2} title="What the family asked" items={v.familyInstructions} />
      <ListCard icon={Sparkles} title="Preferences" items={v.preferences} />
      <ListCard icon={MessageSquareHeart} title="Conversation starters" items={v.conversationSuggestions} />
      <ListCard icon={ShieldAlert} title="Please keep an eye on" items={v.thingsToObserve} tone="amber" />

      {v.emergencyContacts.length > 0 && (
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} /> Emergency contacts
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {v.emergencyContacts.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-ink">{c.name}</p>
                  {c.relation && <p className="truncate text-caption text-muted">{c.relation}</p>}
                </div>
                {c.phone && (
                  <Button asChild variant="secondary" size="sm">
                    <a href={`tel:${c.phone.replace(/\s/g, '')}`}><Phone className="h-4 w-4" strokeWidth={1.75} /> Call</a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Primary action — into the real in-visit journey */}
      {!completed && (
        <Button asChild size="lg" className="w-full">
          <Link href={`/guardian/visits/${v.id}/visit`}>
            {inProgress ? <><PlayCircle className="h-5 w-5" strokeWidth={1.75} /> Continue visit</> : <>Begin visit <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
          </Link>
        </Button>
      )}
    </div>
  )
}
