'use client'

import * as React from 'react'
import Link from 'next/link'
import { TriangleAlert, ArrowRight, MessageCircle, CalendarClock, CheckCircle2, Loader2, Lock, Users } from 'lucide-react'
import { ConsoleGreeting } from '@/components/console/console-greeting'
import { VisitStatusBadge } from '@/components/console/visit-status-badge'
import { Avatar } from '@/components/family/avatar'
import { EmptyState } from '@/components/ui/states'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleOverview, type ConsoleOverview, type CaseStatus } from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'
import { cn } from '@/lib/utils'

const FAM_STATUS: Record<CaseStatus, { label: string; chip: string; dot: string }> = {
  green: { label: 'Doing well', chip: 'bg-success/12 text-success', dot: 'bg-success' },
  yellow: { label: 'Needs attention', chip: 'bg-warning/15 text-warning', dot: 'bg-warning' },
}

export default function ConsoleDashboard() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [data, setData] = React.useState<ConsoleOverview | null>(null)

  React.useEffect(() => {
    if (!isStaff) return
    fetchConsoleOverview()
      .then(setData)
      .catch(() => setData({ families: [], triage: [], schedule: [] }))
  }, [isStaff])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <ConsoleGreeting />
        <EmptyState icon={Lock} title="Restricted" hint="The Presence Console is only available to Close Eye team members." />
      </div>
    )
  }
  if (data === null) {
    return (
      <div className="flex flex-col gap-8">
        <ConsoleGreeting />
        <div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      </div>
    )
  }

  const { families, triage, schedule } = data
  const doingWell = families.filter((f) => f.status === 'green').length
  const needYou = families.filter((f) => f.status === 'yellow').length
  const completeToday = schedule.filter((s) => s.status === 'completed').length
  const awaiting = families.filter((f) => f.awaitingReply).length
  const roster = [...families].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'yellow' ? -1 : 1))

  const strip: { label: string; dot: string }[] = [
    { label: `${doingWell} doing well`, dot: 'bg-success' },
    { label: `${needYou} need you`, dot: 'bg-warning' },
    { label: `${schedule.length} Presence today`, dot: 'bg-green' },
    { label: `${completeToday} complete`, dot: 'bg-green' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <section>
        <ConsoleGreeting />
        <div className="mt-5 flex flex-wrap gap-2.5">
          {strip.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-caption font-bold text-ink shadow-sm">
              <span className={cn('h-2 w-2 rounded-full', s.dot)} /> {s.label}
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs you now */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="flex items-center gap-2 text-h4"><span className="text-warning">●</span> Needs you now</h2>
            <span className="text-caption font-semibold text-muted">{triage.length} {triage.length === 1 ? 'item' : 'items'}</span>
          </div>

          {triage.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-card py-14 text-center shadow-sm">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-success/12 text-success"><CheckCircle2 className="h-6 w-6" strokeWidth={1.75} /></span>
              <p className="text-body font-semibold text-ink">Everyone is doing well</p>
              <p className="text-body-sm text-muted">No families need your attention right now.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
              {triage.map((t, i) => {
                const Icon = t.kind === 'message' ? MessageCircle : TriangleAlert
                return (
                  <Link key={t.id} href={t.href} className={cn('flex gap-3.5 border-l-4 border-l-warning p-4 transition-colors hover:bg-accent-soft/20', i > 0 && 'border-t border-t-line')}>
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-warning/12 text-warning"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body-sm font-bold text-ink">{t.memberName}</p>
                        <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-warning">{t.tag}</span>
                      </div>
                      <p className="mt-1 text-body-sm text-ink">{t.text}</p>
                      <span className="mt-2 inline-flex items-center gap-1.5 text-caption font-bold text-green">Open in Connect <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Rail — Today's Presence + a real summary */}
        <div className="flex flex-col gap-6">
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-h4">Today&apos;s Presence</h2>
              <Link href="/console/visits" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">Live monitor <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
              {schedule.length === 0 ? (
                <p className="px-4 py-8 text-center text-body-sm text-muted">No Presence visits scheduled today.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {schedule.map((s) => (
                    <li key={s.id}>
                      <Link href={s.lovedOneId ? `/console/messages/${s.lovedOneId}` : '/console/visits'} className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-accent-soft/30">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-body-sm font-semibold text-ink">{s.memberName}</span>
                          <VisitStatusBadge status={s.status} />
                        </div>
                        <span className="text-caption text-muted">{s.timeLabel}{s.guardianName ? ` · ${s.guardianName}` : ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-h4">Your care</h2>
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
              {[
                { icon: Users, label: 'Families in your care', value: String(families.length) },
                { icon: MessageCircle, label: 'Awaiting your reply', value: String(awaiting) },
                { icon: CalendarClock, label: 'Presence today', value: String(schedule.length) },
              ].map((k) => {
                const Icon = k.icon
                return (
                  <div key={k.label} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} />
                    <span className="flex-1 text-caption text-muted">{k.label}</span>
                    <span className="text-body-sm font-bold text-ink">{k.value}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {/* In your care */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-h4">In your care</h2>
          <Link href="/console/families" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">All {families.length} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
        </div>
        {roster.length === 0 ? (
          <EmptyState icon={Users} title="No families yet" hint="Families assigned to you will appear here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {roster.slice(0, 8).map((f) => {
              const st = FAM_STATUS[f.status]
              return (
                <Link key={f.lovedOneId} href={`/console/messages/${f.lovedOneId}`} className="group flex flex-col gap-3 rounded-lg border border-line bg-card p-4 shadow-sm transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initialsOf(f.name)} size="md" tone="solid" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-bold text-ink group-hover:text-green">{f.name}</p>
                      <p className="truncate text-caption text-muted">{[f.relationship, f.city].filter(Boolean).join(' · ') || 'In your care'}</p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-caption font-bold', st.chip)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} /> {st.label}
                  </span>
                  <p className="border-t border-line pt-2.5 text-caption text-muted">{f.reason}</p>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
