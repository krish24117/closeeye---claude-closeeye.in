'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CalendarClock, FileText, Loader2, MapPin, MessageCircle, Pencil } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { DEFAULT_REGION_CODE, localeFor } from '@/lib/platform/regions'
import { isSuperAdmin } from '@/lib/roles'
import { fetchMyBookingRequests, fetchFullVisitReport, type FullVisitReport } from '@/lib/db/family'
import { VisitReportExperience } from '@/components/family/visit-experience'
import { WhatYouToldUs } from '@/components/family/what-you-told-us'
import { updateVisitRequest } from '@/features/booking/api'
import { BOOKING_SERVICES } from '@/features/booking/schema'
import { VisitDetailsForm, emptyVisitDetails, slotIdFromLabel, toVisitDetailInput, visitDetailsError, type VisitDetailsState } from '@/components/family/visit-details-form'
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
function fmtDate(iso: string | null, region: string = DEFAULT_REGION_CODE): string {
  if (!iso) return 'Date to be confirmed'
  try {
    return new Date(iso).toLocaleDateString(localeFor(region), { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return 'Date to be confirmed'
  }
}

export default function VisitDetailPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const { profile, lovedOnes, region } = useFamilyData()
  const admin = isSuperAdmin(profile)
  const [visit, setVisit] = React.useState<BookingRequest | null | undefined>(undefined)
  const [full, setFull] = React.useState<FullVisitReport | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [editDetails, setEditDetails] = React.useState<VisitDetailsState>(emptyVisitDetails)
  const [saving, setSaving] = React.useState(false)
  const [editError, setEditError] = React.useState('')

  const load = React.useCallback(() => {
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

  React.useEffect(() => { load() }, [load])

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
  // Link this visit's loved one to the family roster (BookingRequest carries only the
  // name) so we can reflect their wellbeing profile back in the Story.
  const lovedOneId = lovedOnes.find((l) => l.full_name.trim().toLowerCase() === name.toLowerCase())?.id
  const m = statusMeta(visit.status)

  // The logistics the family provided for this visit — reviewable any time.
  const visitDetails: [string, string | null][] = [
    ['Address', visit.recipient_address],
    ['Landmark', visit.visit_landmark],
    ['Visit contact', [visit.visit_contact_name, visit.visit_contact_phone].filter(Boolean).join(' · ') || null],
    ['Preferred time', visit.visit_time_window],
    ['Access', visit.visit_access_instructions],
    ['Instructions', visit.visit_special_instructions],
    ['Notes for the team', visit.visit_team_notes],
  ]
  const hasVisitDetails = visitDetails.some(([, v]) => v && v.trim())

  // A pending request (not yet materialised into a booking) can still be edited.
  const isEditable = !visit.booking_id && ['requested', 'pending_confirmation', 'needs_details'].includes(visit.status)
  const allowsEmergency = !!BOOKING_SERVICES.find((s) => s.name === visit.service_name)?.allowsEmergency

  function startEdit() {
    setEditError('')
    setEditDetails({
      address: visit!.recipient_address ?? '',
      landmark: visit!.visit_landmark ?? '',
      contactName: visit!.visit_contact_name ?? '',
      contactPhone: visit!.visit_contact_phone ?? '',
      date: visit!.scheduled_at ? visit!.scheduled_at.slice(0, 10) : '',
      timeSlot: slotIdFromLabel(visit!.visit_time_window),
      specialInstructions: visit!.visit_special_instructions ?? '',
      accessInstructions: visit!.visit_access_instructions ?? '',
      teamNotes: visit!.visit_team_notes ?? '',
      mapLink: visit!.visit_map_link ?? '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    const err = visitDetailsError(editDetails)
    if (err) { setEditError(err); return }
    setSaving(true); setEditError('')
    try {
      await updateVisitRequest(visit!.id, toVisitDetailInput(editDetails))
      setEditing(false)
      load()
    } catch (e) {
      console.error('[visit-edit] failed:', e)
      setEditError('We couldn’t save your changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Completed — render the full Human Presence Experience from real data.
  if (full) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <VisitReportExperience report={full.report} stats={full.stats} recommendations={full.recommendations} followUps={full.followUps} pdfUrl={full.pdfUrl} delivery={full.delivery} admin={admin} />
        {lovedOneId && <WhatYouToldUs lovedOneId={lovedOneId} name={name} />}
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
          <p className="mt-1 text-body-sm text-muted">For {name} · {fmtDate(visit.scheduled_at, region)}</p>
        </div>
      </header>

      {(hasVisitDetails || isEditable) && (
        <section className="rounded-lg border border-line/70 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-h4"><MapPin className="h-5 w-5 text-green" strokeWidth={1.5} /> Your visit details</h2>
            {isEditable && !editing && (
              <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 text-caption font-semibold text-green hover:underline"><Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Edit</button>
            )}
          </div>

          {editing ? (
            <div className="mt-5 flex flex-col gap-5">
              <VisitDetailsForm value={editDetails} onChange={(p) => setEditDetails((d) => ({ ...d, ...p }))} allowsEmergency={allowsEmergency} />
              {editError && <p className="text-caption text-error">{editError}</p>}
              <div className="flex gap-2.5">
                <Button size="sm" variant="secondary" disabled={saving} onClick={() => { setEditing(false); setEditError('') }}>Cancel</Button>
                <Button size="sm" disabled={saving} onClick={saveEdit}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Saving…</> : 'Save changes'}</Button>
              </div>
            </div>
          ) : (
            <>
              <dl className="mt-4 divide-y divide-line">
                {visitDetails.filter(([, v]) => v && v.trim()).map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="shrink-0 text-body-sm text-muted">{label}</dt>
                    <dd className="min-w-0 whitespace-pre-line text-right text-body-sm font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              {visit.visit_map_link?.trim() && (
                <a href={visit.visit_map_link.trim()} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-body-sm font-semibold text-green hover:underline">
                  <MapPin className="h-4 w-4" strokeWidth={1.75} /> Open map location →
                </a>
              )}
            </>
          )}
        </section>
      )}

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
