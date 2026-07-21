'use client'

/**
 * Executive Finance Workspace — nine sections under one roof. It ENHANCES the old finance view; it
 * does not touch the payment or membership pages. Live-only: every figure is a real number or an
 * honest "Coming soon" naming the data source it needs. Cash/burn/runway, CAC/LTV, forecasts and tax
 * are reserved (they need sources Close Eye doesn't have yet) — reserved, never estimated. Cloza
 * answers finance questions from the same live data on the Founder → Intelligence tab.
 */
import * as React from 'react'
import Link from 'next/link'
import { Loader2, Download, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react'
import { ErrorState } from '@/components/ui/states'
import { fetchFinanceWorkspace, type FinanceWorkspaceData } from '@/lib/db/finance'
import { MetricGrid, type Metric } from '@/components/admin/overview'
import { fmtINR } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const SECTIONS = ['Executive Overview', 'Memberships', 'Revenue', 'Payments', 'Care Economics', 'Unit Economics', 'Forecasting', 'Reports', 'Tax & Compliance'] as const

const GATEWAYS = [
  { name: 'Razorpay', live: true },
  { name: 'Stripe', live: false },
  { name: 'PayGlocal', live: false },
  { name: 'Apple', live: false },
  { name: 'Google Play', live: false },
]
const REPORTS = ['Finance', 'GST', 'Revenue', 'Memberships', 'Operational']

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-body-sm leading-relaxed text-muted">{children}</p>
}
function BreakdownBlock({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-muted">{title}</p>
      {rows.length ? (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex items-center justify-between gap-3 text-caption">
                <span className="truncate text-ink">{r.label}</span>
                <span className="shrink-0 font-semibold text-ink">{fmtINR(r.value)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-green/80" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-caption text-muted">No data yet.</p>}
    </div>
  )
}

export default function FinancePage() {
  const [d, setD] = React.useState<FinanceWorkspaceData | null>(null)
  const [error, setError] = React.useState(false)
  const [section, setSection] = React.useState(0)

  const load = React.useCallback(() => {
    setError(false); setD(null)
    fetchFinanceWorkspace().then(setD).catch(() => setError(true))
  }, [])
  React.useEffect(() => { load() }, [load])

  if (error) return <div className="flex flex-col gap-6"><h1 className="text-h2 text-ink">Finance</h1><ErrorState title="Couldn’t load Finance" message="Please try again in a moment." onRetry={load} retryLabel="Try again" /></div>
  if (!d) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>

  const { overview: o, finance: fin, memberships: m } = d

  const content = () => {
    switch (SECTIONS[section]) {
      case 'Executive Overview':
        return <MetricGrid metrics={[
          { label: 'MRR', value: fmtINR(fin.mrr) },
          { label: 'ARR', value: fmtINR(d.arr), hint: 'MRR × 12' },
          { label: 'ARPF', value: fmtINR(d.arpf), hint: 'per family / mo' },
          { label: 'Gross margin', comingSoon: 'Needs per-service cost data.' },
          { label: 'Cash position', comingSoon: 'Needs a bank/ledger source.' },
          { label: 'Burn rate', comingSoon: 'Needs an expenses source.' },
          { label: 'Runway', comingSoon: 'Cash ÷ burn — needs both.' },
        ] as Metric[]} />

      case 'Memberships':
        return <MetricGrid metrics={[
          { label: 'Connect members', value: d.connectMembers },
          { label: 'Care members', value: d.careMembers },
          { label: 'Active', value: m.activeSubs },
          { label: 'Renewals ≤ 7 days', value: m.renewalsSoon },
          { label: 'Trial', comingSoon: 'No trial tier yet.' },
          { label: 'Churn', comingSoon: 'Needs a churn definition + history.' },
        ] as Metric[]} />

      case 'Revenue':
        return (
          <div className="flex flex-col gap-5">
            <MetricGrid metrics={[
              { label: 'Today', value: fmtINR(d.revenueToday) },
              { label: 'This month', value: fmtINR(fin.revenueMonth) },
              { label: 'Total', value: fmtINR(fin.revenueTotal) },
              { label: 'Weekly', comingSoon: 'Needs a weekly rollup.' },
            ] as Metric[]} />
            <div className="grid gap-4 lg:grid-cols-3">
              <BreakdownBlock title="Revenue by country" rows={d.revenueByCountry} />
              <BreakdownBlock title="Revenue by city" rows={o.revenueByCity} />
              <BreakdownBlock title="Revenue by product" rows={o.revenueByService} />
            </div>
          </div>
        )

      case 'Payments':
        return (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {GATEWAYS.map((g) => (
                <span key={g.name} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-semibold', g.live ? 'border-green/30 bg-accent-soft/50 text-green' : 'border-dashed border-line text-muted')}>
                  {g.live ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> : <Clock className="h-3.5 w-3.5" strokeWidth={2} />}
                  {g.name}{g.live ? '' : ' · soon'}
                </span>
              ))}
            </div>
            <MetricGrid metrics={[
              { label: 'Collection rate', value: `${fin.collectionRate}%` },
              { label: 'Failed payments', value: d.failedPayments },
              { label: 'Outstanding', value: fmtINR(fin.outstanding) },
              { label: 'Success rate', comingSoon: 'Needs gateway attempt logs.' },
              { label: 'Refunds', comingSoon: 'Needs refund tracking.' },
              { label: 'Pending settlements', comingSoon: 'Needs a gateway settlement feed.' },
            ] as Metric[]} />
            <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
              <p className="border-b border-line px-4 py-3 text-caption font-semibold uppercase tracking-wide text-muted">Recent payments</p>
              {fin.payments.length ? fin.payments.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3 last:border-0">
                  <div className="min-w-0"><p className="truncate text-body-sm font-medium text-ink">{p.who}</p><p className="truncate text-caption text-muted">{p.service} · {p.date}</p></div>
                  <span className="shrink-0 text-body-sm font-semibold text-ink">{fmtINR(p.amount)}</span>
                </div>
              )) : <p className="px-4 py-6 text-center text-caption text-muted">No payments yet.</p>}
            </div>
          </div>
        )

      case 'Care Economics':
        return (
          <div className="flex flex-col gap-4">
            <Note>Care margins are a Close Eye advantage — reserved here until per-visit cost data is captured.</Note>
            <MetricGrid metrics={[
              { label: 'Care Team payouts', value: fmtINR(fin.payouts), hint: 'paid to Guardians' },
              { label: 'Revenue per care request', comingSoon: 'Needs request→revenue attribution.' },
              { label: 'Cost per Guardian visit', comingSoon: 'Needs Guardian payout costing.' },
              { label: 'Cost per Presence visit', comingSoon: 'Needs presence cost data.' },
              { label: 'Cost per Care coordination', comingSoon: 'Needs coordination costing.' },
              { label: 'Gross margin by service', comingSoon: 'Needs per-service cost.' },
            ] as Metric[]} />
          </div>
        )

      case 'Unit Economics':
        return <MetricGrid metrics={[
          { label: 'ARPF', value: fmtINR(d.arpf), hint: 'per family / mo' },
          { label: 'CAC', comingSoon: 'Needs marketing-spend tracking.' },
          { label: 'LTV', comingSoon: 'Needs churn + lifetime.' },
          { label: 'LTV / CAC', comingSoon: 'Derived from LTV and CAC.' },
          { label: 'Payback period', comingSoon: 'Derived from CAC and ARPF.' },
        ] as Metric[]} />

      case 'Forecasting':
        return (
          <div className="flex flex-col gap-4">
            <Note>Reserved for Cloza — it will project these from Close Eye’s own history, clearly labelled as predictions.</Note>
            <MetricGrid metrics={[
              { label: 'Revenue forecast', comingSoon: 'Cloza will project from revenue history.' },
              { label: 'Burn forecast', comingSoon: 'Needs an expense history.' },
              { label: 'Cash runway', comingSoon: 'Needs cash + burn.' },
              { label: 'Hiring forecast', comingSoon: 'Needs a headcount plan.' },
              { label: 'Care demand forecast', comingSoon: 'Cloza will project from care-request history.' },
            ] as Metric[]} />
          </div>
        )

      case 'Reports':
        return (
          <div className="flex flex-col gap-3">
            <Note>Exports are reserved — each lights up once its dataset is finalised.</Note>
            {REPORTS.map((r) => (
              <div key={r} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3 shadow-sm">
                <span className="text-body-sm font-medium text-ink">{r} report</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1.5 text-caption font-semibold text-muted"><Download className="h-3.5 w-3.5" strokeWidth={2} /> Export · soon</span>
              </div>
            ))}
          </div>
        )

      case 'Tax & Compliance':
        return (
          <div className="flex flex-col gap-4">
            <Note>Reserved for international scale — GST, TDS, invoices and compliance reporting.</Note>
            <MetricGrid metrics={[
              { label: 'GST', comingSoon: 'Needs a GST filing integration.' },
              { label: 'TDS', comingSoon: 'Needs payout TDS capture.' },
              { label: 'Invoices', comingSoon: 'Needs invoice generation.' },
              { label: 'Compliance reports', comingSoon: 'Needs a compliance dataset.' },
            ] as Metric[]} />
            <Link href="/admin/audit" className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
              Open Audit Logs <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.9} />
            </Link>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-ink">Finance</h1>
        <p className="mt-1.5 text-body text-muted">The executive finance workspace — live from Close Eye’s own data.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((s, i) => (
          <button key={s} onClick={() => setSection(i)} aria-current={i === section ? 'page' : undefined}
            className={cn('shrink-0 rounded-full px-3.5 py-2 text-caption font-semibold transition-colors', i === section ? 'bg-surface-inverse text-content-inverse' : 'border border-line bg-card text-muted hover:text-ink')}>
            {s}
          </button>
        ))}
      </div>
      {content()}
    </div>
  )
}
