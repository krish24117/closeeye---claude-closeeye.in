'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarClock, CalendarPlus, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchMyBookingRequests } from '@/lib/db/family'
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

export default function VisitsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = React.useState<BookingRequest[] | null>(null)

  React.useEffect(() => {
    if (!user?.id) {
      setRequests([])
      return
    }
    fetchMyBookingRequests(user.id).then(setRequests).catch(() => setRequests([]))
  }, [user?.id])

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
        <div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      ) : requests.length === 0 ? (
        <section className="flex flex-col items-center rounded-lg border border-line bg-card px-6 py-14 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-green"><CalendarClock className="h-8 w-8" strokeWidth={1.5} /></span>
          <h2 className="mt-5 text-h3 text-ink">No visits yet</h2>
          <p className="mt-2 max-w-sm text-body text-muted">When you book a wellbeing visit, it appears here — with photos and a full report after each one.</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/family/book"><CalendarPlus className="h-5 w-5" strokeWidth={2} /> Book a visit</Link>
          </Button>
        </section>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          {requests.map((r, i) => {
            const name = r.recipient_name?.trim() || 'Your family'
            const m = statusMeta(r.status)
            return (
              <div key={r.id} className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-line')}>
                <Avatar initials={initialsOf(name)} size="md" tone="solid" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{r.service_name?.trim() || 'Wellbeing visit'}</p>
                  <p className="truncate text-caption text-muted">{name} · {fmtDate(r.scheduled_at)}</p>
                </div>
                <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold', toneCls[m.tone])}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', dotCls[m.tone])} /> {m.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
