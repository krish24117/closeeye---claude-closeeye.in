'use client'

import * as React from 'react'
import { Loader2, Lock, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminOverview, type AdminOverview, type InsightRow } from '@/lib/db/admin'
import { fmtINR } from '@/lib/admin-data'
import { isSuperAdmin } from '@/lib/roles'

function Bars({ rows }: { rows: InsightRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (rows.length === 0) return <p className="text-body-sm text-muted">No revenue recorded yet.</p>
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-body-sm"><span className="truncate font-medium text-ink">{r.label}</span><span className="shrink-0 font-semibold text-ink">{fmtINR(r.value)}</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-soft"><div className="h-full rounded-full bg-green" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

export default function InsightsPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<AdminOverview | null>(null)

  React.useEffect(() => {
    if (!isAdmin) return
    fetchAdminOverview().then(setD).catch(() => setD(null))
  }, [isAdmin])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Insights</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>
  if (d === null) return <div className="flex flex-col gap-8"><h1 className="text-h2">Insights</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>

  const tiles = [
    { l: 'Revenue this month', v: fmtINR(d.revenueMonth) },
    { l: 'MRR', v: fmtINR(d.mrr) },
    { l: 'Active families', v: String(d.families) },
    { l: 'New this month', v: String(d.newFamiliesMonth) },
    { l: 'Active subscriptions', v: String(d.activeSubs) },
    { l: 'Care Team', v: String(d.careTeam) },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Insights</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">The numbers that matter, read from live data.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.l} className="rounded-lg border border-line bg-card p-4 shadow-sm"><p className="text-h3 leading-none text-ink">{t.v}</p><p className="mt-1.5 text-caption text-muted">{t.l}</p></div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm"><h2 className="mb-4 text-h4">Revenue by city</h2><Bars rows={d.revenueByCity} /></section>
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm"><h2 className="mb-4 text-h4">Revenue by service</h2><Bars rows={d.revenueByService} /></section>
      </div>

      <section className="flex items-center gap-4 rounded-lg border border-dashed border-line bg-card/60 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/[0.04] text-muted"><Sparkles className="h-5 w-5" strokeWidth={1.75} /></span>
        <div>
          <p className="text-body-sm font-semibold text-ink">Predictive &amp; wellness insights</p>
          <p className="mt-0.5 text-caption text-muted">Coming soon — demand forecasting, family-wellness trends and cross-module intelligence build on top of these real numbers.</p>
        </div>
      </section>
    </div>
  )
}
