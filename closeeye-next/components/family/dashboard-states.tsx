'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Greeting } from '@/components/family/greeting'
import { SectionTitle } from '@/components/family/section-title'
import { LovedOneCard } from '@/components/family/loved-one-card'
import { MembershipCard } from '@/components/family/membership-card'
import { Button } from '@/components/ui/button'
import { SITE, whatsappLink } from '@/lib/site'
import type { DashboardData } from '@/lib/db/dashboard'
import type { LovedOne, Subscription } from '@/lib/db/types'
import { planById } from '@/lib/plans'
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
      className="group flex items-start gap-3 rounded-lg border border-line bg-card p-5 shadow-sm transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md"
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

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      {ok ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" strokeWidth={1.75} />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" strokeWidth={1.75} />
      )}
      <span className={cn('text-body-sm', ok ? 'text-ink' : 'font-medium text-ink')}>{label}</span>
    </div>
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
const GUARDIAN_ASSIGNED = ['companion_confirmed', 'paid']

function visitDate(iso: string | null): string {
  if (!iso) return 'To be confirmed'
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
function visitTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ── STATE 1 — New user ───────────────────────────────────────────────────────

export function NewUserDashboard() {
  return (
    <>
      <Greeting
        showName={false}
        subtitle={`Welcome to ${SITE.name}. ${SITE.tagline} We're here to help you care for the people who matter most.`}
      />

      {/* Primary card — the ONLY primary action */}
      <section className="flex flex-col items-start gap-5 rounded-lg border border-line bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><UserPlus className="h-5 w-5" strokeWidth={1.5} /></span>
          <div>
            <p className="text-body font-semibold text-ink">Add your first family member</p>
            <p className="mt-0.5 text-body-sm text-muted">Create a profile for someone you&apos;d like us to care for.</p>
          </div>
        </div>
        <Button asChild size="md" className="shrink-0">
          <Link href="/family/add"><UserPlus className="h-5 w-5" strokeWidth={2} /> Add family member</Link>
        </Button>
      </section>

      {/* How CloseEye works */}
      <section className="flex flex-col gap-4">
        <SectionTitle>How {SITE.name} works</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, t: 'Add your loved one' },
            { n: 2, t: 'Choose a membership' },
            { n: 3, t: 'Book your first visit and receive updates' },
          ].map((s) => (
            <div key={s.n} className="rounded-lg border border-line bg-card p-5 shadow-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-body-sm font-semibold text-ivory">{s.n}</span>
              <p className="mt-3 text-body-sm font-medium text-ink">{s.t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why families trust CloseEye */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Why families trust {SITE.name}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: ShieldCheck, t: 'Verified Guardians', d: 'Trained, background-checked people who show up in person.' },
            { icon: Users, t: 'Dedicated Presence Managers', d: 'One point of contact who knows your family.' },
            { icon: FileText, t: 'Visit reports', d: 'A clear summary after every visit.' },
            { icon: MessageCircle, t: 'Family updates', d: 'Photos and notes, straight to you.' },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
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

// ── STATE 2 — Family added ───────────────────────────────────────────────────

export function FamilyAddedDashboard({ data, lovedOnes }: { data: DashboardData; lovedOnes: LovedOne[] }) {
  return (
    <>
      <Greeting subtitle={`Your loved one has been added successfully. You're just one step away from receiving trusted care. ${SITE.tagline}`} />

      {/* Today's family status */}
      <section className="flex flex-col gap-2">
        <SectionTitle>Today&apos;s family status</SectionTitle>
        <div className="divide-y divide-line rounded-lg border border-line bg-card px-6 py-1 shadow-sm">
          <StatusRow ok label="Family profile created" />
          <StatusRow ok={data.membershipActive} label={data.membershipActive ? 'Membership active' : 'Membership not active'} />
          <StatusRow ok={false} label="First visit not scheduled" />
          <StatusRow ok label="No emergencies" />
        </div>
      </section>

      {/* Next steps — context-aware */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Next steps</SectionTitle>
        <div className="flex flex-col gap-4">
          {!data.membershipActive && (
            <StepCard n={1} icon={BadgeCheck} title="Choose membership" cta="View Membership" href="/family/membership" />
          )}
          <StepCard n={data.membershipActive ? 1 : 2} icon={CalendarPlus} title="Book your first visit" cta="Book Visit" href="/family/book" />
          {data.healthIncompleteMember && (
            <StepCard
              n={data.membershipActive ? 2 : 3}
              icon={ClipboardList}
              title="Complete health profile"
              cta="Complete Profile"
              href={`/family/members/${data.healthIncompleteMember.id}`}
            />
          )}
        </div>
      </section>

      <FamilySection lovedOnes={lovedOnes} />
    </>
  )
}

function StepCard({ n, icon: Icon, title, cta, href }: { n: number; icon: LucideIcon; title: string; cta: string; href: string }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-body-sm font-semibold text-ivory">{n}</span>
        <div className="flex items-center gap-2.5">
          <Icon className="h-5 w-5 text-green" strokeWidth={1.75} />
          <p className="text-body font-semibold text-ink">{title}</p>
        </div>
      </div>
      <Button asChild size="md" className="shrink-0"><Link href={href}>{cta}</Link></Button>
    </div>
  )
}

// ── STATE 3 — Visit booked ───────────────────────────────────────────────────

export function VisitBookedDashboard({ data, lovedOnes }: { data: DashboardData; lovedOnes: LovedOne[] }) {
  const v = data.upcomingVisit
  return (
    <>
      <Greeting subtitle={`Everything is progressing as planned. ${SITE.tagline}`} />

      {v && (
        <section className="flex flex-col gap-4">
          <SectionTitle>Today&apos;s summary</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            <div className="flex items-center gap-3 bg-ink px-6 py-5 text-white">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-accent"><CalendarClock className="h-5 w-5" strokeWidth={1.5} /></span>
              <div className="min-w-0">
                <p className="text-caption text-white/60">Upcoming visit</p>
                <p className="truncate text-body font-semibold text-white">{v.service_name || 'Wellbeing visit'}{v.recipient_name ? ` · for ${v.recipient_name}` : ''}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
              {[
                { label: 'Guardian', value: GUARDIAN_ASSIGNED.includes(v.status) ? 'Confirmed' : 'Being matched' },
                { label: 'Visit date', value: visitDate(v.scheduled_at) },
                { label: 'Visit time', value: visitTime(v.scheduled_at) },
                { label: 'Status', value: STATUS_LABEL[v.status] ?? v.status },
              ].map((s) => (
                <div key={s.label} className="bg-card px-5 py-4">
                  <dt className="text-caption text-muted">{s.label}</dt>
                  <dd className="mt-1 text-body-sm font-semibold text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <ActionCard href="/family/visits" icon={CalendarCheck} title="View visit" desc="See the full details of this visit." />
          <ActionCard href="/family/visits" icon={CalendarClock} title="Reschedule" desc="Change the date or time of this visit." />
          <ActionCard href="/family/messages" icon={MessageCircle} title="Message Presence Manager" desc="Ask a question about this visit." />
        </div>
      </section>

      <FamilySection lovedOnes={lovedOnes} />
    </>
  )
}

// ── STATE 4 — Active customer ────────────────────────────────────────────────

export function ActiveDashboard({ data, lovedOnes, subscription }: { data: DashboardData; lovedOnes: LovedOne[]; subscription: Subscription | null }) {
  const plan = planById(subscription?.plan_id)
  const lastCompleted = [...data.completedVisits].sort((a, b) => (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? ''))[0]
  // Lead with the real story: upcoming when there's one ahead, else the last
  // completed visit — never a bare "0 upcoming".
  const visitTile =
    data.upcomingVisits.length > 0
      ? { label: 'Upcoming visits', value: String(data.upcomingVisits.length) }
      : lastCompleted
        ? { label: 'Last visit', value: visitDate(lastCompleted.scheduled_at) }
        : { label: 'Upcoming visits', value: '0' }
  const tiles = [
    { label: 'Family members', value: String(data.familyCount) },
    visitTile,
    { label: 'Unread messages', value: String(data.unreadMessages) },
    { label: 'Membership', value: plan ? plan.name : 'Active' },
  ]
  const updates = data.completedVisits.slice(0, 3)

  return (
    <>
      <Greeting subtitle="Here's today's update from home." />

      {/* Today's summary */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Today&apos;s summary</SectionTitle>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border border-line bg-card px-5 py-4 shadow-sm">
              <dt className="text-caption text-muted">{t.label}</dt>
              <dd className="mt-1 truncate text-h4 text-ink">{t.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Quick actions */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard href="/family/book" icon={CalendarPlus} title="Book a visit" desc="Schedule another wellbeing visit." />
          <ActionCard href="/family/messages" icon={MessageCircle} title="Message Presence Manager" desc="Reach your dedicated coordinator." />
          <ActionCard href="/family/visits" icon={FileText} title="View reports" desc="Read summaries from past visits." />
          <ActionCard href="/family/add" icon={UserPlus} title="Add family member" desc="Care for more of your family." />
        </div>
      </section>

      <FamilySection lovedOnes={lovedOnes} />

      {/* Upcoming visits — max three */}
      {data.upcomingVisits.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle href="/family/visits" cta="All visits →">Upcoming visits</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            {data.upcomingVisits.slice(0, 3).map((v, i) => (
              <div key={v.id} className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-line')}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><CalendarClock className="h-5 w-5" strokeWidth={1.75} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{v.service_name || 'Wellbeing visit'}{v.recipient_name ? ` · ${v.recipient_name}` : ''}</p>
                  <p className="text-caption text-muted">{visitDate(v.scheduled_at)} · {visitTime(v.scheduled_at)}</p>
                </div>
                <span className="shrink-0 text-caption font-semibold text-muted">{STATUS_LABEL[v.status] ?? v.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent updates — real completed visits only (no fabricated items) */}
      {updates.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle>Recent updates</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            {updates.map((v, i) => (
              <div key={v.id} className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-line')}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success/12 text-success"><CalendarCheck className="h-5 w-5" strokeWidth={1.75} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">Visit completed{v.recipient_name ? ` for ${v.recipient_name}` : ''}</p>
                  <p className="text-caption text-muted">{visitDate(v.scheduled_at)}</p>
                </div>
                <Link href="/family/visits" className="shrink-0 text-caption font-semibold text-green hover:text-green-hover">View →</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Membership */}
      <MembershipCard />

      <SupportCard />
    </>
  )
}

// ── Support card (State 1 + State 4) ─────────────────────────────────────────

function SupportCard() {
  const items = [
    { icon: Phone, label: 'Call', href: SITE.phoneHref },
    { icon: MessageCircle, label: 'WhatsApp', href: whatsappLink() },
    { icon: Mail, label: 'Email', href: `mailto:${SITE.email}` },
  ]
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
