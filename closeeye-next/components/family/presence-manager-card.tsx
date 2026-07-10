import Link from 'next/link'
import { MessageCircle, Phone, CalendarClock, Clock, ArrowRight, ShieldAlert } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { StatusBadge } from '@/components/family/badges'
import { Button } from '@/components/ui/button'
import { whatsappLink } from '@/lib/site'
import { PRESENCE_MANAGER, todayStatus, MEMBERS } from '@/lib/family-data'

/**
 * The Presence Manager is the product's biggest trust signal — one real, named
 * human caring for the family. This is deliberately one of the strongest cards
 * in Family Space.
 */
export function PresenceManagerCard() {
  const next = todayStatus().nextVisit
  const nextMember = MEMBERS.find((m) => m.id === next?.memberId)

  return (
    <section className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md" aria-label="Your Presence Manager">
      {/* Identity */}
      <div className="flex items-start gap-4 border-b border-line p-6">
        <span className="relative shrink-0">
          <Avatar initials={PRESENCE_MANAGER.initials} size="lg" />
          {PRESENCE_MANAGER.online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-card bg-success" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold uppercase tracking-widest text-green">Your dedicated human contact</p>
          <p className="text-h4 text-ink">{PRESENCE_MANAGER.name}</p>
          <p className="text-caption text-muted">{PRESENCE_MANAGER.role}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {PRESENCE_MANAGER.online && <StatusBadge label="Available now" tone="positive" />}
            <span className="inline-flex items-center gap-1 text-caption text-muted">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.5} /> Replies in {PRESENCE_MANAGER.avgResponse.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="p-6">
        <p className="text-body-sm text-muted">{PRESENCE_MANAGER.intro}</p>

        {/* Next visit she's coordinating */}
        {next && (
          <div className="mt-5 flex items-center gap-3 rounded-md border border-line bg-ivory p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
              <CalendarClock className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p className="text-caption text-muted">Next visit she&apos;s coordinating</p>
              <p className="truncate text-body-sm font-semibold text-ink">
                {nextMember?.name} · {next.dateLabel} · {next.timeLabel.split(' · ')[0]}
              </p>
            </div>
          </div>
        )}

        {/* Shortcuts */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Button asChild size="sm" className="w-full">
            <a href={whatsappLink(`Hi ${PRESENCE_MANAGER.name.split(' ')[0]} — a quick note about the family.`)}>
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> WhatsApp
            </a>
          </Button>
          <Button asChild size="sm" variant="secondary" className="w-full">
            <a href={`tel:${PRESENCE_MANAGER.phone.replace(/\s/g, '')}`}>
              <Phone className="h-4 w-4" strokeWidth={1.5} /> Call
            </a>
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Link
            href="/family/connect"
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-green transition-colors hover:text-green-hover"
          >
            Open messages <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <a
            href={whatsappLink(`Hi ${PRESENCE_MANAGER.name.split(' ')[0]} — I'd like to raise something urgent about the family. Could we speak?`)}
            className="inline-flex items-center gap-1.5 text-caption font-semibold text-error transition-colors hover:underline"
          >
            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} /> Escalate a concern
          </a>
        </div>
      </div>
    </section>
  )
}
