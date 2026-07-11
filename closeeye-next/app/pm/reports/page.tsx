'use client'

import * as React from 'react'
import { Loader2, Lock, Users, CheckCircle2, TriangleAlert, MessageCircle, CalendarClock, CalendarCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleReports, type ConsoleReports } from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'
import { cn } from '@/lib/utils'

function Stat({ icon: Icon, label, value, tone = 'green' }: { icon: LucideIcon; label: string; value: number; tone?: 'green' | 'warning' | 'error' }) {
  const color = tone === 'warning' ? 'text-warning' : tone === 'error' ? 'text-error' : 'text-green'
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <Icon className={cn('h-5 w-5', color)} strokeWidth={1.75} />
      <p className="mt-3 text-h2 leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-caption font-medium text-muted">{label}</p>
    </div>
  )
}

export default function ReportsPage() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [r, setR] = React.useState<ConsoleReports | null>(null)

  React.useEffect(() => {
    if (!isStaff) return
    fetchConsoleReports()
      .then(setR)
      .catch(() => setR(null))
  }, [isStaff])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Reports</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This is only available to Close Eye team members." />
      </div>
    )
  }
  if (r === null) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-h2">Reports</h1>
        <div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      </div>
    )
  }

  const yellow = Math.max(0, r.needAttention - r.urgent)
  const total = r.families || 1
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Reports</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">The health of your care, in plain numbers — straight from live data.</p>
      </div>

      <section>
        <h2 className="mb-3 text-h4">Right now</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat icon={Users} label="Families in your care" value={r.families} />
          <Stat icon={CheckCircle2} label="Doing well" value={r.doingWell} />
          <Stat icon={TriangleAlert} label="Need attention" value={r.needAttention} tone={r.needAttention > 0 ? 'warning' : 'green'} />
          <Stat icon={MessageCircle} label="Awaiting your reply" value={r.awaitingReplies} tone={r.awaitingReplies > 0 ? 'warning' : 'green'} />
          <Stat icon={CalendarClock} label="Presence today" value={r.presenceToday} />
          <Stat icon={CalendarCheck} label="Completed this week" value={r.completedThisWeek} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <h2 className="text-h4">Family health</h2>
          <p className="mt-1 text-caption text-muted">Relationship &amp; service health across {r.families} families</p>
          <div className="mt-4 flex flex-col gap-3 text-body-sm">
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-ink"><span className="h-2.5 w-2.5 rounded-full bg-success" /> On track</span><span className="font-bold text-ink">{r.doingWell} · {pct(r.doingWell)}</span></div>
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-ink"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Keep an eye</span><span className="font-bold text-ink">{yellow} · {pct(yellow)}</span></div>
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-ink"><span className="h-2.5 w-2.5 rounded-full bg-error" /> Urgent</span><span className="font-bold text-ink">{r.urgent} · {pct(r.urgent)}</span></div>
          </div>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-accent-soft">
            <span className="bg-success" style={{ width: pct(r.doingWell) }} />
            <span className="bg-warning" style={{ width: pct(yellow) }} />
            <span className="bg-error" style={{ width: pct(r.urgent) }} />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <h2 className="text-h4">This week</h2>
          <div className="mt-4 flex flex-col gap-3 text-body-sm">
            <div className="flex items-center justify-between border-b border-line pb-3"><span className="text-muted">Presence scheduled</span><span className="font-bold text-ink">{r.visitsThisWeek}</span></div>
            <div className="flex items-center justify-between border-b border-line pb-3"><span className="text-muted">Completed</span><span className="font-bold text-ink">{r.completedThisWeek}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Families awaiting a reply</span><span className="font-bold text-ink">{r.awaitingReplies}</span></div>
          </div>
        </div>
      </section>
    </div>
  )
}
