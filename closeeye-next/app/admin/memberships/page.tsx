'use client'

import * as React from 'react'
import { Loader2, Lock, Check, Tag } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminMemberships, type AdminMemberships } from '@/lib/db/admin'
import { fmtINR } from '@/lib/admin-data'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

export default function MembershipsPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<AdminMemberships | null>(null)

  React.useEffect(() => {
    if (!isAdmin) return
    fetchAdminMemberships().then(setD).catch(() => setD(null))
  }, [isAdmin])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Memberships</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>
  if (d === null) return <div className="flex flex-col gap-8"><h1 className="text-h2">Memberships</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>

  const stats = [
    { l: 'Active subscriptions', v: String(d.activeSubs) },
    { l: 'Renewals this week', v: String(d.renewalsSoon), warn: d.renewalsSoon > 0 },
    { l: 'Founding members', v: String(d.foundingActive) },
    { l: 'MRR', v: fmtINR(d.mrr) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Memberships</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Plans, active members and renewals — from live subscriptions.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((x) => (
          <div key={x.l} className="rounded-lg border border-line bg-card p-4 shadow-sm"><p className={cn('text-h3 leading-none', x.warn ? 'text-warning' : 'text-ink')}>{x.v}</p><p className="mt-1.5 text-caption text-muted">{x.l}</p></div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-h4">Plans &amp; pricing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {d.plans.map((p) => (
            <div key={p.name} className={cn('flex flex-col rounded-lg border bg-card p-5 shadow-sm', p.popular ? 'border-green/40 ring-1 ring-green/20' : 'border-line')}>
              <div className="flex items-center justify-between">
                <h3 className="text-h4 text-ink">{p.name}</h3>
                {p.popular && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase text-green">Popular</span>}
              </div>
              <p className="mt-2 text-h2 text-ink">{p.price}<span className="text-body-sm font-medium text-muted">{p.period}</span></p>
              <p className="mt-1 text-caption text-muted"><span className="font-semibold text-ink">{p.active}</span> active member{p.active === 1 ? '' : 's'}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {p.benefits.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-body-sm text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2} /> {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center gap-3 rounded-lg border border-dashed border-line bg-card/60 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/[0.04] text-muted"><Tag className="h-5 w-5" strokeWidth={1.75} /></span>
        <div>
          <p className="text-body-sm font-semibold text-ink">Coupons &amp; discounts</p>
          <p className="mt-0.5 text-caption text-muted">Coming soon — a coupons/promotions table isn&apos;t set up yet.</p>
        </div>
      </section>
    </div>
  )
}
