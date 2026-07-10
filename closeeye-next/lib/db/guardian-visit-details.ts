/**
 * B1 — pure resolution of the per-visit logistics the Guardian sees.
 *
 * Kept dependency-free (no `@/` imports) so it is unit-testable in isolation and
 * safe to import from both the app and a plain Node test runner. The per-visit
 * fields are materialised onto `bookings` (migration 20260713000000); the Guardian
 * reads those, falling back to the loved one's saved profile for legacy rows.
 */

const clean = (s: string | null | undefined): string => (s && s.trim()) || ''

/**
 * The address the Guardian should navigate to: the address the family entered for
 * THIS visit, else the loved one's saved profile address, else their city, else ''.
 */
export function resolveVisitAddress(
  bookingVisitAddress: string | null | undefined,
  profileAddress: string | null | undefined,
  profileCity: string | null | undefined,
): string {
  return clean(bookingVisitAddress) || clean(profileAddress) || clean(profileCity) || ''
}

export interface VisitLogistics {
  landmark?: string | null
  contactName?: string | null
  contactPhone?: string | null
  accessInstructions?: string | null
  timeWindow?: string | null
}

/**
 * Human "for this visit" lines (preferred time / landmark / access / on-site
 * contact), with empty entries dropped — for a glanceable arrival block. The map
 * link is handled separately (it renders as a button, not a text line).
 */
export function visitLogisticsLines(v: VisitLogistics): string[] {
  const lines: string[] = []
  if (clean(v.timeWindow)) lines.push(`Preferred time: ${clean(v.timeWindow)}`)
  if (clean(v.landmark)) lines.push(`Landmark: ${clean(v.landmark)}`)
  if (clean(v.accessInstructions)) lines.push(`Access: ${clean(v.accessInstructions)}`)
  const contact = [clean(v.contactName), clean(v.contactPhone)].filter(Boolean).join(' · ')
  if (contact) lines.push(`On-site contact: ${contact}`)
  return lines
}

/** A user-entered map link is only rendered as a link if it is a real http(s) URL. */
export function safeMapLink(url: string | null | undefined): string | null {
  const u = clean(url)
  return /^https?:\/\//i.test(u) ? u : null
}
