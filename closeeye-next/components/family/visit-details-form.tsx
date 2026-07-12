'use client'

import { Field, Input, Textarea } from '@/components/ui/field'
import { Chip } from '@/components/ui/choice'
import { TIME_SLOTS } from '@/features/booking/schema'
import type { VisitDetailInput } from '@/features/booking/api'

/** The visit-specific logistics the family provides for a booking, shared by the
 *  create flow (/family/book) and the edit surface (/family/visits/[id]). */
export interface VisitDetailsState {
  address: string
  landmark: string
  contactName: string
  contactPhone: string
  date: string
  timeSlot: string
  specialInstructions: string
  accessInstructions: string
  teamNotes: string
  mapLink: string
}

export const emptyVisitDetails: VisitDetailsState = {
  address: '', landmark: '', contactName: '', contactPhone: '', date: '', timeSlot: '',
  specialInstructions: '', accessInstructions: '', teamNotes: '', mapLink: '',
}

export const todayISO = () => new Date().toISOString().slice(0, 10)

function normalizeMobile(p: string): string {
  const d = p.replace(/\D/g, '')
  return d.length === 12 && d.startsWith('91') ? d.slice(2) : d
}
export const isValidMobile = (p: string) => /^[6-9]\d{9}$/.test(normalizeMobile(p))

export function slotLabelOf(id: string): string | undefined {
  const s = TIME_SLOTS.find((t) => t.id === id)
  return s ? `${s.label} (${s.note})` : undefined
}

/** Reverse a stored "Morning (8am – 12pm)" back to its slot id. */
export function slotIdFromLabel(label?: string | null): string {
  if (!label) return ''
  return TIME_SLOTS.find((t) => label.startsWith(t.label))?.id ?? ''
}

export function visitDetailsValid(d: VisitDetailsState): boolean {
  return (
    d.address.trim().length >= 6 &&
    d.contactName.trim().length >= 2 &&
    isValidMobile(d.contactPhone) &&
    !!d.date && d.date >= todayISO() &&
    !!d.timeSlot
  )
}

/** First failing rule as a friendly message, or null when valid. */
export function visitDetailsError(d: VisitDetailsState): string | null {
  if (d.address.trim().length < 6) return 'Please enter a full visit address so the Guardian can arrive.'
  if (d.contactName.trim().length < 2) return 'Please add a contact person for the visit.'
  if (!isValidMobile(d.contactPhone)) return 'Please enter a valid 10-digit contact number.'
  if (!d.date) return 'Please pick a preferred date.'
  if (d.date < todayISO()) return 'Please pick a date that isn’t in the past.'
  if (!d.timeSlot) return 'Please pick a preferred time.'
  return null
}

/** Map the form state to the booking API input. */
export function toVisitDetailInput(d: VisitDetailsState): VisitDetailInput {
  return {
    recipientAddress: d.address.trim(),
    date: d.date,
    timeSlotLabel: slotLabelOf(d.timeSlot),
    landmark: d.landmark,
    contactName: d.contactName,
    contactPhone: d.contactPhone,
    specialInstructions: d.specialInstructions,
    accessInstructions: d.accessInstructions,
    teamNotes: d.teamNotes,
    mapLink: d.mapLink,
  }
}

export function VisitDetailsForm({ value, onChange, allowsEmergency, hideSpecialInstructions, savedAddress }: {
  value: VisitDetailsState
  onChange: (patch: Partial<VisitDetailsState>) => void
  allowsEmergency: boolean
  /** Custom Requests capture the task in their own step, so hide the generic field. */
  hideSpecialInstructions?: boolean
  /** When the visit address is prefilled from a loved one's saved profile, show a
   *  gentle "using their saved address" note so it reads as reuse, not re-entry. */
  savedAddress?: { value: string; name: string }
}) {
  const slots = TIME_SLOTS.filter((t) => !t.emergencyOnly || allowsEmergency)
  const reusedAddress =
    !!savedAddress && value.address.trim().length > 0 && value.address.trim() === savedAddress.value.trim()
  return (
    <div className="flex flex-col gap-5">
      <Field label="Visit address" htmlFor="v-address" hint="Where the Guardian should go.">
        <Textarea id="v-address" value={value.address} onChange={(e) => onChange({ address: e.target.value })} rows={2} placeholder="Flat / house no., street, area, city, PIN" />
        {reusedAddress && (
          <p className="mt-1.5 text-caption text-green">Using {savedAddress!.name}&rsquo;s saved address — edit above if this visit is somewhere else.</p>
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Landmark" htmlFor="v-landmark" optional>
          <Input id="v-landmark" value={value.landmark} onChange={(e) => onChange({ landmark: e.target.value })} placeholder="e.g. Opposite the temple" />
        </Field>
        <Field label="Map location link" htmlFor="v-map" optional hint="Paste a Google Maps pin — the surest way to find them.">
          <Input id="v-map" type="url" inputMode="url" value={value.mapLink} onChange={(e) => onChange({ mapLink: e.target.value })} placeholder="https://maps.app.goo.gl/…" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact person for the visit" htmlFor="v-cname">
          <Input id="v-cname" value={value.contactName} onChange={(e) => onChange({ contactName: e.target.value })} placeholder="Who the Guardian meets" autoComplete="name" />
        </Field>
        <Field label="Contact phone number" htmlFor="v-cphone">
          <Input id="v-cphone" type="tel" inputMode="tel" value={value.contactPhone} onChange={(e) => onChange({ contactPhone: e.target.value })} placeholder="10-digit mobile" autoComplete="tel" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Preferred date" htmlFor="v-date">
          <Input id="v-date" type="date" min={todayISO()} value={value.date} onChange={(e) => onChange({ date: e.target.value })} />
        </Field>
        <Field label="Preferred time window">
          <div className="flex flex-wrap gap-2.5">
            {slots.map((t) => (
              <Chip key={t.id} selected={value.timeSlot === t.id} onClick={() => onChange({ timeSlot: t.id })}>
                {t.label} <span className="font-normal text-muted">· {t.note}</span>
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Access instructions" htmlFor="v-access" optional hint="Gate code, which floor, lift or stairs, who to ask for.">
        <Textarea id="v-access" value={value.accessInstructions} onChange={(e) => onChange({ accessInstructions: e.target.value })} rows={2} placeholder="e.g. 3rd floor, no lift. Ring bell twice." />
      </Field>
      {!hideSpecialInstructions && (
        <Field label="Special instructions for this visit" htmlFor="v-special" optional hint="A task or preference for the Guardian.">
          <Textarea id="v-special" value={value.specialInstructions} onChange={(e) => onChange({ specialInstructions: e.target.value })} rows={2} placeholder="e.g. Please check the medicine box and go for a short walk." />
        </Field>
      )}
      <Field label="Notes for the CloseEye team" htmlFor="v-team" optional hint="Anything your Presence Manager should know.">
        <Textarea id="v-team" value={value.teamNotes} onChange={(e) => onChange({ teamNotes: e.target.value })} rows={2} placeholder="e.g. Please call me before the visit." />
      </Field>
    </div>
  )
}
