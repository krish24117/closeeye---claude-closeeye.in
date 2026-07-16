/**
 * Close Eye — Service Regions (the presence policy).
 *
 * Close Eye only promises what it can deliver where the family actually is. This module
 * is the single source of truth for WHERE physical presence is genuinely available, and
 * it answers one question: given a location, can a real person be there?
 *
 * Deliberately a REGION, not a city name. A family writes "Gachibowli" or "Secunderabad",
 * not "Hyderabad Metro" — matching the literal string "hyderabad" would tell a family we
 * serve that we can't reach them. Adding a market is adding one entry here; nothing else
 * in the product needs to know.
 *
 * THE RULE THAT MATTERS: an unknown location is NEVER treated as covered. Assuming
 * coverage is inventing a fact about the family, which the Constitution forbids — and it
 * is the one failure mode that ends with a family expecting someone who never comes.
 */

export interface ServiceRegion {
  id: string
  /** How we say it to a family. */
  name: string
  /** Every place-name that resolves to this region — cities, suburbs, localities,
   *  and the spelling variants real people actually type. */
  areas: string[]
}

export const SERVICE_REGIONS: ServiceRegion[] = [
  {
    id: 'hyderabad-metro',
    name: 'Hyderabad Metro',
    areas: [
      'hyderabad', 'secunderabad', 'cyberabad',
      'gachibowli', 'madhapur', 'kondapur',
      'hitec city', 'hitech city', 'hi-tec city', 'hi tech city',
      'financial district', 'jubilee hills', 'banjara hills',
    ],
  },
]

/** Every place-name we recognise as served — used to widen the location gazetteer, so a
 *  place we SERVE is never a place we fail to read. */
export const SERVED_AREAS: string[] = SERVICE_REGIONS.flatMap((r) => r.areas)

/** The region a location belongs to, or null if we don't serve it (or don't know it). */
export function regionFor(location: string | null | undefined): ServiceRegion | null {
  const q = (location ?? '').trim().toLowerCase()
  if (!q) return null
  return SERVICE_REGIONS.find((r) => r.areas.some((a) => a === q || q.includes(a))) ?? null
}

/**
 * Can a real person be there?
 *   'available'   — we serve this region today
 *   'unavailable' — we know where they are, and we don't serve it yet
 *   'unknown'     — we haven't been told. NEVER treated as available.
 */
export type PresenceAvailability = 'available' | 'unavailable' | 'unknown'

export function presenceFor(location: string | null | undefined): PresenceAvailability {
  if (!(location ?? '').trim()) return 'unknown'
  return regionFor(location) ? 'available' : 'unavailable'
}
