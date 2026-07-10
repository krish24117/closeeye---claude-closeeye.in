'use client'

import * as React from 'react'
import { Loader2, Lock, MapPin } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminOperations, type AdminOperations } from '@/lib/db/admin'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

export default function CoveragePage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<AdminOperations | null>(null)

  React.useEffect(() => {
    if (!isAdmin) return
    fetchAdminOperations().then(setD).catch(() => setD(null))
  }, [isAdmin])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Coverage</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>
  if (d === null) return <div className="flex flex-col gap-8"><h1 className="text-h2">Coverage</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>

  const totalFamilies = d.coverage.reduce((s, c) => s + c.families, 0)
  const totalGuardians = d.coverage.reduce((s, c) => s + c.guardians, 0)
  const gaps = d.coverage.filter((c) => c.families > 0 && c.guardians === 0).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Coverage</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Where your families are, and where the Care Team reaches — by city, from live data.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        {[{ l: 'Cities', v: d.coverage.length }, { l: 'Families', v: totalFamilies }, { l: 'Guardians', v: totalGuardians }].map((s) => (
          <div key={s.l} className="rounded-lg border border-line bg-card p-4 text-center shadow-sm"><p className="text-h3 text-ink">{s.v}</p><p className="text-caption text-muted">{s.l}</p></div>
        ))}
      </div>

      {d.coverage.length === 0 ? (
        <EmptyState icon={MapPin} title="No coverage data yet" hint="Cities appear here as families and Guardians are added." />
      ) : (
        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 border-b border-line px-5 py-3 text-caption font-semibold uppercase tracking-wide text-muted sm:grid">
            <span>City</span><span>Families</span><span>Guardians</span><span className="text-right">Supply</span>
          </div>
          <ul className="divide-y divide-line">
            {d.coverage.map((c) => {
              const gap = c.families > 0 && c.guardians === 0
              const tight = !gap && c.families > c.guardians * 3
              const tone = gap ? 'bg-error/10 text-error' : tight ? 'bg-warning/12 text-warning' : 'bg-success/12 text-success'
              const label = gap ? 'gap' : tight ? 'tight' : 'healthy'
              return (
                <li key={c.city} className="grid grid-cols-2 items-center gap-3 px-5 py-3.5 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
                  <span className="inline-flex items-center gap-2 text-body-sm font-semibold text-ink"><MapPin className="h-4 w-4 text-muted" strokeWidth={1.75} /> {c.city}</span>
                  <span className="hidden text-body-sm text-muted sm:block">{c.families}</span>
                  <span className="hidden text-body-sm text-muted sm:block">{c.guardians}</span>
                  <span className="justify-self-end"><span className={cn('rounded-full px-2.5 py-0.5 text-caption font-semibold capitalize', tone)}>{label}</span></span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="flex items-center gap-4 rounded-lg border border-dashed border-line bg-card/60 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink/[0.04] text-muted"><MapPin className="h-5 w-5" strokeWidth={1.75} /></span>
        <div>
          <p className="text-body-sm font-semibold text-ink">Zones, pincodes, operating hours &amp; holidays</p>
          <p className="mt-0.5 text-caption text-muted">Coming soon — city coverage above is live{gaps > 0 ? `; ${gaps} ${gaps === 1 ? 'city has' : 'cities have'} families but no Guardian yet` : ''}. Zone/pincode-level supply needs a coverage table.</p>
        </div>
      </section>
    </div>
  )
}
