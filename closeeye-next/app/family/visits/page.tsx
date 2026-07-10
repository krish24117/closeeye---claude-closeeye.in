'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarClock, CalendarPlus, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { useToast } from '@/components/ui/toast'
import { fetchMyBookingRequests, fetchReportedBookingIds } from '@/lib/db/family'
import { useVisitSync } from '@/lib/use-visit-sync'
import { payForBooking } from '@/lib/razorpay'
import { isFounderFunnelGated } from '@/lib/founder-funnel'
import { PRELAUNCH_BOOKING_NOTE } from '@/lib/launch'
import type { BookingRequest } from '@/lib/db/types'
import { cn } from '@/lib/utils'

type Tone = 'green' | 'amber' | 'grey' | 'red'
const toneCls: Record<Tone, string> = {
  green: 'bg-success/12 text-success',
  amber: 'bg-warning/12 text-warning',
  grey: 'bg-ink/[0.06] text-muted',
  red: 'bg-error/10 text-error',
}
const dotCls: Record<Tone, string> = { green: 'bg-success', amber: 'bg-warning', grey: 'bg-muted/60', red: 'bg-error' }

function statusMeta(status: string): { label: string; tone: Tone } {
  switch (status) {
    case 'completed': return { label: 'Completed', tone: 'green' }
    case 'paid': return { label: 'Scheduled', tone: 'green' }
    case 'scheduled':
    case 'companion_confirmed':
    case 'confirmed': return { label: 'Confirmed', tone: 'green' }
    case 'cancelled': return { label: 'Cancelled', tone: 'grey' }
    case 'needs_details': return { label: 'Needs details', tone: 'amber' }
    default: return { label: 'Requested', tone: 'amber' } // pending_confirmation / requested
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Date to be confirmed'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return 'Date to be confirmed'
  }
}

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

export default function VisitsPage() {
  const { user } = useAuth()
  const { profile, identity } = useFamilyData()
  const toast = useToast()
  const [requests, setRequests] = React.useState<BookingRequest[] | null>(null)
  const [reported, setReported] = React.useState<Set<string>>(new Set())
  const [paying, setPaying] = React.useState<string | null>(null)

  const reload = React.useCallback(() => {
    if (!user?.id) {
      setRequests([])
      return
    }
    fetchMyBookingRequests(user.id)
      .then((rows) => {
        setRequests(rows)
        const ids = rows.map((r) => r.booking_id).filter(Boolean) as string[]
        if (ids.length) fetchReportedBookingIds(ids).then(setReported).catch(() => {})
      })
      .catch(() => setRequests([]))
  }, [user?.id])

  React.useEffect(() => { reload() }, [reload])
  useVisitSync(user?.id, reload)

  // Payment is confirmed by the async webhook, so a single reload races it.
  // Poll a few times until the booking flips to paid (M5).
  const pollUntilPaid = React.useCallback(async (id: string) => {
    for (let i = 0; i < 6; i++) {
      if (!user?.id) break
      const rows = await fetchMyBookingRequests(user.id).catch(() => null)
      if (rows) {
        setRequests(rows)
        const row = rows.find((x) => x.id === id)
        if (row && (row.payment_status === 'paid' || row.status === 'paid')) return
      }
      await new Promise((res) => setTimeout(res, 2000))
    }
  }, [user?.id])

  async function pay(r: BookingRequest) {
    if (paying) return
    if (isFounderFunnelGated()) { toast(PRELAUNCH_BOOKING_NOTE); return }
    setPaying(r.id)
    try {
      const outcome = await payForBooking({
        bookingRequestId: r.id,
        prefill: {
          name: identity.fullName,
          email: identity.email ?? undefined,
          contact: profile?.whatsapp_number || profile?.phone || undefined,
        },
      })
      if (outcome.status === 'success') {
        toast('Payment received — confirming your visit…')
        await pollUntilPaid(r.id)
      } else if (outcome.status === 'dismissed') {
        toast('Payment cancelled — you can pay anytime.')
      } else {
        toast(outcome.message)
      }
    } catch (e) {
      console.error('[visits] payment failed:', e)
      toast('We couldn’t start the payment. Please try again.')
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <PageHeader title="Visits" subtitle="Every visit for the people you love." />
        {requests && requests.length > 0 && (
          <Button asChild size="md">
            <Link href="/family/book"><CalendarPlus className="h-5 w-5" strokeWidth={2} /> Book a visit</Link>
          </Button>
        )}
      </div>

      {requests === null ? (
        <div className="grid place-items-center rounded-lg border border-line/70 bg-card py-20 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      ) : requests.length === 0 ? (
        <section className="flex flex-col items-center rounded-lg border border-line/70 bg-card px-6 py-14 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-green"><CalendarClock className="h-8 w-8" strokeWidth={1.5} /></span>
          <h2 className="mt-5 text-h3 text-ink">No visits yet</h2>
          <p className="mt-2 max-w-sm text-body text-muted">When you book a wellbeing visit, it appears here — with photos and a full Presence Story after each one.</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/family/book"><CalendarPlus className="h-5 w-5" strokeWidth={2} /> Book a visit</Link>
          </Button>
        </section>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
          {requests.map((r, i) => {
            const name = r.recipient_name?.trim() || 'Your family'
            const hasReport = Boolean(r.booking_id && reported.has(r.booking_id))
            const m = hasReport ? { label: 'Presence Story ready', tone: 'green' as Tone } : statusMeta(r.status)
            const awaitingPayment = r.status === 'companion_confirmed' && r.payment_status !== 'paid' && (r.amount_paise ?? 0) > 0
            return (
              <div key={r.id} className={cn('px-5 py-4', i > 0 && 'border-t border-line')}>
                <Link href={`/family/visits/${r.id}`} className="group flex items-center gap-4">
                  <Avatar initials={initialsOf(name)} size="md" tone="solid" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-ink group-hover:text-green">{r.service_name?.trim() || 'Wellbeing visit'}</p>
                    <p className="truncate text-caption text-muted">For {name} · {fmtDate(r.scheduled_at)}</p>
                    {hasReport && <p className="mt-0.5 text-caption font-semibold text-green">View the full Presence Story →</p>}
                  </div>
                  <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold', toneCls[m.tone])}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', dotCls[m.tone])} /> {m.label}
                  </span>
                </Link>
                {awaitingPayment && (
                  <div className="mt-3">
                    <Button size="sm" disabled={paying !== null} onClick={() => pay(r)}>
                      {paying === r.id ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Opening…</> : `Pay ${rupees(r.amount_paise ?? 0)} now`}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
