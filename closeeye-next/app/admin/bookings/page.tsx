'use client'

import * as React from 'react'
import { Loader2, Lock } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminBookings, type AdminBookings } from '@/lib/db/admin'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

export default function BookingsPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<AdminBookings | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    if (!isAdmin) return
    setError(false)
    fetchAdminBookings().then((x) => { setD(x); setError(false) }).catch(() => { setError(true) })
  }, [isAdmin])

  React.useEffect(() => { load() }, [load])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Booking analytics</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>
  if (error) return <div className="flex flex-col gap-8"><h1 className="text-h2">Booking analytics</h1><ErrorState title="Couldn’t load booking analytics" message="A connection error — please retry." onRetry={load} /></div>
  if (d === null) return <div className="flex flex-col gap-8"><h1 className="text-h2">Booking analytics</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>

  const tiles = [
    { label: 'Total bookings', value: d.total, tone: 'text-ink' },
    { label: 'Completed', value: d.completed, tone: 'text-success' },
    { label: 'Cancelled', value: d.cancelled, tone: 'text-error' },
    { label: 'Active', value: d.active, tone: 'text-ink' },
    { label: 'Completion rate', value: `${d.completionRate}%`, tone: 'text-ink' },
    { label: 'Conversion rate', value: `${d.conversionRate}%`, tone: 'text-ink' },
  ]
  const outcomes = d.completed + d.cancelled + d.active || 1
  const seg = (n: number) => `${(n / outcomes) * 100}%`
  const maxStatus = Math.max(1, ...d.byStatus.map((s) => s.value))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Booking analytics</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">How visits are booked and how they end — from live data.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <p className={cn('text-h3 leading-none', t.tone)}>{t.value}</p>
            <p className="mt-1.5 text-caption text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <h2 className="text-h4">Visit outcomes</h2>
        <p className="mt-1 text-caption text-muted">{d.total} bookings · {d.completionRate}% completed</p>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-accent-soft">
          <span className="bg-success" style={{ width: seg(d.completed) }} />
          <span className="bg-green/50" style={{ width: seg(d.active) }} />
          <span className="bg-error/70" style={{ width: seg(d.cancelled) }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-caption text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Completed {d.completed}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green/50" /> Active {d.active}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-error/70" /> Cancelled {d.cancelled}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-h4">By status</h2>
          <div className="flex flex-col gap-3">
            {d.byStatus.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-body-sm"><span className="font-medium text-ink">{s.label}</span><span className="font-semibold text-ink">{s.value}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-soft"><div className="h-full rounded-full bg-green" style={{ width: `${(s.value / maxStatus) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <h2 className="border-b border-line px-5 py-4 text-h4">Recent bookings</h2>
          {d.recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-body-sm text-muted">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.recent.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-medium text-ink">{b.who}</span><span className="block text-caption text-muted">{b.service} · {b.date}</span></span>
                  <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-semibold text-green">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
