import Link from 'next/link'
import { Lightbulb, ArrowRight, ArrowUpRight } from 'lucide-react'
import { KpiTile } from '@/components/admin/kpi-tile'
import { InsightBars } from '@/components/admin/insight-bars'
import { TrendArea } from '@/components/admin/charts'
import {
  KPI_OPERATIONS, GUARDIANS, ZONES, CANCEL_REASONS, CANCEL_TREND, CANCEL_TODAY, CANCEL_WEEK, CANCEL_MONTH, CANCEL_ACTIONS,
} from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const ZONE_TONE = { healthy: 'bg-success/12 text-success', tight: 'bg-warning/12 text-warning', gap: 'bg-error/10 text-error' } as const

export default function OperationsPage() {
  const available = GUARDIANS.filter((g) => g.status === 'available').length
  const onVisit = GUARDIANS.filter((g) => g.status === 'on-visit').length

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Operations</h1>
          <p className="mt-1.5 text-body leading-relaxed text-muted">The business view of today&apos;s operations, coverage and cancellations.</p>
        </div>
        <Link href="/console" className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
          <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.75} /> Live monitor (Presence Console)
        </Link>
      </div>

      {/* Today's operations */}
      <section>
        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Today</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {KPI_OPERATIONS.map((k) => <KpiTile key={k.key} kpi={k} />)}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Care team availability */}
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-h4">Care team availability</h2>
            <Link href="/admin/care-team" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">Manage <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border border-line bg-ivory p-3"><p className="text-h3 text-success">{available}</p><p className="text-caption text-muted">Available</p></div>
            <div className="rounded-md border border-line bg-ivory p-3"><p className="text-h3 text-green">{onVisit}</p><p className="text-caption text-muted">On a visit</p></div>
            <div className="rounded-md border border-line bg-ivory p-3"><p className="text-h3 text-muted">{GUARDIANS.length}</p><p className="text-caption text-muted">Total</p></div>
          </div>
        </section>

        {/* Coverage gaps */}
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-h4">Coverage health</h2>
            <Link href="/admin/coverage" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">All zones <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {ZONES.map((z) => (
              <li key={`${z.city}-${z.zone}`} className="flex items-center justify-between gap-3 rounded-md border border-line bg-ivory px-3.5 py-2.5">
                <span className="min-w-0"><span className="block text-body-sm font-medium text-ink">{z.city} · {z.zone}</span><span className="block text-caption text-muted">{z.guardians} Guardians · {z.companions} Companions</span></span>
                <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-caption font-semibold capitalize', ZONE_TONE[z.status])}>{z.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Cancellation Center */}
      <section>
        <h2 className="mb-3 text-h4">Cancellation center</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              {[{ l: 'Today', v: CANCEL_TODAY }, { l: 'This week', v: CANCEL_WEEK }, { l: 'This month', v: CANCEL_MONTH }].map((c) => (
                <div key={c.l} className="rounded-lg border border-line bg-card p-4 text-center shadow-sm"><p className="text-h3 text-ink">{c.v}</p><p className="text-caption text-muted">{c.l}</p></div>
              ))}
            </div>
            <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
              <h3 className="text-body-sm font-semibold text-ink">Trend · 8 weeks</h3>
              <p className="text-caption text-muted">Cancellations are falling — down 50% from the peak.</p>
              <TrendArea data={CANCEL_TREND} className="mt-3" />
            </div>
          </div>

          <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-body-sm font-semibold text-ink">By reason</h3>
            <InsightBars rows={CANCEL_REASONS} format={(n) => `${n}%`} />
          </div>

          <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-body-sm font-semibold text-ink">Suggested actions</h3>
            <ul className="flex flex-col gap-3">
              {CANCEL_ACTIONS.map((a) => (
                <li key={a} className="flex items-start gap-2.5 text-body-sm text-ink">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={1.75} /> {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
