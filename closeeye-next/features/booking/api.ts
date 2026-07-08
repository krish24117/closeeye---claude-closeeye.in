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

/**
 * Submit a booking request. Persists via the `submit-booking-request` edge
 * function (server-authoritative pricing + admin notify + booking_requests
 * insert). Works for guests and signed-in users. Throws on failure so the
 * wizard shows its warm error state.
 */
export async function submitBooking(data: Partial<BookingData>): Promise<BookingResult> {
  const svc = serviceById(data.serviceId)
  const slot = TIME_SLOTS.find((t) => t.id === data.timeSlot)?.label
  const dateIso = data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : null
  const notes =
    [
      data.date && `Requested date: ${data.date}`,
      slot && `Preferred time: ${slot}`,
      data.purpose && `Purpose: ${data.purpose}`,
      data.details,
      data.notes,
    ]
      .filter(Boolean)
      .join(' · ') || null

  const { data: res, error } = await supabase.functions.invoke('submit-booking-request', {
    body: {
      service_id: (data.serviceId && CANONICAL_SERVICE_ID[data.serviceId]) || data.serviceId,
      service_name: svc?.name ?? 'Visit',
      scheduled_at_ist: dateIso,
      recipient_name: data.name,
      recipient_address: data.address,
      requester_whatsapp: data.whatsapp || data.phone,
      notes,
    },
  })

  const json = res as { ok?: boolean; request_id?: string } | null
  if (error || !json?.ok || !json.request_id) throw new Error('booking_failed')
  // Friendly, ops-findable reference (prefix of the request uuid).
  return { ref: `CE-${json.request_id.replace(/-/g, '').slice(0, 8).toUpperCase()}` }
}

/**
 * WhatsApp confirmation — INTEGRATION PLACEHOLDER.
 *
 * The real backend (an edge function) sends, immediately after booking:
 *   1. Booking confirmation (service, family member, date/time, reference)
 *   2. Presence Manager introduction (name + photo + "I'm here for you")
 *   3. Expected timeline ("matching your Guardian — updates within N hours")
 *   4. Emergency contact number
 * Until that's wired, we return a prefilled wa.me deep link the user can tap so
 * the conversation still starts on WhatsApp.
 */
export function whatsappConfirmationLink(data: Partial<BookingData>, ref: string): string {
  const svc = serviceById(data.serviceId)
  const msg =
    `Hi ${SITE.legalName} — I've just requested a ${svc?.name ?? 'visit'} ` +
    `for ${data.name ?? 'my family member'} (ref ${ref}). Looking forward to hearing from my Presence Manager.`
  return whatsappLink(msg)
}
