'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Camera,
  ClipboardList,
  FileText,
  Heart,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Greeting } from '@/components/family/greeting'
import { AskCloseEyeCard } from '@/components/family/ask-closeeye-card'
import { SectionTitle } from '@/components/family/section-title'
import { LovedOneCard, initialsOf } from '@/components/family/loved-one-card'
import { Avatar } from '@/components/family/avatar'
import { StatusBadge, type StatusTone } from '@/components/family/badges'
import { PresenceCheckIn } from '@/components/family/presence-check-in'
import { Button } from '@/components/ui/button'
import { SITE, whatsappLink } from '@/lib/site'
import { getLocalPhoto } from '@/lib/local-photos'
import type { DashboardData } from '@/lib/db/dashboard'
import type { LovedOne } from '@/lib/db/types'
import { cn } from '@/lib/utils'

// ── Shared primitives (existing design language only) ────────────────────────

function IconChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </span>
  )
}

/** Horizontal action card — the pattern already used on the dashboard. */
export function ActionCard({ href, icon: Icon, title, desc }: { href: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-line/70 bg-card p-5 shadow-sm transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md"
    >
      <IconChip icon={Icon} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-body font-semibold text-ink">{title}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
        </span>
        <span className="mt-0.5 block text-caption text-muted">{desc}</span>
      </span>
    </Link>
  )
}

const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: 'Pending confirmation',
  requested: 'Requested',
  needs_details: 'Needs details',
  confirmed: 'Confirmed',
  scheduled: 'Scheduled',
  companion_confirmed: 'Guardian confirmed',
  paid: 'Confirmed & paid',
  cancelled: 'Cancelled',
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

function visitDate(iso: string | null): string {
  if (!iso) return 'To be confirmed'
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
function visitTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** A warm 4:3 image of the loved one when we have a photo; a soft placeholder otherwise. */
function PhotoFrame({ lovedOneId, name }: { lovedOneId: string; name: string }) {
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => { setPhoto(getLocalPhoto(lovedOneId)) }, [lovedOneId])

  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={name} referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />
  }
  return (
    <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-accent-soft to-ivory text-green">
      <Camera className="h-9 w-9" strokeWidth={1.25} />
    </div>
  )
}

// ── STATE 1 — New user ───────────────────────────────────────────────────────

export function NewUserDashboard() {
  const steps = [
    { n: 1, t: 'You add someone', d: "Tell us who you're caring for." },
    { n: 2, t: `${SITE.name} shows up`, d: 'A verified Guardian visits, in person.' },
    { n: 3, t: 'You feel close again', d: 'Photos, a warm story, and Connect.' },
  ]
  const trust = [
    { icon: ShieldCheck, t: 'Verified Guardians', d: 'Trained, background-checked people who show up in person.' },
    { icon: Users, t: 'A dedicated Presence Manager', d: 'One human who knows your family.' },
    { icon: FileText, t: 'Presence Stories', d: 'A warm story and photos after every visit.' },
    { icon: MessageCircle, t: 'Always in the loop', d: 'Updates straight to you, wherever you are.' },
  ]

  return (
    <>
      <Greeting subtitle="Your trusted presence in India." />

      {/* The promise + the one primary action */}
      <section className="flex flex-col gap-5 rounded-lg border border-line/70 bg-card p-6 shadow-sm">
        <p className="text-h3 leading-tight text-ink">When you can&rsquo;t be there, {SITE.name} can.</p>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Heart className="h-5 w-5" strokeWidth={1.5} /></span>
          <div>
            <p className="text-body font-semibold text-ink">Who&rsquo;s on your mind today?</p>
            <p className="mt-0.5 text-body-sm text-muted">A parent, a grandparent — someone you love.</p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto sm:self-start">
          <Link href="/family/add"><UserPlus className="h-5 w-5" strokeWidth={2} /> Add someone you love</Link>
        </Button>
      </section>

      {/* How Close Eye works */}
      <section className="flex flex-col gap-4">
        <SectionTitle>How {SITE.name} works</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-lg border border-line/70 bg-card p-5 shadow-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-body-sm font-semibold text-ivory">{s.n}</span>
              <p className="mt-3 text-body-sm font-semibold text-ink">{s.t}</p>
              <p className="mt-1 text-caption text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why families trust Close Eye */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Why families trust {SITE.name}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {trust.map((f) => (
            <div key={f.t} className="flex items-start gap-3 rounded-lg border border-line/70 bg-card p-5 shadow-sm">
              <IconChip icon={f.icon} />
              <div>
                <p className="text-body font-semibold text-ink">{f.t}</p>
                <p className="mt-0.5 text-caption text-muted">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SupportCard />
    </>
  )
}

// ── STATE 2 — Family added (convert to first Presence) ───────────────────────

export function FamilyAddedDashboard({ data, lovedOnes }: { data: DashboardData; lovedOnes: LovedOne[] }) {
  const primary = lovedOnes[0]
  const first = primary ? firstNameOf(primary.full_name) : 'your loved one'
  const incomplete = data.healthIncompleteMember

  return (
    <>
      <Greeting subtitle={`${first} now has a trusted presence. Let's plan their first Presence Visit together.`} />

      {/* Guardian introduction — a person, chosen like family */}
      <section className="flex items-start gap-4 rounded-lg border border-line/70 bg-card p-6 shadow-sm">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><ShieldCheck className="h-5 w-5" strokeWidth={1.5} /></span>
        <div className="min-w-0">
          <p className="text-body font-semibold text-ink">A verified Guardian, chosen like family</p>
          <p className="mt-1 text-body-sm text-muted">A trained, background-checked person who visits {first} in person — and you&rsquo;ll meet them before the first visit.</p>
        </div>
      </section>

      {/* Book the first Presence — lead with the feeling, not the price */}
      <section className="flex flex-col gap-4 rounded-lg border border-line/70 bg-card p-6 shadow-sm">
        <div>
          <p className="text-h4 text-ink">Book {first}&rsquo;s first Presence</p>
          <p className="mt-1 text-body-sm text-muted">You&rsquo;ll see them, hear about their day, and know they&rsquo;re okay.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={primary ? `/family/book?member=${primary.id}` : '/family/book'}><CalendarPlus className="h-5 w-5" strokeWidth={2} /> Book first Presence</Link>
          </Button>
          {!data.membershipActive && (
            <Link href="/family/membership" className="text-body-sm font-semibold text-green transition-colors hover:text-green-hover">
              View membership options →
            </Link>
          )}
        </div>
      </section>

      {/* Ask Close Eye — free value */}
      <AskCloseEyeCard variant="compact" />

      {/* Help us know them better */}
      {incomplete && (
        <section className="flex flex-col items-start gap-4 rounded-lg border border-line/70 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <IconChip icon={ClipboardList} />
            <div>
              <p className="text-body font-semibold text-ink">Help us know {firstNameOf(incomplete.full_name)} better</p>
              <p className="mt-0.5 text-body-sm text-muted">The little things make their Presence personal.</p>
            </div>
          </div>
          <Button asChild variant="secondary" size="md" className="shrink-0">
            <Link href={`/family/members/${incomplete.id}`}>Complete profile</Link>
          </Button>
        </section>
      )}
    </>
  )
}

// ── STATE (transitional) — Visit booked, not yet completed ───────────────────

const GUARDIAN_ASSIGNED = ['companion_confirmed', 'paid']

export function VisitBookedDashboard({ data, lovedOnes }: { data: DashboardData; lovedOnes: LovedOne[] }) {
  const v = data.upcomingVisit
  return (
    <>
      <Greeting subtitle={`Everything is arranged. ${SITE.tagline}`} />

      {v && (
        <section className="flex flex-col gap-4">
          <SectionTitle>Your first Presence</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
            <div className="flex items-center gap-3 bg-ink px-6 py-5 text-white">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-accent"><CalendarClock className="h-5 w-5" strokeWidth={1.5} /></span>
              <div className="min-w-0">
                <p className="text-caption text-white/60">Upcoming Presence</p>
                <p className="truncate text-body font-semibold text-white">{v.service_name || 'Presence visit'}{v.recipient_name ? ` · for ${v.recipient_name}` : ''}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-6 py-5 sm:grid-cols-4">
              {[
                { label: 'Guardian', value: GUARDIAN_ASSIGNED.includes(v.status) ? 'Confirmed' : 'Being matched' },
                { label: 'Date', value: visitDate(v.scheduled_at) },
                { label: 'Time', value: visitTime(v.scheduled_at) },
                { label: 'Status', value: STATUS_LABEL[v.status] ?? v.status },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-caption text-muted">{s.label}</dt>
                  <dd className="mt-1 text-body-sm font-semibold text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <AskCloseEyeCard variant="compact" />

      <section className="flex flex-col gap-4">
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard href="/family/visits" icon={CalendarCheck} title="View Presence" desc="See the full details of this visit." />
          <ActionCard href="/family/visits" icon={CalendarClock} title="Reschedule" desc="Change the date or time." />
          <ActionCard href="/family/connect" icon={MessageCircle} title="Message your Presence Manager" desc="Ask a question about this visit." />
        </div>
      </section>

      <FamilySection lovedOnes={lovedOnes} />
    </>
  )
}

function FamilySection({ lovedOnes }: { lovedOnes: LovedOne[] }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle href="/family/members" cta="Manage →">Your family</SectionTitle>
      <div className="grid gap-5 md:grid-cols-2">
        {lovedOnes.map((lo) => <LovedOneCard key={lo.id} lo={lo} />)}
      </div>
    </section>
  )
}

// ── STATE 3 — Active customer (daily reassurance) ────────────────────────────

export function ActiveDashboard({ data, lovedOnes }: { data: DashboardData; lovedOnes: LovedOne[] }) {
  const primary = lovedOnes[0]
  const first = primary ? firstNameOf(primary.full_name) : 'your family'
  const lastCompleted = [...data.completedVisits].sort((a, b) => (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? ''))[0]
  const next = data.upcomingVisit
  const reassure = lastCompleted
    ? `Last Presence ${visitDate(lastCompleted.scheduled_at)} · all has been calm since.`
    : `Your ${SITE.name} team is watching over ${first}.`

  return (
    <>
      <Greeting subtitle={SITE.tagline} />

      {/* 1 · The check-in signature → reassurance */}
      <PresenceCheckIn name={first} detail={reassure} storyHref="/family/visits" />

      {/* 2 · Presence Story — photo first */}
      <section className="flex flex-col gap-4">
        <SectionTitle href="/family/visits" cta="All stories →">{first}&rsquo;s Presence Story</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
          {primary && <PhotoFrame lovedOneId={primary.id} name={primary.full_name} />}
          <div className="flex flex-col gap-4 p-6">
            <p className="text-body text-ink">Photos and a warm story from {first}&rsquo;s latest Presence.</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button asChild size="md"><Link href="/family/visits"><FileText className="h-4 w-4" strokeWidth={1.75} /> View Presence Story</Link></Button>
              <Link
                href={`/family/connect/ask?q=${encodeURIComponent(`How was ${first} during the last Presence?`)}`}
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-green transition-colors hover:text-green-hover"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Ask about this moment
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · CloseEye Connect */}
      <AskCloseEyeCard variant="compact" />

      {/* 4 · Next Presence */}
      {next && (
        <section className="flex flex-col gap-4">
          <SectionTitle href="/family/visits" cta="All visits →">Next Presence</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
            <div className="flex items-center gap-4 px-5 py-4">
              <IconChip icon={CalendarClock} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold text-ink">{next.service_name || 'Presence visit'}{next.recipient_name ? ` · ${next.recipient_name}` : ''}</p>
                <p className="text-caption text-muted">{visitDate(next.scheduled_at)} · {visitTime(next.scheduled_at)}</p>
              </div>
              <span className="shrink-0 text-caption font-semibold text-muted">{STATUS_LABEL[next.status] ?? next.status}</span>
            </div>
            <div className="border-t border-line px-5 py-3">
              <Link
                href={`/family/connect/ask?q=${encodeURIComponent(`What should I know about ${first}'s next Presence?`)}`}
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-green transition-colors hover:text-green-hover"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Ask about this visit
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 5 · Loved ones — human states, not clinical status */}
      <LovedOnesRoster lovedOnes={lovedOnes} hasRecentPresence={!!lastCompleted} />

      {/* 6 · Presence Manager */}
      <PresenceManagerContact />

      {/* 7 · Support */}
      <SupportCard />
    </>
  )
}

// A warm, human status. Absent a live alert (handled by the emergency system),
// CloseEye's default is reassurance — never clinical language.
function moodFor(index: number, hasRecentPresence: boolean): { label: string; tone: StatusTone } {
  if (index === 0) return { label: hasRecentPresence ? 'Doing well' : 'Calm', tone: 'positive' }
  return { label: 'Comfortable', tone: 'positive' }
}

function LovedOnesRoster({ lovedOnes, hasRecentPresence }: { lovedOnes: LovedOne[]; hasRecentPresence: boolean }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle href="/family/members" cta="Manage →">Your loved ones</SectionTitle>
      <ul className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
        {lovedOnes.map((lo, i) => (
          <li key={lo.id} className={cn(i > 0 && 'border-t border-line')}>
            <RosterRow lo={lo} mood={moodFor(i, hasRecentPresence)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function RosterRow({ lo, mood }: { lo: LovedOne; mood: { label: string; tone: StatusTone } }) {
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => { setPhoto(getLocalPhoto(lo.id)) }, [lo.id])
  const meta = [lo.relationship, lo.city].filter(Boolean).join(' · ')

  return (
    <Link href={`/family/connect/${lo.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent-soft/30">
      <Avatar initials={initialsOf(lo.full_name)} src={photo} alt={lo.full_name} size="md" tone="solid" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sm font-semibold text-ink">{lo.full_name}</p>
        <p className="truncate text-caption text-muted">{meta || 'In your care'}</p>
      </div>
      <StatusBadge label={mood.label} tone={mood.tone} />
    </Link>
  )
}

/**
 * Your Presence Manager — the human guarantee behind the promise. Real contact
 * channels only; a named Presence Manager surfaces here once the real-data
 * migration reaches Presence-Manager identity (no mock person on the hero screen).
 */
function PresenceManagerContact() {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Your Presence Manager</SectionTitle>
      <div className="flex flex-col items-start gap-4 rounded-lg border border-line/70 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar initials="CE" size="lg" tone="soft" />
          <div className="min-w-0">
            <p className="text-body font-semibold text-ink">Your {SITE.name} care team</p>
            <p className="mt-0.5 text-body-sm text-muted">Here for you, whenever you need us.</p>
          </div>
        </div>
        <Button asChild size="md" variant="secondary" className="shrink-0">
          <Link href="/family/connect"><MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Message</Link>
        </Button>
      </div>
    </section>
  )
}

// ── Support card ─────────────────────────────────────────────────────────────

function SupportCard() {
  const items = [
    { icon: Phone, label: 'Call', href: SITE.phoneHref },
    { icon: MessageCircle, label: 'WhatsApp', href: whatsappLink() },
    { icon: Mail, label: 'Email', href: `mailto:${SITE.email}` },
  ]
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line/70 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-body font-semibold text-ink">Need help?</p>
        <p className="mt-0.5 text-body-sm text-muted">We&apos;re here whenever you need us.</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:flex">
        {items.map((it) => (
          <a
            key={it.label}
            href={it.href}
            target={it.label === 'Call' ? undefined : '_blank'}
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-line px-4 py-3 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green sm:flex-row sm:gap-2"
          >
            <it.icon className="h-4 w-4" strokeWidth={1.75} /> {it.label}
          </a>
        ))}
      </div>
    </section>
  )
}
