import type { BookingData } from './schema'
import { serviceById } from './schema'
import { SITE, whatsappLink } from '@/lib/site'

export interface BookingResult {
  ref: string
}

/**
 * Submit a booking. Posts to the API placeholder at /api/bookings.
 * Throws on failure so the wizard can show the (warm) error state.
 */
export async function submitBooking(data: Partial<BookingData>): Promise<BookingResult> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('booking_failed')
  const json = (await res.json()) as { ok: boolean; ref?: string }
  if (!json.ok || !json.ref) throw new Error('booking_failed')
  return { ref: json.ref }
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
