import Link from 'next/link'
import { CalendarClock, ArrowRight } from 'lucide-react'
import { Greeting } from '@/components/family/greeting'
import { StatusCard } from '@/components/family/status-card'
import { QuickActions } from '@/components/family/quick-actions'
import { LatestUpdate } from '@/components/family/latest-update'
import { OverviewStory } from '@/components/family/overview-story'
import { FamilyRequestCard } from '@/components/family/family-request-card'
import { PresenceManagerCard } from '@/components/family/presence-manager-card'
import { TrustScore } from '@/components/family/trust-score'
import { SectionTitle } from '@/components/family/section-title'
import { Avatar } from '@/components/family/avatar'
import { todayStatus, MEMBERS } from '@/lib/family-data'

export default function FamilyHome() {
  const status = todayStatus()
  const nextVisit = status.nextVisit
  const nextMember = MEMBERS.find((m) => m.id === nextVisit?.memberId)

  return (
    <div className="flex flex-col gap-8">
      <Greeting />
      <StatusCard status={status} />

      <section className="flex flex-col gap-4">
        <SectionTitle>What would you like to do?</SectionTitle>
        <QuickActions />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {status.lastVisit && <OverviewStory memberName={status.lastVisit.memberName} />}

          <SectionTitle href="/family/visits" cta="All visits →">Latest update</SectionTitle>
          {status.lastVisit && <LatestUpdate visit={status.lastVisit} />}

          {nextVisit && (
            <div className="flex items-center gap-4 rounded-lg border border-line bg-card p-5 shadow-sm">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
                <CalendarClock className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-caption font-semibold uppercase tracking-widest text-green">Next visit</p>
                <p className="text-body font-semibold text-ink">
                  {nextMember?.name} · {nextVisit.dateLabel}
                </p>
                <p className="text-caption text-muted">{nextVisit.timeLabel} · {nextVisit.guardianName}</p>
              </div>
              <Avatar initials={nextMember?.initials ?? '··'} size="md" />
            </div>
          )}

          <FamilyRequestCard memberName={nextMember?.name ?? status.member.name} />
        </div>

        <aside className="flex flex-col gap-6">
          <PresenceManagerCard />
          <TrustScore />
          <Link
            href="/book"
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink p-5 text-white shadow-sm transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          >
            <span>
              <span className="block text-body font-semibold">Need another visit?</span>
              <span className="block text-caption text-white/60">Book in under two minutes</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0" strokeWidth={1.5} />
          </Link>
        </aside>
      </div>
    </div>
  )
}
