import Link from 'next/link'
import { Headset, MessageCircle, NotebookPen, Clock, Heart, Phone, Sparkles } from 'lucide-react'
import { GuardianGreeting } from '@/components/guardian/guardian-greeting'
import { VisitCard } from '@/components/guardian/visit-card'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { TODAY_VISITS, GUARDIAN_ALERTS, GUARDIAN_NOTIFICATIONS, GUARDIAN, PRESENCE_MANAGER } from '@/lib/guardian-data'

function isMorning(timeLabel: string) {
  return timeLabel.includes('AM')
}

export default function GuardianHome() {
  const total = TODAY_VISITS.length
  const done = TODAY_VISITS.filter((v) => v.status === 'completed').length
  const remaining = total - done
  const next = TODAY_VISITS.find((v) => v.status !== 'completed')
  const pct = Math.round((done / total) * 100)
  const unread = GUARDIAN_NOTIFICATIONS.filter((n) => n.unread).length
  const allDone = remaining === 0

  const morning = TODAY_VISITS.filter((v) => isMorning(v.timeLabel))
  const afternoon = TODAY_VISITS.filter((v) => !isMorning(v.timeLabel))

  return (
    <div className="flex flex-col gap-6">
      <GuardianGreeting subtitle="Thank you for caring today." />

      {/* Progress — motivational, or end-of-day thanks */}
      {allDone ? (
        <section className="rounded-lg border border-line bg-ink p-6 text-center text-white shadow-md">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/10 text-accent">
            <Heart className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <h2 className="mt-4 text-h3 text-white">That&apos;s your day, {GUARDIAN.firstName}.</h2>
          <p className="mt-2 text-body text-white/70">
            You showed up for {total} {total === 1 ? 'family' : 'families'} today. Somewhere, someone is sleeping easier because of you. Thank you.
          </p>
        </section>
      ) : (
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm" aria-label="Today's progress">
          <p className="text-h4 text-ink">
            {remaining} {remaining === 1 ? 'family is' : 'families are'} waiting for you today.
          </p>
          <p className="mt-1 text-body-sm leading-relaxed text-muted">You&apos;re making a real difference — one visit at a time.</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-soft">
              <div className="h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-caption font-semibold text-green">{done} of {total} done</span>
          </div>
          {next && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-caption text-muted">
              <Clock className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Next · {next.timeLabel} with {next.memberName}
            </p>
          )}
        </section>
      )}

      {/* Before you visit — calm, friendly (not a warning) */}
      {GUARDIAN_ALERTS.length > 0 && (
        <section className="rounded-lg border border-line bg-accent-soft/50 p-5" aria-label="Before you visit">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
            <NotebookPen className="h-4 w-4" strokeWidth={1.75} /> Before you visit
          </p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {GUARDIAN_ALERTS.map((a) => (
              <li key={a.id} className="flex gap-2 text-body-sm leading-relaxed text-ink">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={1.75} /> {a.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Your Presence Manager — relationship first, calls secondary */}
      <section className="rounded-lg border border-line bg-card p-5 shadow-sm" aria-label="Your Presence Manager">
        <div className="flex items-center gap-3.5">
          <span className="relative shrink-0">
            <Avatar initials={PRESENCE_MANAGER.initials} size="lg" />
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-success" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-widest text-green">Your Presence Manager</p>
            <p className="text-h4 text-ink">{PRESENCE_MANAGER.name}</p>
            <p className="inline-flex items-center gap-1.5 text-caption text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Available now
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button asChild variant="secondary" size="sm">
            <Link href="/guardian/messages"><MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Message</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={`tel:${PRESENCE_MANAGER.phone.replace(/\s/g, '')}`}><Phone className="h-4 w-4" strokeWidth={1.75} /> Call</a>
          </Button>
        </div>
      </section>

      {/* Family Messages */}
      <Link
        href="/guardian/messages"
        className="flex items-center gap-3.5 rounded-lg border border-line bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
      >
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
          <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
          {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-success px-1 text-[0.6rem] font-bold text-ivory">{unread}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm font-semibold text-ink">Family messages</span>
          <span className="block truncate text-caption text-muted">Rao family · Ananya would love a video call</span>
        </span>
        <Headset className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.5} />
      </Link>

      {/* Today's route — chronological, grouped */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 className="text-h4">Today&apos;s route</h2>
          <span className="text-caption text-muted">{total} visits</span>
        </div>

        {morning.length > 0 && <RouteGroup label="Morning" count={morning.length} visits={morning} />}
        {afternoon.length > 0 && <RouteGroup label="Afternoon" count={afternoon.length} visits={afternoon} />}
      </section>

      <Button asChild variant="secondary" className="w-full">
        <a href="/guardian/login">Not you? Switch Guardian</a>
      </Button>
    </div>
  )
}

function RouteGroup({ label, count, visits }: { label: string; count: number; visits: typeof TODAY_VISITS }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pt-1">
        <span className="text-caption font-semibold uppercase tracking-widest text-muted">{label}</span>
        <span className="h-px flex-1 bg-line" />
        <span className="text-caption text-muted">{count}</span>
      </div>
      {visits.map((v) => (
        <VisitCard key={v.id} visit={v} />
      ))}
    </div>
  )
}
