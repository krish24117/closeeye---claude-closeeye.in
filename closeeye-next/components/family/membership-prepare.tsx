'use client'

import * as React from 'react'
import { ArrowLeft, ArrowRight, Check, HeartHandshake, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Chip } from '@/components/ui/choice'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchElderProfile, upsertElderProfile, type ElderProfileForm } from '@/lib/db/family'
import { recordConsent } from '@/lib/db/consent'
import { RELATIONSHIPS } from '@/features/booking/schema'
import type { LovedOne, NewLovedOne } from '@/lib/db/types'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const EMPTY_WELLBEING: ElderProfileForm = {
  food_preferences: '', conversation_interests: '', daily_routine: '', things_to_avoid: '',
  medical_conditions: '', allergies: '', current_medications: [], doctor_name: '', doctor_phone: '',
  pinned_note: '', photo_consent: false,
}

/** A full NewLovedOne from an existing record, so an address update never wipes the
 *  other saved columns (updateFamilyMember writes the whole row). */
function loToInput(lo: LovedOne): NewLovedOne {
  return {
    full_name: lo.full_name,
    relationship: lo.relationship ?? '',
    age: lo.age,
    city: lo.city ?? '',
    address: lo.address ?? '',
    phone_number: lo.phone_number ?? '',
    medical_notes: lo.medical_notes ?? '',
    doctor_name: lo.doctor_name ?? '',
    nearest_hospital: lo.nearest_hospital ?? '',
    emergency_contact_name: lo.emergency_contact_name ?? '',
    emergency_contact_phone: lo.emergency_contact_phone ?? '',
  }
}

/**
 * The pre-payment gate for membership. Before we take a family's money we make sure we
 * can actually care for their loved one: the logistics we need (who, where) are
 * REQUIRED; the wellbeing/health records are a warm, skippable nudge (consent-safe).
 * Reuses the loved_ones + elder_profiles stores; changes no pricing/payment logic —
 * it just runs before payForMembership. `onReady` fires once everything is saved.
 */
export function MembershipPrepare({
  plan,
  onReady,
  onCancel,
}: {
  plan: { name: string; short: string; price: string }
  onReady: () => void
  onCancel: () => void
}) {
  const { lovedOnes, addLovedOne, editFamilyMember, refresh } = useFamilyData()
  const existing = lovedOnes[0] ?? null
  const isNew = !existing

  // ── Logistics (required) ───────────────────────────────────────────────────
  const [fullName, setFullName] = React.useState(existing?.full_name ?? '')
  const [relationship, setRelationship] = React.useState(existing?.relationship ?? '')
  const [city, setCity] = React.useState(existing?.city ?? '')
  const [address, setAddress] = React.useState(existing?.address ?? '')

  // ── Wellbeing (nudged, skippable) ──────────────────────────────────────────
  const [form, setForm] = React.useState<ElderProfileForm>(EMPTY_WELLBEING)
  const [meds, setMeds] = React.useState('')
  const [consent, setConsent] = React.useState(false)
  const [loadingWb, setLoadingWb] = React.useState(!!existing)

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [skipAck, setSkipAck] = React.useState(false) // shown once if they try to skip wellbeing

  React.useEffect(() => {
    if (!existing) return
    let alive = true
    fetchElderProfile(existing.id)
      .then((ep) => {
        if (!alive) return
        setForm(ep)
        setMeds(ep.current_medications.join('\n'))
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingWb(false) })
    return () => { alive = false }
  }, [existing])

  const first = fullName.trim().split(/\s+/)[0] || 'them'
  const setF = <K extends keyof ElderProfileForm>(k: K, v: ElderProfileForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const hasWellbeing = !!(
    form.medical_conditions.trim() || meds.trim() || form.allergies.trim() || form.things_to_avoid.trim() ||
    form.daily_routine.trim() || form.conversation_interests.trim() || form.food_preferences.trim()
  )

  async function continueToPayment() {
    setError('')
    // 1 — logistics we genuinely need to send a Guardian
    if (fullName.trim().length < 2) return setError('Please tell us their name so we know who we’re caring for.')
    if (!relationship) return setError('Please tell us who this is for.')
    if (city.trim().length < 2) return setError('Which city are they in?')
    if (address.trim().length < 6) return setError(`We’ll need this so your Guardian can reach ${first}.`)
    // 2 — wellbeing: a warm nudge, but skippable. Ask once, then let them through.
    if (!hasWellbeing && !skipAck) { setSkipAck(true); return }
    // 3 — consent only matters if they actually shared wellbeing details
    if (hasWellbeing && !consent) return setError(`Please confirm we can keep these details to care for ${first}.`)

    setBusy(true)
    try {
      let lovedOneId = existing?.id
      if (isNew) {
        const created = await addLovedOne({ full_name: fullName.trim(), relationship, city: city.trim(), address: address.trim() })
        lovedOneId = created.id
      } else {
        await editFamilyMember(existing!.id, { ...loToInput(existing!), full_name: fullName.trim(), relationship, city: city.trim(), address: address.trim() })
      }
      if (hasWellbeing && lovedOneId) {
        await upsertElderProfile(
          lovedOneId,
          { ...form, current_medications: meds.split('\n').map((m) => m.trim()).filter(Boolean) },
          { name: fullName.trim(), age: existing?.age ?? null },
        )
        // Durable, auditable consent record (best-effort — never block payment on it).
        try { await recordConsent({ lovedOneId }) } catch (err) { console.error('[membership-prepare] consent record failed (non-fatal):', err) }
      }
      await refresh()
      haptic('success')
      onReady()
    } catch (e) {
      console.error('[membership-prepare] save failed:', e)
      setBusy(false)
      setError('We couldn’t save these details. Please try again.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-7">
      <div>
        <button type="button" onClick={onCancel} disabled={busy} className="mb-3 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink disabled:opacity-50">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to plans
        </button>
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Before we begin</p>
        <h1 className="mt-1.5 text-h3 text-ink">{isNew ? 'Tell us about your family' : `Let’s care for ${first} well`}</h1>
        <p className="mt-2 text-body-sm text-muted">
          A moment to set up your <span className="font-semibold text-ink">{plan.name}</span> — then we’ll take you to payment.
        </p>
      </div>

      {/* ── The loved one (required) ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-5 rounded-lg border border-line/70 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><HeartHandshake className="h-5 w-5" strokeWidth={1.5} /></span>
          <h2 className="text-h4 text-ink">Who we’re caring for</h2>
        </div>

        <Field label="Their name" htmlFor="mp-name">
          <Input id="mp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Anjali Rao" autoComplete="name" />
        </Field>

        <Field label="Who is this for?">
          <div className="flex flex-wrap gap-2.5">
            {RELATIONSHIPS.map((r) => (
              <Chip key={r} selected={relationship === r} onClick={() => setRelationship(r)}>{r}</Chip>
            ))}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="City" htmlFor="mp-city">
            <Input id="mp-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" />
          </Field>
        </div>

        <Field label="Address" htmlFor="mp-address" hint="Where a Guardian would visit.">
          <Textarea id="mp-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Flat / house no., street, area, city, PIN" />
        </Field>
      </section>

      {/* ── Wellbeing (a warm, skippable nudge) ──────────────────────────────── */}
      <section className="flex flex-col gap-5 rounded-lg border border-green/20 bg-accent-soft/30 p-6 shadow-sm">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green text-ivory"><ShieldCheck className="h-5 w-5" strokeWidth={1.5} /></span>
          <div>
            <h2 className="text-h4 text-ink">Help us know {first}</h2>
            <p className="mt-1 text-body-sm text-muted">
              These help us understand {first} better — so in an emergency we can act fast, and Close Eye Connect gives
              you better, more personal answers over time. Share what you can; you can always add more later.
            </p>
          </div>
        </div>

        {loadingWb ? (
          <div className="grid place-items-center py-6"><Loader2 className="h-5 w-5 animate-spin text-green" strokeWidth={2} /></div>
        ) : (
          <>
            <Field label="Health conditions" htmlFor="mp-cond" optional>
              <Textarea id="mp-cond" value={form.medical_conditions} onChange={(e) => setF('medical_conditions', e.target.value)} rows={2} placeholder="e.g. Type-2 diabetes, mild knee stiffness — uses a walking stick" />
            </Field>
            <Field label="Medications" htmlFor="mp-meds" optional hint="One per line.">
              <Textarea id="mp-meds" value={meds} onChange={(e) => setMeds(e.target.value)} rows={2} placeholder={'BP tablet — morning\nVitamin D — weekly'} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Allergies" htmlFor="mp-allergy" optional>
                <Input id="mp-allergy" value={form.allergies} onChange={(e) => setF('allergies', e.target.value)} placeholder="e.g. Penicillin" autoComplete="off" />
              </Field>
              <Field label="Things to avoid" htmlFor="mp-avoid" optional>
                <Input id="mp-avoid" value={form.things_to_avoid} onChange={(e) => setF('things_to_avoid', e.target.value)} placeholder="e.g. Long stairs" autoComplete="off" />
              </Field>
            </div>
            <Field label="Daily routine" htmlFor="mp-routine" optional>
              <Textarea id="mp-routine" value={form.daily_routine} onChange={(e) => setF('daily_routine', e.target.value)} rows={2} placeholder="e.g. Morning walk, rest after lunch, tea around 5 pm" />
            </Field>
            <Field label="Loves talking about" htmlFor="mp-conv" optional>
              <Input id="mp-conv" value={form.conversation_interests} onChange={(e) => setF('conversation_interests', e.target.value)} placeholder="e.g. Old cricket days, the grandchildren" autoComplete="off" />
            </Field>
            <Field label="Food & drink they like" htmlFor="mp-food" optional>
              <Input id="mp-food" value={form.food_preferences} onChange={(e) => setF('food_preferences', e.target.value)} placeholder="e.g. Telugu meals, filter coffee in the morning" autoComplete="off" />
            </Field>

            {/* Consent — only meaningful once they’ve shared something. */}
            <button
              type="button"
              role="checkbox"
              aria-checked={consent}
              onClick={() => setConsent((v) => !v)}
              className="flex items-start gap-3 rounded-lg border border-line bg-card p-4 text-left transition-colors hover:border-green/40"
            >
              <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition-colors', consent ? 'border-green bg-green text-white' : 'border-line')}>
                {consent && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 text-body-sm text-ink">
                I agree Close Eye can securely keep these wellbeing details to care for {first}. Only our care team sees them.
              </span>
            </button>
          </>
        )}
      </section>

      {/* Skip nudge — shown once if they try to continue with nothing shared. */}
      {skipAck && !hasWellbeing && (
        <div className="rounded-lg border border-green/30 bg-accent-soft/40 p-4">
          <p className="text-body-sm text-ink">
            You haven’t shared anything about {first} yet. Even a line or two helps us care better — and act faster in an
            emergency. You can add it now, or continue and add it anytime from their profile.
          </p>
        </div>
      )}

      {error && <p className="text-caption text-error">{error}</p>}

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
        <Button variant="secondary" className="sm:w-auto" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button className="sm:w-auto" disabled={busy} onClick={continueToPayment}>
          {busy ? (
            <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</>
          ) : (
            <>Continue to payment · {plan.price}/mo <ArrowRight className="h-5 w-5" strokeWidth={2} /></>
          )}
        </Button>
      </div>
    </div>
  )
}
