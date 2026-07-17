/**
 * Close Eye — the coverage policy.
 *
 * Close Eye only promises what it can deliver where the family actually is. This module is
 * the single source of truth for WHAT we can do, WHERE.
 *
 * ─── IT IS NOT ONE MAP. IT IS DOMAIN × MODE. ────────────────────────────────────
 * The mistake this file used to make was answering one question — "can a real person be
 * there?" — for every kind of help. So a family in Delhi asking about their father's
 * pension was told we couldn't help, which is FALSE: a Presence Manager handles that
 * anywhere in India, because it does not need feet on the ground.
 *
 *   presence   in-person — someone must physically be there   → Hyderabad Metro
 *   financial  remote — organised by phone and paperwork      → India
 *
 * That is why the two answers differ, and it generalises: a new domain declares its MODE
 * and inherits the right geography. Legal would be remote; a home visit would be
 * in-person. Adding a market is one entry in SERVICE_REGIONS; adding a domain is one
 * entry in DOMAIN_MODE. Nothing else in the product needs to know.
 *
 * ─── THE RULE THAT MATTERS ──────────────────────────────────────────────────────
 * An unknown location is NEVER treated as covered — in ANY domain. Assuming coverage is
 * inventing a fact about the family, which the Constitution forbids, and it is the one
 * failure mode that ends with a family expecting someone who never comes.
 *
 * NB: coverage answers "can Close Eye do this THERE" — not "is this person ours". Whose
 * city it is remains the caller's to establish: an NRI in London writing about a father
 * in Hyderabad is covered, and the location that matters is the FATHER'S. When the engine
 * cannot tell whose city it has, it must ask (see WHERE_QUESTION) — never assume.
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

/* ── INDIA ──
   Every place-name we can recognise as being in India. This is the reach of the REMOTE
   domains — a Presence Manager organises a pension or a tax filing from anywhere, so the
   question is the country, not the suburb.
   It lives here, next to SERVICE_REGIONS, because geography belongs in one file: the
   ledger's gazetteer reads FROM this list rather than keeping a second copy of India.
   Every served area is Indian by definition, so it is folded in — a market can never be
   added to SERVICE_REGIONS and forgotten here. */
const INDIA_CITIES: string[] = [
  'hyderabad', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi', 'chennai', 'kolkata',
  'pune', 'ahmedabad', 'jaipur', 'lucknow', 'kochi', 'cochin', 'coimbatore', 'visakhapatnam',
  'vizag', 'vijayawada', 'warangal', 'nagpur', 'indore', 'bhopal', 'patna', 'surat', 'kanpur',
  'nashik', 'mysore', 'mysuru', 'madurai', 'trichy', 'guntur', 'tirupati', 'goa', 'chandigarh',
  'gurgaon', 'gurugram', 'noida', 'thane', 'faridabad', 'ghaziabad', 'nellore', 'rajahmundry',
  'kakinada', 'karimnagar', 'nizamabad', 'khammam', 'tirupathi', 'salem', 'erode', 'vellore',
  'thrissur', 'kozhikode', 'calicut', 'trivandrum', 'thiruvananthapuram', 'mangalore', 'hubli',
  'belgaum', 'nanded', 'aurangabad', 'jodhpur', 'udaipur', 'kota', 'agra', 'varanasi', 'allahabad',
  'prayagraj', 'ranchi', 'jamshedpur', 'bhubaneswar', 'cuttack', 'guwahati', 'siliguri', 'dehradun',
  'amritsar', 'ludhiana', 'jalandhar', 'meerut', 'bareilly', 'aligarh', 'gwalior', 'jabalpur', 'raipur',
]
export const INDIA_AREAS: string[] = [...new Set([...INDIA_CITIES, ...SERVED_AREAS])]

/** Is this place in India? Unknown/empty is never India — see THE RULE THAT MATTERS. */
export function isIndia(location: string | null | undefined): boolean {
  const q = (location ?? '').trim().toLowerCase()
  if (!q) return false
  return INDIA_AREAS.some((a) => a === q || q.includes(a))
}

/* ── DOMAINS ──
   What kind of help, and therefore what geography answers for it. */
export type ServiceDomain = 'presence' | 'financial'
const DOMAIN_MODE: Record<ServiceDomain, 'in-person' | 'remote'> = {
  presence: 'in-person',   // someone must be there — Hyderabad Metro
  financial: 'remote',     // organised by phone and paperwork — India
}

/**
 * Can Close Eye do THIS, THERE?
 *   'available'   — yes, today
 *   'unavailable' — we know where they are, and we can't do this there yet
 *   'unknown'     — we haven't been told. NEVER treated as available, in any domain.
 */
export function coverageFor(domain: ServiceDomain, location: string | null | undefined): PresenceAvailability {
  if (!(location ?? '').trim()) return 'unknown'
  return DOMAIN_MODE[domain] === 'remote'
    ? (isIndia(location) ? 'available' : 'unavailable')
    : presenceFor(location)
}
