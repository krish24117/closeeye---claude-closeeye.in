'use client'

/**
 * Sprint 5 — Care (Owner: Care, /space/care). Real-world presence: request a visit, what Care
 * offers, and care history. Two gates honoured: capability (can(region,'presence') — a
 * Connect-only region sees no Care surface) and the launch phase (PHASE_2_ENABLED — visits open
 * 15 August). Reuses the existing booking data (fetchMyBookingRequests) and the services menu.
 */
import * as React from 'react'
import Link from 'next/link'
import { HeartHandshake, CalendarPlus, Clock } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchMyBookingRequests } from '@/lib/db/family'
import type { BookingRequest } from '@/lib/db/types'
import { can } from '@/lib/platform/capability'
import { PHASE_2_ENABLED, VISITS_OPEN_LABEL } from '@/lib/connect/phase'
import { SERVICE_MENU } from '@/lib/services'
import { formatDate } from '@/lib/platform/locale'

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s)

export default function CarePage() {
  const { user } = useAuth()
  const { region } = useFamilyData()
  const [visits, setVisits] = React.useState<BookingRequest[]>([])
  const [loading, setLoading] = React.useState(true)

  const careHere = can(region, 'presence')

  React.useEffect(() => {
    if (!user?.id || !careHere) { setLoading(false); return }
    fetchMyBookingRequests(user.id).then(setVisits).catch(() => {}).finally(() => setLoading(false))
  }, [user?.id, careHere])

  if (!careHere) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-h2 text-ink">Care</h1>
        <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
          <HeartHandshake className="mx-auto h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="mt-3 text-body-sm font-semibold text-ink">Trusted presence isn’t live in your region yet</p>
          <p className="mx-auto mt-1 max-w-sm text-caption text-muted">Close Eye Connect stays with your family everywhere. Real-world visits arrive region by region — we’ll tell you the moment Care reaches yours.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-h2 text-ink">Care</h1>

      {/* Request a visit — launch-gated */}
      <section className="flex flex-col gap-4 rounded-lg border border-line/70 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><HeartHandshake className="h-5 w-5" strokeWidth={1.5} /></span>
          <div>
            <p className="text-body font-semibold text-ink">A trusted person, there when you can’t be</p>
            <p className="mt-0.5 text-body-sm text-muted">A verified Guardian visits in person and keeps you updated.</p>
          </div>
        </div>
        {PHASE_2_ENABLED ? (
          <Link href="/family/book" className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-ink px-5 py-2.5 text-body-sm font-semibold text-ivory"><CalendarPlus className="h-4 w-4" strokeWidth={2} /> Request a visit</Link>
        ) : (
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-line px-5 py-2.5 text-body-sm font-semibold text-muted"><Clock className="h-4 w-4" strokeWidth={1.75} /> Visits open {VISITS_OPEN_LABEL}</div>
        )}
      </section>

      {/* What Care offers */}
      <section className="flex flex-col gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">What Care can do</p>
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line/70 bg-card shadow-sm">
          {SERVICE_MENU.map((s) => (
            <div key={s.name} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0"><p className="text-body-sm font-semibold text-ink">{s.name}</p><p className="mt-0.5 text-caption text-muted">{s.note}</p></div>
              <span className="shrink-0 text-body-sm font-semibold text-ink">{s.price}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Care history */}
      <section className="flex flex-col gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">Care history</p>
        {loading ? (
          <p className="py-8 text-center text-caption text-muted">Loading…</p>
        ) : visits.length === 0 ? (
          <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
            <p className="text-body-sm font-semibold text-ink">No visits yet</p>
            <p className="mx-auto mt-1 max-w-xs text-caption text-muted">When a Guardian visits someone you love, it’ll appear here with their update.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visits.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-ink">{v.service_name || 'Presence visit'}{v.recipient_name ? ` · ${v.recipient_name}` : ''}</p>
                  <p className="mt-0.5 text-caption text-muted">{v.scheduled_at ? formatDate(v.scheduled_at, region, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Date to be confirmed'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-green">{cap(v.status)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
