'use client'

import * as React from 'react'
import { Loader2, Lock } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminFinance, type AdminFinance } from '@/lib/db/admin'
import { fmtINR } from '@/lib/admin-data'
import { isSuperAdmin } from '@/lib/roles'

export default function FinancePage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<AdminFinance | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    if (!isAdmin) return
    setError(false)
    fetchAdminFinance().then((x) => { setD(x); setError(false) }).catch(() => { setError(true) })
  }, [isAdmin])

  React.useEffect(() => { load() }, [load])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Finance</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>
  if (error) return <div className="flex flex-col gap-8"><h1 className="text-h2">Finance</h1><ErrorState title="Couldn’t load Finance" message="A connection error — please retry." onRetry={load} /></div>
  if (d === null) return <div className="flex flex-col gap-8"><h1 className="text-h2">Finance</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>

  const tiles = [
    { label: 'Total revenue', value: fmtINR(d.revenueTotal) },
    { label: 'This month', value: fmtINR(d.revenueMonth) },
    { label: 'MRR', value: fmtINR(d.mrr) },
    { label: 'Outstanding', value: fmtINR(d.outstanding) },
    { label: 'Care Team payouts', value: fmtINR(d.payouts) },
    { label: 'Collection rate', value: `${d.collectionRate}%` },
  ]
  const maxTrend = Math.max(1, ...d.trend.map((t) => t.value))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Finance</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Revenue and payments across the business, from live data.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <p className="text-h3 leading-none text-ink">{t.value}</p>
            <p className="mt-1.5 text-caption text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <h2 className="text-h4">Revenue · last 6 months</h2>
        <div className="mt-5 flex items-end gap-3 sm:gap-5" style={{ height: '180px' }}>
          {d.trend.map((t) => (
            <div key={t.label} className="flex flex-1 flex-col items-center justify-end gap-2">
              <span className="text-caption font-semibold text-ink">{t.value > 0 ? fmtINR(t.value) : ''}</span>
              <div className="w-full rounded-t-md bg-green/80" style={{ height: `${Math.max(2, (t.value / maxTrend) * 140)}px` }} />
              <span className="text-caption text-muted">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-h4">Recent payments</h2>
          <span className="text-caption text-muted">Paid visits</span>
        </div>
        {d.payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-body-sm text-muted">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {d.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-16 shrink-0 font-mono text-caption text-muted">{p.id}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-medium text-ink">{p.who}</span><span className="block text-caption text-muted">{p.service} · {p.date}</span></span>
                <span className="shrink-0 text-body-sm font-semibold text-ink">{fmtINR(p.amount, false)}</span>
                <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-success">Paid</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
