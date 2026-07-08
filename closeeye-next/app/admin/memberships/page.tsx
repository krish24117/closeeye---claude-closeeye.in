import { Check, Tag } from 'lucide-react'
import { PLANS, MEMBERSHIP_STATS, COUPONS, fmtINR } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

export default function MembershipsPage() {
  const s = MEMBERSHIP_STATS
  const stats = [
    { l: 'Active', v: s.active }, { l: 'Trials', v: s.trials }, { l: 'Expiring soon', v: s.expiringSoon, warn: true },
    { l: 'Renewals (mo)', v: s.renewalsThisMonth }, { l: 'Upgrades', v: s.upgrades }, { l: 'Downgrades', v: s.downgrades },
  ]
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Memberships</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Plans, pricing, renewals and coupons.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((x) => (
          <div key={x.l} className="rounded-lg border border-line bg-card p-4 shadow-sm"><p className={cn('text-h3 leading-none', x.warn ? 'text-warning' : 'text-ink')}>{x.v}</p><p className="mt-1.5 text-caption text-muted">{x.l}</p></div>
        ))}
      </div>

      {/* Plans */}
      <section>
        <h2 className="mb-3 text-h4">Plans &amp; pricing</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={cn('flex flex-col rounded-lg border bg-card p-5 shadow-sm', p.highlight ? 'border-green/40 ring-1 ring-green/20' : 'border-line')}>
              <div className="flex items-center justify-between">
                <h3 className="text-h4 text-ink">{p.name}</h3>
                {p.highlight && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase text-green">Popular</span>}
              </div>
              <p className="mt-2 text-h2 text-ink">{fmtINR(p.price, false)}<span className="text-body-sm font-medium text-muted">{p.period}</span></p>
              <p className="mt-1 text-caption text-muted">{p.members} active members</p>
              <ul className="mt-4 flex flex-col gap-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-body-sm text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2} /> {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Coupons */}
      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <h2 className="border-b border-line px-5 py-4 text-h4">Coupons</h2>
        <ul className="divide-y divide-line">
          {COUPONS.map((c) => (
            <li key={c.code} className="flex items-center gap-3 px-5 py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Tag className="h-4 w-4" strokeWidth={1.75} /></span>
              <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold text-ink">{c.code}</span><span className="block text-caption text-muted">{c.desc} · used {c.used}×</span></span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', c.active ? 'bg-success/12 text-success' : 'bg-ink/[0.06] text-muted')}>{c.active ? 'Active' : 'Paused'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
