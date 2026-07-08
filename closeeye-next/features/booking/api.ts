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
  scheduled_at_ist: string | null
  recipient_name?: string
  recipient_address?: string
  requester_whatsapp?: string
  notes: string | null
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
export async function requestVisit(input: {
  serviceId: string
  recipientName: string
  recipientAddress: string
  requesterWhatsapp: string
  date: string | null
  timeSlotLabel?: string
  notes?: string
}): Promise<BookingResult> {
  const svc = serviceById(input.serviceId)
  const dateIso = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null
  const notes =
    [input.date && `Requested date: ${input.date}`, input.timeSlotLabel && `Preferred time: ${input.timeSlotLabel}`, input.notes]
      .filter(Boolean)
      .join(' · ') || null

  return invokeBookingRequest({
    service_id: CANONICAL_SERVICE_ID[input.serviceId] ?? input.serviceId,
    service_name: svc?.name ?? 'Visit',
    scheduled_at_ist: dateIso,
    recipient_name: input.recipientName,
    recipient_address: input.recipientAddress,
    requester_whatsapp: input.requesterWhatsapp,
    notes,
  })
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
