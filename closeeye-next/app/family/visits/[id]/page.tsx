'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CalendarClock, FileText, Loader2, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { isSuperAdmin } from '@/lib/roles'
import { fetchMyBookingRequests, fetchFullVisitReport, type FullVisitReport } from '@/lib/db/family'
import { VisitReportExperience } from '@/components/family/visit-experience'
import { whatsappLink } from '@/lib/site'
import type { BookingRequest } from '@/lib/db/types'
import { cn } from '@/lib/utils'

type Tone = 'green' | 'amber' | 'grey'
const toneCls: Record<Tone, string> = {
  green: 'bg-success/12 text-success',
  amber: 'bg-warning/12 text-warning',
  grey: 'bg-ink/[0.06] text-muted',
}

function statusMeta(status: string): { label: string; tone: Tone } {
  switch (status) {
    case 'paid': return { label: 'Scheduled', tone: 'green' }
    case 'scheduled':
    case 'companion_confirmed':
    case 'confirmed': return { label: 'Confirmed', tone: 'green' }
    case 'cancelled': return { label: 'Cancelled', tone: 'grey' }
    case 'needs_details': return { label: 'Needs details', tone: 'amber' }
    default: return { label: 'Requested', tone: 'amber' }
  }
}
function fmtDate(iso: string | null): string {
  if (!iso) return 'Date to be confirmed'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return 'Date to be confirmed'
  }
}

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const { profile } = useFamilyData()
  const admin = isSuperAdmin(profile)
  const [visit, setVisit] = React.useState<BookingRequest | null | undefined>(undefined)
  const [full, setFull] = React.useState<FullVisitReport | null>(null)

  React.useEffect(() => {
    if (!user?.id) { setVisit(null); return }
    fetchMyBookingRequests(user.id)
      .then((rows) => {
        const v = rows.find((r) => r.id === params.id) ?? null
        setVisit(v)
        if (v?.booking_id) {
          fetchFullVisitReport(v.booking_id, {
            memberName: v.recipient_name?.trim() || 'Your family',
            service: v.service_name?.trim() || 'Wellbeing visit',
          }).then(setFull).catch(() => {})
        }
      })
      .catch(() => setVisit(null))
  }, [user?.id, params.id])

  const back = (
    <Button asChild variant="text" className="self-start">
      <Link href="/family/visits"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> All visits</Link>
    </Button>
  )

  if (visit === undefined) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  if (!visit) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <EmptyState
          icon={CalendarClock}
          title="Visit not found"
          hint="This visit may have been cancelled or belongs to another account."
          action={<Button asChild><Link href="/family/visits">Back to visits</Link></Button>}
        />
      </div>
    )
  }

  const name = visit.recipient_name?.trim() || 'Your family'
  const m = statusMeta(visit.status)

  // Completed — render the full Human Presence Experience from real data.
  if (full) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <VisitReportExperience report={full.report} stats={full.stats} recommendations={full.recommendations} followUps={full.followUps} pdfUrl={full.pdfUrl} delivery={full.delivery} admin={admin} />
      </div>
    )
  }

  // Being arranged / scheduled / cancelled.
  return (
    <div className="flex flex-col gap-6">
      {back}

      <header className="flex flex-wrap items-center gap-4 rounded-lg border border-line/70 bg-card p-6 shadow-sm">
        <Avatar initials={initialsOf(name)} size="lg" tone="solid" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h3">{visit.service_name?.trim() || 'Wellbeing visit'}</h1>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold', toneCls[m.tone])}>{m.label}</span>
          </div>
          <p className="mt-1 text-body-sm text-muted">For {name} · {fmtDate(visit.scheduled_at)}</p>
        </div>
      </header>

      <section className="rounded-lg border border-line/70 bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-h4">
          <CalendarClock className="h-5 w-5 text-green" strokeWidth={1.5} /> {visit.status === 'cancelled' ? 'This visit was cancelled' : 'This visit is being arranged'}
        </h2>
        <p className="mt-4 text-body text-muted">
          Your Presence Manager coordinates the details and keeps you updated. You&apos;ll see the full Presence Story and photos here once the visit is complete.
        </p>
      </section>
      <section className="flex items-center gap-3 rounded-lg border border-dashed border-line bg-card/50 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><FileText className="h-5 w-5" strokeWidth={1.5} /></span>
        <p className="text-body-sm text-muted">The Presence Story and photos will appear here after this visit is completed.</p>
      </section>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button asChild size="sm"><Link href="/family/connect"><MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Message Presence Manager</Link></Button>
        {visit.status !== 'cancelled' && (
          <Button asChild variant="secondary" size="sm">
            <a href={whatsappLink(`Hi Close Eye — I'd like to reschedule ${name}'s visit.`)} target="_blank" rel="noreferrer">Reschedule</a>
          </Button>
        )}
      </div>
    </div>
  )
}
