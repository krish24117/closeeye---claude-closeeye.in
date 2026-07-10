'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarCheck, Check, CheckCircle2, Loader2, MapPin, Pencil, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/family/avatar'
import { OptionCard, Chip } from '@/components/ui/choice'
import { Field, Input, Textarea } from '@/components/ui/field'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { BOOKING_SERVICES, TIME_SLOTS } from '@/features/booking/schema'
import { requestVisit } from '@/features/booking/api'
import { updateFamilyMember } from '@/lib/db/family'
import type { LovedOne } from '@/lib/db/types'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const todayISO = () => new Date().toISOString().slice(0, 10)
const memberMeta = (m: { relationship: string | null; city: string | null }) => [m.relationship, m.city].filter(Boolean).join(' · ')

/** Normalise + validate an Indian mobile number (accepts +91 / spaces). */
function normalizeMobile(p: string): string {
  const d = p.replace(/\D/g, '')
  return d.length === 12 && d.startsWith('91') ? d.slice(2) : d
}
const isValidMobile = (p: string) => /^[6-9]\d{9}$/.test(normalizeMobile(p))

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

type Step = 'type' | 'details' | 'review'

function BookingSteps({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'type', label: 'Visit type' },
    { id: 'details', label: 'Visit details' },
    { id: 'review', label: 'Review' },
  ]
  const idx = steps.findIndex((s) => s.id === step)
  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${idx + 1} of 3`}>
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 text-caption font-medium', i <= idx ? 'text-green' : 'text-muted/60')}>
            <span
              aria-current={i === idx ? 'step' : undefined}
              className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold', i < idx ? 'bg-green text-ivory' : i === idx ? 'bg-accent-soft text-green ring-1 ring-green' : 'bg-ink/[0.06] text-muted')}
            >
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

  // Visit details — reviewed + provided EVERY booking; never silently reused.
  const [address, setAddress] = React.useState('')
  const [landmark, setLandmark] = React.useState('')
  const [contactName, setContactName] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [date, setDate] = React.useState('')
  const [timeSlot, setTimeSlot] = React.useState('')
  const [specialInstructions, setSpecialInstructions] = React.useState('')
  const [accessInstructions, setAccessInstructions] = React.useState('')
  const [teamNotes, setTeamNotes] = React.useState('')
  const [updateProfile, setUpdateProfile] = React.useState(false)
  const [prefilledFor, setPrefilledFor] = React.useState('')

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
  const slots = TIME_SLOTS.filter((t) => !t.emergencyOnly || service?.allowsEmergency)
  const chosenSlot = TIME_SLOTS.find((t) => t.id === timeSlot)
  const slotLabel = chosenSlot ? `${chosenSlot.label} (${chosenSlot.note})` : undefined
  const firstName = member?.full_name?.split(/\s+/)[0] ?? ''

  // Prefill the visit details from the member's saved profile (once per member) —
  // the family can edit anything; nothing is written back unless they opt in.
  React.useEffect(() => {
    if (!member || prefilledFor === member.id) return
    setAddress(member.address?.trim() || '')
    setContactName(member.full_name?.trim() || '')
    setContactPhone(member.phone_number?.trim() || member.emergency_contact_phone?.trim() || '')
    setLandmark(''); setDate(''); setTimeSlot(''); setSpecialInstructions(''); setAccessInstructions(''); setTeamNotes('')
    setUpdateProfile(false)
    setPrefilledFor(member.id)
  }, [member, prefilledFor])

  const detailsValid =
    address.trim().length >= 6 && contactName.trim().length >= 2 && isValidMobile(contactPhone) && !!date && date >= todayISO() && !!timeSlot

  function changePerson() {
    setMemberId(''); setPickChoice(member?.id ?? ''); setStep('type'); setPrefilledFor('')
  }

  function goToDetails() {
    setError('')
    if (!service) return setError('Please choose a visit type.')
    setStep('details')
  }

  function goToReview() {
    setError('')
    if (address.trim().length < 6) return setError('Please enter a full visit address so the Guardian can arrive.')
    if (contactName.trim().length < 2) return setError('Please add a contact person for the visit.')
    if (!isValidMobile(contactPhone)) return setError('Please enter a valid 10-digit contact number.')
    if (!date) return setError('Please pick a preferred date.')
    if (date < todayISO()) return setError('Please pick a date that isn’t in the past.')
    if (!timeSlot) return setError('Please pick a preferred time.')
    setStep('review')
  }

  async function confirm() {
    if (!member || !service) return
    setError('')
    setBusy(true)
    try {
      const res = await requestVisit({
        serviceId: service.id,
        lovedOneId: member.id,
        recipientName: member.full_name,
        recipientAddress: address.trim(),
        requesterWhatsapp: profile?.whatsapp_number || profile?.phone || '',
        date,
        timeSlotLabel: slotLabel,
        landmark: landmark.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        accessInstructions: accessInstructions.trim() || undefined,
        teamNotes: teamNotes.trim() || undefined,
      })
      // Opt-in only: persist the address to the member's durable profile.
      if (updateProfile && address.trim() && address.trim() !== (member.address ?? '').trim()) {
        try { await updateFamilyMember(member.id, { ...memberToInput(member), address: address.trim() }) }
        catch (e) { console.error('[family-book] profile update failed (non-fatal):', e) }
      }
      haptic('success')
      setRef(res.ref)
    } catch (e) {
      console.error('[family-book] failed:', e)
      setBusy(false)
      setError('We couldn’t request the visit. Please try again.')
    }
  }

  // ── Success — shows the exact details submitted ─────────────────────────────
  if (ref && member && service) {
    const rows: [string, string | undefined][] = [
      ['Service', service.name],
      ['For', member.full_name],
      ['When', `${new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${slotLabel}`],
      ['Address', address.trim()],
      ['Landmark', landmark.trim() || undefined],
      ['Visit contact', `${contactName.trim()} · ${contactPhone.trim()}`],
      ['Access', accessInstructions.trim() || undefined],
      ['Instructions', specialInstructions.trim() || undefined],
      ['Notes for the team', teamNotes.trim() || undefined],
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
                <dd className="min-w-0 text-right text-body-sm font-medium text-ink">{value}</dd>
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
  const backTo = step === 'type' ? null : step === 'details' ? 'type' : 'details'
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
        <div className="mt-4"><BookingSteps step={step} /></div>
      </div>

      {/* ── Step 1: Visit type ── */}
      {step === 'type' && (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-h4 text-ink">What kind of visit?</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {BOOKING_SERVICES.map((s) => (
                <OptionCard key={s.id} icon={s.icon} title={s.name} description={s.blurb} selected={serviceId === s.id} onClick={() => setServiceId(s.id)} />
              ))}
            </div>
          </section>
          {error && <p className="text-caption text-error">{error}</p>}
          <Button size="lg" className="w-full sm:w-auto sm:self-start" onClick={goToDetails}>
            Continue <ArrowRight className="h-5 w-5" strokeWidth={2} />
          </Button>
        </>
      )}

      {/* ── Step 2: Visit details ── */}
      {step === 'details' && (
        <>
          <section className="flex flex-col gap-5">
            <div>
              <h2 className="text-h4 text-ink">Details for this visit</h2>
              <p className="mt-1 text-body-sm text-muted">Prefilled from {firstName}’s profile — review and edit anything for this visit.</p>
            </div>

            <Field label="Visit address" htmlFor="address" hint="Where the Guardian should go.">
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Flat / house no., street, area, city, PIN" />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Landmark" htmlFor="landmark" optional>
                <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Opposite the temple" />
              </Field>
              <Field label="Contact person for the visit" htmlFor="contactName">
                <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Who the Guardian meets" autoComplete="name" />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Contact phone number" htmlFor="contactPhone">
                <Input id="contactPhone" type="tel" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="10-digit mobile" autoComplete="tel" />
              </Field>
              <Field label="Preferred date" htmlFor="date">
                <Input id="date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>

            <Field label="Preferred time window">
              <div className="flex flex-wrap gap-2.5">
                {slots.map((t) => (
                  <Chip key={t.id} selected={timeSlot === t.id} onClick={() => setTimeSlot(t.id)}>
                    {t.label} <span className="font-normal text-muted">· {t.note}</span>
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Building / access instructions" htmlFor="access" optional hint="Gate code, which floor, lift or stairs, who to ask for.">
              <Textarea id="access" value={accessInstructions} onChange={(e) => setAccessInstructions(e.target.value)} rows={2} placeholder="e.g. 3rd floor, no lift. Ring bell twice." />
            </Field>

            <Field label="Special instructions for this visit" htmlFor="special" optional hint="A task or preference for the Guardian.">
              <Textarea id="special" value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} placeholder="e.g. Please check the medicine box and go for a short walk." />
            </Field>

            <Field label="Notes for the CloseEye team" htmlFor="team" optional hint="Anything your Presence Manager should know.">
              <Textarea id="team" value={teamNotes} onChange={(e) => setTeamNotes(e.target.value)} rows={2} placeholder="e.g. Please call me before the visit." />
            </Field>

            {/* Opt-in — profile stays separate unless the family chooses to save. */}
            <button type="button" onClick={() => setUpdateProfile((v) => !v)} className="flex items-start gap-3 rounded-lg border border-line bg-card p-4 text-left transition-colors hover:border-ink/20">
              <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition-colors', updateProfile ? 'border-green bg-green text-white' : 'border-line')}>
                {updateProfile && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-body-sm font-medium text-ink">Save this address to {firstName}’s profile</span>
                <span className="block text-caption text-muted">We’ll prefill it next time. Otherwise these details apply to this visit only.</span>
              </span>
            </button>
          </section>

          {error && <p className="text-caption text-error">{error}</p>}
          <Button size="lg" className="w-full sm:w-auto sm:self-start" onClick={goToReview}>
            Review booking <ArrowRight className="h-5 w-5" strokeWidth={2} />
          </Button>
        </>
      )}

      {/* ── Step 3: Review ── */}
      {step === 'review' && service && (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-h4 text-ink">Review your booking</h2>
            <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-sm">
              {([
                ['Visit type', service.name],
                ['For', member.full_name],
                ['Address', address.trim()],
                ['Landmark', landmark.trim() || undefined],
                ['Visit contact', `${contactName.trim()} · ${contactPhone.trim()}`],
                ['When', `${new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · ${slotLabel}`],
                ['Access', accessInstructions.trim() || undefined],
                ['Instructions', specialInstructions.trim() || undefined],
                ['Notes for the team', teamNotes.trim() || undefined],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value], i) => (
                <div key={label} className={cn('flex items-start justify-between gap-4 px-5 py-3.5', i > 0 && 'border-t border-line')}>
                  <span className="flex shrink-0 items-center gap-2 text-body-sm text-muted">
                    {label === 'Address' && <MapPin className="h-4 w-4 text-green" strokeWidth={1.75} />}{label}
                  </span>
                  <span className="min-w-0 text-right text-body-sm font-medium text-ink">{value}</span>
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
