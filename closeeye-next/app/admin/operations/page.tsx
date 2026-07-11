'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, ArrowRight, ArrowUpRight, MapPin } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminOperations, type AdminOperations } from '@/lib/db/admin'
import { isSuperAdmin } from '@/lib/roles'

export default function OperationsPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<AdminOperations | null>(null)

  React.useEffect(() => {
    if (!isAdmin) return
    fetchAdminOperations().then(setD).catch(() => setD(null))
  }, [isAdmin])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Operations</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>
  if (d === null) return <div className="flex flex-col gap-8"><h1 className="text-h2">Operations</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>

  const today = [
    { l: 'Presence today', v: d.presenceToday },
    { l: 'Booked today', v: d.bookingsToday },
    { l: 'Completed today', v: d.completedToday },
    { l: 'Active families', v: d.activeFamilies },
    { l: 'Care Team', v: d.careTeam },
    { l: 'Cancelled (mo)', v: d.cancelledMonth },
  ]
  const maxCov = Math.max(1, ...d.coverage.map((c) => c.families))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Operations</h1>
          <p className="mt-1.5 text-body leading-relaxed text-muted">Today&apos;s operations and coverage, from live data.</p>
        </div>
        <Link href="/pm" className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
          <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.75} /> Live monitor (Presence Console)
        </Link>
      </div>

      <section>
        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Today</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {today.map((k) => (
            <div key={k.l} className="rounded-lg border border-line bg-card p-4 shadow-sm"><p className="text-h3 leading-none text-ink">{k.v}</p><p className="mt-1.5 text-caption text-muted">{k.l}</p></div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-h4">Coverage by city</h2>
            <Link href="/admin/care-team" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">Care Team <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
          </div>
          {d.coverage.length === 0 ? (
            <p className="mt-4 text-body-sm text-muted">No coverage data yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {d.coverage.map((c) => {
                const gap = c.families > 0 && c.guardians === 0
                return (
                  <li key={c.city} className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                    <span className="w-28 shrink-0 truncate text-body-sm font-medium text-ink">{c.city}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent-soft"><div className="h-full rounded-full bg-green" style={{ width: `${(c.families / maxCov) * 100}%` }} /></div>
                    <span className="w-32 shrink-0 text-right text-caption text-muted">{c.families} fam · {c.guardians} guard{gap ? <span className="ml-1 font-bold text-warning">gap</span> : ''}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <h2 className="text-h4">Cancellations</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[{ l: 'Today', v: d.cancelledToday }, { l: 'This week', v: d.cancelledWeek }, { l: 'This month', v: d.cancelledMonth }].map((c) => (
              <div key={c.l} className="rounded-md border border-line bg-ivory p-3"><p className="text-h3 text-ink">{c.v}</p><p className="text-caption text-muted">{c.l}</p></div>
            ))}
          </div>
          <p className="mt-4 text-caption text-muted">Cancellation reasons aren&apos;t captured as structured data yet — only free-text notes on each booking.</p>
        </section>
      </div>
    </div>
  )
}
