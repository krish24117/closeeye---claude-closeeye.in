'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarCheck, Check, CheckCircle2, Loader2, MapPin, Pencil, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/family/avatar'
import { OptionCard, Chip } from '@/components/ui/choice'
import { Field, Textarea } from '@/components/ui/field'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { BOOKING_SERVICES } from '@/features/booking/schema'
import { requestVisit } from '@/features/booking/api'
import { isFounderFunnelGated } from '@/lib/founder-funnel'
import { PRELAUNCH_BOOKING_NOTE } from '@/lib/launch'
import { updateFamilyMember } from '@/lib/db/family'
import { VisitDetailsForm, emptyVisitDetails, slotLabelOf, toVisitDetailInput, visitDetailsError, type VisitDetailsState } from '@/components/family/visit-details-form'
import type { LovedOne } from '@/lib/db/types'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const memberMeta = (m: { relationship: string | null; city: string | null }) => [m.relationship, m.city].filter(Boolean).join(' · ')

/** Build the full profile row from a member, so an opt-in save never drops fields. */
function memberToInput(m: LovedOne) {
  return {
    full_name: m.full_name,
    relationship: m.relationship ?? '',
    age: m.age,
    city: m.city ?? '',
    address: m.address ?? '',
    phone_number: m.phone_number ?? '',
    medical_notes: m.medical_notes ?? '',
    doctor_name: m.doctor_name ?? '',
    nearest_hospital: m.nearest_hospital ?? '',
    emergency_contact_name: m.emergency_contact_name ?? '',
    emergency_contact_phone: m.emergency_contact_phone ?? '',
  }
}

type Step = 'type' | 'requirement' | 'details' | 'review'

// Quick-pick prompts for a Custom Request — the family can tap any, then describe.
const CUSTOM_NEEDS = ['Groceries', 'Medicines', 'Paperwork', 'Festival visit', 'Errands', 'Other']

function BookingSteps({ step, custom }: { step: Step; custom: boolean }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'type', label: 'Visit type' },
    ...(custom ? [{ id: 'requirement' as Step, label: 'What you need' }] : []),
    { id: 'details', label: 'Visit details' },
    { id: 'review', label: 'Review' },
  ]
  const idx = steps.findIndex((s) => s.id === step)
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${idx + 1} of ${steps.length}`}>
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 text-caption font-medium', i <= idx ? 'text-green' : 'text-muted/60')}>
            <span aria-current={i === idx ? 'step' : undefined} className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold', i < idx ? 'bg-green text-ivory' : i === idx ? 'bg-accent-soft text-green ring-1 ring-green' : 'bg-ink/[0.06] text-muted')}>
              {i < idx ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </span>
          {i < steps.length - 1 && <span className={cn('h-px w-4 sm:w-8', i < idx ? 'bg-green' : 'bg-line')} />}
        </li>
      ))}
    </ol>
  )
}

export default function FamilyBookPage() {
  const params = useSearchParams()
  const { lovedOnes, profile, loading } = useFamilyData()

  const [memberId, setMemberId] = React.useState('')
  const [pickChoice, setPickChoice] = React.useState('')
  const [step, setStep] = React.useState<Step>('type')
  const [serviceId, setServiceId] = React.useState('')
  const [details, setDetails] = React.useState<VisitDetailsState>(emptyVisitDetails)
  const patch = (p: Partial<VisitDetailsState>) => setDetails((d) => ({ ...d, ...p }))
  const [updateProfile, setUpdateProfile] = React.useState(false)
  const [prefilledFor, setPrefilledFor] = React.useState('')
  // Custom Request only — what the family actually needs (chips + free text).
  const [reqTags, setReqTags] = React.useState<string[]>([])
  const [requirement, setRequirement] = React.useState('')

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [ref, setRef] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (memberId || lovedOnes.length === 0) return
    const pm = params.get('member')
    if (pm && lovedOnes.some((l) => l.id === pm)) setMemberId(pm)
    else if (lovedOnes.length === 1) setMemberId(lovedOnes[0]!.id)
  }, [lovedOnes, params, memberId])

  React.useEffect(() => {
    const s = params.get('service')
    if (s && BOOKING_SERVICES.some((b) => b.id === s)) setServiceId(s)
  }, [params])

  const member = lovedOnes.find((l) => l.id === memberId)
  const service = BOOKING_SERVICES.find((s) => s.id === serviceId)
  const slotLabel = slotLabelOf(details.timeSlot)
  const firstName = member?.full_name?.split(/\s+/)[0] ?? ''

  // A Custom Request carries its own "what you need" step; the composed requirement
  // rides into the existing visit_special_instructions field (no backend change).
  const isCustom = serviceId === 'custom-request'
  const customRequirement = [reqTags.join(', '), requirement.trim()].filter(Boolean).join(' — ')
  const effectiveInstructions = isCustom ? customRequirement : details.specialInstructions
  const instructionsLabel = isCustom ? 'What you need' : 'Instructions'

  // Prefill from the member's saved profile (once per member) — prefer the saved
  // emergency contact as the on-site visit contact (often a local relative better
  // placed to coordinate access than the elder). Everything stays editable.
  React.useEffect(() => {
    if (!member || prefilledFor === member.id) return
    const ecName = member.emergency_contact_name?.trim()
    const ecPhone = member.emergency_contact_phone?.trim()
    const useEc = !!(ecName && ecPhone)
    setDetails({
      ...emptyVisitDetails,
      address: member.address?.trim() || '',
      contactName: useEc ? ecName! : (member.full_name?.trim() || ''),
      contactPhone: useEc ? ecPhone! : (member.phone_number?.trim() || ecPhone || ''),
    })
    setUpdateProfile(false)
    setPrefilledFor(member.id)
  }, [member, prefilledFor])

  function changePerson() { setMemberId(''); setPickChoice(member?.id ?? ''); setStep('type'); setPrefilledFor('') }
  function goFromType() { setError(''); if (!service) return setError('Please choose a visit type.'); setStep(isCustom ? 'requirement' : 'details') }
  function goFromRequirement() { setError(''); if (requirement.trim().length < 4) return setError('Please tell us what you need for this visit.'); setStep('details') }
  function goToReview() { setError(''); const err = visitDetailsError(details); if (err) return setError(err); setStep('review') }

  async function confirm() {
    if (!member || !service) return
    // Founder Funnel (pre-launch): registrants don't book — visits open at launch.
    if (isFounderFunnelGated(profile?.founder_prelaunch ?? false)) { setError(PRELAUNCH_BOOKING_NOTE); return }
    setError(''); setBusy(true)
    try {
      const res = await requestVisit({
        serviceId: service.id,
        lovedOneId: member.id,
        recipientName: member.full_name,
        requesterWhatsapp: profile?.whatsapp_number || profile?.phone || '',
        ...toVisitDetailInput({ ...details, specialInstructions: effectiveInstructions }),
      })
      // Opt-in only: persist to the durable profile. Address always; the visit
      // contact maps safely — the elder's own phone is filled only if empty, and a
      // different person is saved as the emergency (who-to-reach) contact.
      if (updateProfile) {
        const p: Partial<ReturnType<typeof memberToInput>> = {}
        const addr = details.address.trim()
        if (addr && addr !== (member.address ?? '').trim()) p.address = addr
        const cName = details.contactName.trim(); const cPhone = details.contactPhone.trim()
        const isMember = cName.toLowerCase() === member.full_name.trim().toLowerCase()
        if (isMember) { if (!member.phone_number?.trim() && cPhone) p.phone_number = cPhone }
        else if (cName && cPhone) { p.emergency_contact_name = cName; p.emergency_contact_phone = cPhone }
        if (Object.keys(p).length) {
          try { await updateFamilyMember(member.id, { ...memberToInput(member), ...p }) }
          catch (e) { console.error('[family-book] profile update failed (non-fatal):', e) }
        }
      }
      haptic('success'); setRef(res.ref)
    } catch (e) {
      console.error('[family-book] failed:', e)
      setBusy(false); setError('We couldn’t request the visit. Please try again.')
    }
  }

  // ── Success — shows the exact details submitted ─────────────────────────────
  if (ref && member && service) {
    const rows: [string, string | undefined][] = [
      ['Service', service.name],
      ['For', member.full_name],
      ['When', `${new Date(details.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${slotLabel}`],
      ['Address', details.address.trim()],
      ['Map link', details.mapLink.trim() || undefined],
      ['Landmark', details.landmark.trim() || undefined],
      ['Visit contact', `${details.contactName.trim()} · ${details.contactPhone.trim()}`],
      ['Access', details.accessInstructions.trim() || undefined],
      [instructionsLabel, effectiveInstructions.trim() || undefined],
      ['Notes for the team', details.teamNotes.trim() || undefined],
    ]
    return (
      <div className="ce-fade-in mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line/70 bg-card px-6 py-10 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-success/12 text-success"><CheckCircle2 className="h-9 w-9" strokeWidth={1.5} /></span>
          <h1 className="text-h3 text-ink">Visit requested</h1>
          <p className="max-w-sm text-body text-muted">
            Your Presence Manager will confirm {firstName}’s {service.name.toLowerCase()} shortly. Your reference is <span className="font-semibold text-ink">{ref}</span>.
          </p>
        </div>
        <section className="rounded-lg border border-line/70 bg-card p-5 shadow-sm sm:p-6">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Your visit details</p>
          <dl className="mt-3 divide-y divide-line">
            {rows.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-body-sm text-muted">{label}</dt>
                <dd className="min-w-0 whitespace-pre-line text-right text-body-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <Button asChild size="lg" className="w-full sm:w-auto sm:self-start"><Link href="/family/visits">View visits</Link></Button>
      </div>
    )
  }

  // ── Loading loved ones ──────────────────────────────────────────────────────
  if (loading && lovedOnes.length === 0) {
    return <div className="grid place-items-center rounded-lg border border-line/70 bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  // ── No family member yet ────────────────────────────────────────────────────
  if (lovedOnes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Book a visit" subtitle="Trusted human presence for the people you love." />
        <section className="flex flex-col items-center rounded-lg border border-line/70 bg-card px-6 py-14 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-green"><UserPlus className="h-8 w-8" strokeWidth={1.5} /></span>
          <h2 className="mt-5 text-h3 text-ink">Add a family member first</h2>
          <p className="mt-2 max-w-sm text-body text-muted">Visits are booked for someone in your family. Add them once and we’ll prefill their details every time.</p>
          <Button asChild size="lg" className="mt-6"><Link href="/family/add"><UserPlus className="h-5 w-5" strokeWidth={2} /> Add a family member</Link></Button>
        </section>
      </div>
    )
  }

  // ── Member picker ───────────────────────────────────────────────────────────
  if (!member) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <Link href="/family/visits" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to visits</Link>
        <PageHeader title="Book a visit" subtitle="Who is this visit for?" />
        <div className="flex flex-col gap-3">
          {lovedOnes.map((l) => {
            const on = l.id === pickChoice
            return (
              <button key={l.id} type="button" onClick={() => setPickChoice(l.id)} className={cn('flex items-center gap-3 rounded-lg border-2 bg-card px-4 py-3 text-left transition-colors', on ? 'border-green bg-accent-soft/30' : 'border-line hover:border-ink/20')}>
                <Avatar initials={initialsOf(l.full_name)} size="md" tone={on ? 'solid' : 'soft'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{l.full_name}</p>
                  {memberMeta(l) && <p className="truncate text-caption text-muted">{memberMeta(l)}</p>}
                </div>
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border', on ? 'border-green bg-green text-white' : 'border-line')}>{on && <Check className="h-3 w-3" strokeWidth={3} />}</span>
              </button>
            )
          })}
        </div>
        <Button size="lg" className="w-full sm:w-auto sm:self-start" disabled={!pickChoice} onClick={() => { setMemberId(pickChoice); setPrefilledFor('') }}>
          Continue <ArrowRight className="h-5 w-5" strokeWidth={2} />
        </Button>
      </div>
    )
  }

  // ── Stepped booking (member resolved) ───────────────────────────────────────
  const backTo: Step | null =
    step === 'type' ? null : step === 'requirement' ? 'type' : step === 'details' ? (isCustom ? 'requirement' : 'type') : 'details'
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-7">
      <div>
        {backTo ? (
          <button type="button" onClick={() => { setError(''); setStep(backTo) }} className="mb-3 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back</button>
        ) : (
          <Link href="/family/visits" className="mb-3 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to visits</Link>
        )}
        <PageHeader title="Book a visit" subtitle={`For ${member.full_name}`} />
        {lovedOnes.length > 1 && step === 'type' && (
          <button type="button" onClick={changePerson} className="mt-2 text-caption font-semibold text-green hover:underline">Change person</button>
        )}
        <div className="mt-4"><BookingSteps step={step} custom={isCustom} /></div>
      </div>

      {step === 'type' && (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-h4 text-ink">What kind of visit?</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {BOOKING_SERVICES.map((s) => (
                <OptionCard
                  key={s.id}
                  icon={s.icon}
                  title={s.name}
                  description={s.blurb}
                  meta={<>Starting at <span className="font-semibold text-ink">{s.priceFrom}</span></>}
                  selected={serviceId === s.id}
                  onClick={() => setServiceId(s.id)}
                />
              ))}
            </div>
          </section>
          {error && <p className="text-caption text-error">{error}</p>}
          <Button size="lg" className="w-full sm:w-auto sm:self-start" onClick={goFromType}>Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></Button>
        </>
      )}

      {step === 'requirement' && (
        <>
          <div>
            <h2 className="text-h4 text-ink">What do you need?</h2>
            <p className="mt-1 text-body-sm text-muted">Tell us what {firstName} needs for this visit, so your Guardian arrives ready to help.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {CUSTOM_NEEDS.map((c) => (
              <Chip key={c} selected={reqTags.includes(c)} onClick={() => setReqTags((t) => (t.includes(c) ? t.filter((x) => x !== c) : [...t, c]))}>{c}</Chip>
            ))}
          </div>
          <Field label="Describe the request" htmlFor="v-req" hint="The more detail you give, the better we can help.">
            <Textarea id="v-req" value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={4} placeholder="e.g. Pick up this month’s medicines from Apollo Pharmacy and drop them home; please check the BP monitor is working." />
          </Field>
          {error && <p className="text-caption text-error">{error}</p>}
          <Button size="lg" className="w-full sm:w-auto sm:self-start" onClick={goFromRequirement}>Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></Button>
        </>
      )}

      {step === 'details' && (
        <>
          <div>
            <h2 className="text-h4 text-ink">Details for this visit</h2>
            <p className="mt-1 text-body-sm text-muted">Prefilled from {firstName}’s profile — review and edit anything for this visit.</p>
          </div>
          {isCustom && customRequirement && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-accent-soft/30 p-4">
              <div className="min-w-0">
                <p className="text-caption font-semibold uppercase tracking-wide text-green">What you need</p>
                <p className="mt-1 whitespace-pre-line text-body-sm text-ink">{customRequirement}</p>
              </div>
              <button type="button" onClick={() => { setError(''); setStep('requirement') }} className="shrink-0 text-caption font-semibold text-green hover:underline">Edit</button>
            </div>
          )}
          <VisitDetailsForm value={details} onChange={patch} allowsEmergency={!!service?.allowsEmergency} hideSpecialInstructions={isCustom} />

          {/* Opt-in — profile stays separate unless the family chooses to save. */}
          <button type="button" role="checkbox" aria-checked={updateProfile} onClick={() => setUpdateProfile((v) => !v)} className="flex items-start gap-3 rounded-lg border border-line bg-card p-4 text-left transition-colors hover:border-ink/20">
            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition-colors', updateProfile ? 'border-green bg-green text-white' : 'border-line')}>
              {updateProfile && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-body-sm font-medium text-ink">Save these details to {firstName}’s profile</span>
              <span className="block text-caption text-muted">Their address and this contact, so we prefill next time. Otherwise these apply to this visit only.</span>
            </span>
          </button>

          {error && <p className="text-caption text-error">{error}</p>}
          <Button size="lg" className="w-full sm:w-auto sm:self-start" onClick={goToReview}>Review booking <ArrowRight className="h-5 w-5" strokeWidth={2} /></Button>
        </>
      )}

      {step === 'review' && service && (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-h4 text-ink">Review your booking</h2>
            <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-sm">
              {([
                ['Visit type', service.name],
                ['For', member.full_name],
                ['Address', details.address.trim()],
                ['Map link', details.mapLink.trim() || undefined],
                ['Landmark', details.landmark.trim() || undefined],
                ['Visit contact', `${details.contactName.trim()} · ${details.contactPhone.trim()}`],
                ['When', `${new Date(details.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${slotLabel}`],
                ['Access', details.accessInstructions.trim() || undefined],
                [instructionsLabel, effectiveInstructions.trim() || undefined],
                ['Notes for the team', details.teamNotes.trim() || undefined],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value], i) => (
                <div key={label} className={cn('flex items-start justify-between gap-4 px-5 py-3.5', i > 0 && 'border-t border-line')}>
                  <span className="flex shrink-0 items-center gap-2 text-body-sm text-muted">
                    {label === 'Address' && <MapPin className="h-4 w-4 text-green" strokeWidth={1.75} />}{label}
                  </span>
                  <span className="min-w-0 whitespace-pre-line text-right text-body-sm font-medium text-ink">{value}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => { setError(''); setStep('details') }} className="inline-flex items-center gap-1.5 self-start text-caption font-semibold text-green hover:underline">
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Edit details
            </button>
          </section>

          <div className="rounded-lg border border-accent/40 bg-accent-soft/40 px-5 py-4">
            <p className="text-body-sm text-ink">Nothing is charged now. Your Presence Manager confirms availability, then sends a secure payment link.</p>
          </div>

          {error && <p className="text-caption text-error">{error}</p>}
          <Button size="lg" className="w-full sm:w-auto sm:self-start" disabled={busy} onClick={confirm}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Requesting…</> : <><CalendarCheck className="h-5 w-5" strokeWidth={1.75} /> Confirm booking</>}
          </Button>
        </>
      )}
    </div>
  )
}
