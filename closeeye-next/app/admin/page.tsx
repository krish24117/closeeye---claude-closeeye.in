'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, ArrowRight, TriangleAlert, Info, CheckCircle2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminOverview, type AdminOverview, type InsightRow } from '@/lib/db/admin'
import { fmtINR } from '@/lib/admin-data'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

function Tile({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'green' | 'warning' }) {
  const color = tone === 'green' ? 'text-green' : tone === 'warning' ? 'text-warning' : 'text-ink'
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <p className={cn('text-h3 leading-none', color)}>{value}</p>
      <p className="mt-2 text-caption font-medium text-muted">{label}</p>
    </div>
  )
}

function Bars({ rows }: { rows: InsightRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (rows.length === 0) return <p className="text-body-sm text-muted">No revenue recorded yet.</p>
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-body-sm">
            <span className="truncate font-medium text-ink">{r.label}</span>
            <span className="shrink-0 font-semibold text-ink">{fmtINR(r.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-soft">
            <div className="h-full rounded-full bg-green" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<AdminOverview | null>(null)
  const [part, setPart] = React.useState('Hello')

  React.useEffect(() => {
    const h = new Date().getHours()
    setPart(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
  }, [])
  React.useEffect(() => {
    if (!isAdmin) return
    fetchAdminOverview()
      .then(setD)
      .catch(() => setD(null))
  }, [isAdmin])

  const first = profile?.full_name?.trim().split(/\s+/)[0] ?? 'there'

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Operations</h1>
        <EmptyState icon={Lock} title="Restricted" hint="The founder console is only available to administrators." />
      </div>
    )
  }
  if (d === null) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-h2">{part}, {first}.</h1>
        <div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      </div>
    )
  }

  const finance: { label: string; value: string; tone?: 'ink' | 'green' | 'warning' }[] = [
    { label: 'Revenue this month', value: fmtINR(d.revenueMonth), tone: 'green' },
    { label: 'Total revenue', value: fmtINR(d.revenueTotal) },
    { label: 'MRR', value: fmtINR(d.mrr), tone: 'green' },
    { label: 'Outstanding', value: fmtINR(d.outstanding), tone: d.outstanding > 0 ? 'warning' : 'ink' },
  ]
  const operational: { label: string; value: string; tone?: 'ink' | 'green' | 'warning' }[] = [
    { label: 'Active families', value: String(d.families) },
    { label: 'Founding members', value: String(d.foundingMembers), tone: d.foundingMembers > 0 ? 'green' : 'ink' },
    { label: 'Care Team', value: String(d.careTeam) },
    { label: 'Bookings this month', value: String(d.bookingsMonth) },
    { label: 'Completed', value: String(d.completedMonth) },
    { label: 'Cancelled', value: String(d.cancelledMonth) },
    { label: 'Presence today', value: String(d.presenceToday) },
  ]
  const growth: { label: string; value: string; tone?: 'ink' | 'green' | 'warning' }[] = [
    { label: 'New families this month', value: String(d.newFamiliesMonth), tone: 'green' },
    { label: 'Active subscriptions', value: String(d.activeSubs) },
    { label: 'Active memberships', value: String(d.activeMemberships) },
    { label: 'Applications to review', value: String(d.pendingApplications), tone: d.pendingApplications > 0 ? 'warning' : 'ink' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">{part}, {first}.</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          <span className="font-semibold text-success">{fmtINR(d.revenueMonth)}</span> this month · <span className="font-semibold text-ink">{d.families} active families</span>
          {d.alerts.length > 0 ? <> · <span className="font-semibold text-warning">{d.alerts.length} thing{d.alerts.length > 1 ? 's' : ''} need your attention</span></> : ' · all clear today'}.
        </p>
      </div>

      <section>
        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Financial</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{finance.map((k) => <Tile key={k.label} {...k} />)}</div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Operational</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{operational.map((k) => <Tile key={k.label} {...k} />)}</div>
        </section>
        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Growth</p>
          <div className="grid grid-cols-2 gap-3">{growth.map((k) => <Tile key={k.label} {...k} />)}</div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-h4">Attention center</h2>
        {d.alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success/12 text-success"><CheckCircle2 className="h-5 w-5" strokeWidth={1.75} /></span>
            <p className="text-body-sm text-ink">Nothing needs your attention right now. The business is running smoothly.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d.alerts.map((a) => {
              const warn = a.tone === 'warning'
              const Icon = warn ? TriangleAlert : Info
              return (
                <Link key={a.id} href={a.href} className={cn('flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors', warn ? 'border-warning/30 hover:bg-warning/[0.04]' : 'border-line hover:bg-accent-soft/30')}>
                  <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', warn ? 'bg-warning/12 text-warning' : 'bg-accent-soft text-green')}><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-bold text-ink">{a.title}</p>
                    <p className="mt-0.5 text-caption text-muted">{a.detail}</p>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-caption font-bold text-green">Review <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-h4">Business insights</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-h4">Revenue by city</h3>
              <Link href="/admin/finance" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">Finance <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
            </div>
            <Bars rows={d.revenueByCity} />
          </div>
          <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-h4">Revenue by service</h3>
            <Bars rows={d.revenueByService} />
          </div>
        </div>
      </section>
    </div>
  )
}
