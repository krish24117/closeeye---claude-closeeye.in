import { supabase } from '@/lib/supabase'
import type { BookingData } from './schema'
import { serviceById, TIME_SLOTS } from './schema'
import { SITE, whatsappLink } from '@/lib/site'

export interface BookingResult {
  ref: string
}

/** Wizard service ids → the edge function's canonical price ids (server prices it). */
const CANONICAL_SERVICE_ID: Record<string, string> = {
  'home-wellbeing-visit': 'home_visit',
  'hospital-companion': 'hospital_assistance_half_day',
  'custom-request': 'grocery_medicine',
}

interface RequestBody {
  service_id?: string
  service_name: string
  loved_one_id?: string | null
  scheduled_at_ist: string | null
  recipient_name?: string
  recipient_address?: string
  requester_whatsapp?: string
  notes: string | null
  visit_landmark?: string | null
  visit_contact_name?: string | null
  visit_contact_phone?: string | null
  visit_time_window?: string | null
  visit_special_instructions?: string | null
  visit_access_instructions?: string | null
  visit_team_notes?: string | null
  visit_map_link?: string | null
}

/** Persist a booking request via the deployed edge function; return a friendly ref. */
async function invokeBookingRequest(body: RequestBody): Promise<BookingResult> {
  const { data: res, error } = await supabase.functions.invoke('submit-booking-request', { body })
  const json = res as { ok?: boolean; request_id?: string } | null
  if (error || !json?.ok || !json.request_id) throw new Error('booking_failed')
  return { ref: `CE-${json.request_id.replace(/-/g, '').slice(0, 8).toUpperCase()}` }
}

/**
 * Marketing wizard submit — guests enter the loved-one + contact details.
 * (Signed-in family users use `requestVisit()` with their stored data instead.)
 */
export async function submitBooking(data: Partial<BookingData>): Promise<BookingResult> {
  const svc = serviceById(data.serviceId)
  const slot = TIME_SLOTS.find((t) => t.id === data.timeSlot)?.label
  const dateIso = data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : null
  const notes =
    [data.date && `Requested date: ${data.date}`, slot && `Preferred time: ${slot}`, data.purpose && `Purpose: ${data.purpose}`, data.details, data.notes]
      .filter(Boolean)
      .join(' · ') || null

  return invokeBookingRequest({
    service_id: (data.serviceId && CANONICAL_SERVICE_ID[data.serviceId]) || data.serviceId,
    service_name: svc?.name ?? 'Visit',
    scheduled_at_ist: dateIso,
    recipient_name: data.name,
    recipient_address: data.address,
    requester_whatsapp: data.whatsapp || data.phone,
    notes,
  })
}

/**
 * In-app visit request — uses a STORED family member + the signed-in user's
 * profile. The transaction never re-asks for master data (Family module owns it):
 * it only carries Service / Date / Time / Notes.
 */
export interface VisitDetailInput {
  recipientAddress: string
  date: string | null
  timeSlotLabel?: string
  landmark?: string
  contactName?: string
  contactPhone?: string
  specialInstructions?: string
  accessInstructions?: string
  teamNotes?: string
  mapLink?: string
}

const trim = (v?: string) => (v && v.trim() ? v.trim() : null)
const toIso = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null)

/** The visit-detail fields shared by create + edit (the logistics the family owns). */
function visitDetailBody(input: VisitDetailInput) {
  return {
    scheduled_at_ist: toIso(input.date),
    recipient_address: input.recipientAddress,
    visit_time_window: trim(input.timeSlotLabel),
    visit_landmark: trim(input.landmark),
    visit_contact_name: trim(input.contactName),
    visit_contact_phone: trim(input.contactPhone),
    visit_special_instructions: trim(input.specialInstructions),
    visit_access_instructions: trim(input.accessInstructions),
    visit_team_notes: trim(input.teamNotes),
    visit_map_link: trim(input.mapLink),
  }
}

export async function requestVisit(
  input: VisitDetailInput & { serviceId: string; canonicalServiceId?: string; lovedOneId?: string; recipientName: string; requesterWhatsapp: string },
): Promise<BookingResult> {
  const svc = serviceById(input.serviceId)
  return invokeBookingRequest({
    // A variant (e.g. Hospital half/full day) can override the canonical price id;
    // the edge function already knows both and prices the request server-side.
    service_id: input.canonicalServiceId ?? CANONICAL_SERVICE_ID[input.serviceId] ?? input.serviceId,
    service_name: svc?.name ?? 'Visit',
    loved_one_id: input.lovedOneId ?? null,
    recipient_name: input.recipientName,
    requester_whatsapp: input.requesterWhatsapp,
    notes: null,
    ...visitDetailBody(input),
  })
}

/** Edit the visit-detail fields of an existing, still-pending request. */
export async function updateVisitRequest(requestId: string, input: VisitDetailInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke('update-booking-request', {
    body: { request_id: requestId, ...visitDetailBody(input) },
  })
  const json = data as { ok?: boolean; error?: string } | null
  if (error || !json?.ok) throw new Error(json?.error || 'update_failed')
}

/**
 * WhatsApp confirmation — INTEGRATION PLACEHOLDER.
 * Returns a prefilled wa.me deep link so the conversation still starts on WhatsApp.
 */
export function whatsappConfirmationLink(data: Partial<BookingData>, ref: string): string {
  const svc = serviceById(data.serviceId)
  const msg =
    `Hi ${SITE.legalName} — I've just requested a ${svc?.name ?? 'visit'} ` +
    `for ${data.name ?? 'my family member'} (ref ${ref}). Looking forward to hearing from my Presence Manager.`
  return whatsappLink(msg)
}
