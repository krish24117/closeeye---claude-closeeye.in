/**
 * Phase 0 — the Region Configuration Layer (Global Platform Transformation, Deliverable 4).
 *
 * The single source of regional truth. Every hardcoded assumption — the emergency number,
 * currency, which Care modules exist, data residency — reads from the resolved Region.
 * No business logic anywhere else may branch on a country.
 *
 * CONNECT IS GLOBAL: `connect` is always true. Care is a per-region set of modules; the
 * platform is fully usable with none of them (Constitution: "Connect must never depend on
 * human operations; Care may").
 *
 * ─── THE SAFETY DESIGN: AN UNKNOWN REGION NEVER INHERITS 108 ──────────────────────
 * A wrong emergency number is lethal. So the fallback for an unrecognised code is NOT
 * India — it is GENERIC, which asserts no specific number and tells the family to call
 * their local emergency services. Existing users are mapped to 'IN' explicitly at the data
 * layer (region_code default 'IN'), never via this fallback — so India's behaviour is
 * byte-identical, and a genuinely new country is never handed the wrong ambulance number.
 *
 * Phase 0 changes NO runtime behaviour: this layer is consumed by nothing yet. It exists,
 * it is tested, and India's config reproduces today exactly. Wiring the 108 sites and the
 * currency to read from here is the next, deliberate increment.
 */

export type RegionCode = 'IN' | 'GB' | 'CA' | 'AU' | 'US' | 'DE' | 'JP' | 'BR' | 'ZA' | 'GENERIC'
export type CareModuleId = 'presence' | 'hospital' | 'financial' | 'insurance' | 'property' | 'community'
export type Residency = 'in' | 'eu' | 'us' | 'apac' | 'unknown'

export interface Region {
  code: RegionCode
  name: string
  /** ALWAYS true. Connect is the global platform; it is never disabled for a region. */
  connect: true
  /** Which Care modules are LIVE here. Absent/false = not offered → the UI shows nothing. */
  care: Partial<Record<CareModuleId, boolean>>
  locale: {
    languages: string[]
    default: string       // BCP-47, e.g. 'en-IN', 'en-GB'
    rtl: boolean
    currency: string      // ISO 4217, e.g. 'INR', 'GBP'
    measurement: 'metric' | 'imperial'
  }
  /** Emergency GUIDANCE (Connect, global). Physical RESPONSE is a Care module (regional). */
  emergency: { number: string | null; label: string }
  /** IANA timezone — a country's representative default. Multi-zone countries (US, AU, BR)
   *  refine to a per-family zone later; region-level is the Phase-1 default. */
  timezone: string
  /** ISO 3166 country for phone validation (libphonenumber) — never a hand-rolled regex. */
  phoneRegion: string
  /** Which address shape a form should render. */
  addressSchema: 'generic' | 'in' | 'us' | 'eu' | 'jp'
  dataResidency: Residency
}

/** Existing users (region_code null) map here at the data layer — India is unchanged. */
export const DEFAULT_REGION_CODE: RegionCode = 'IN'

const REGIONS: Record<RegionCode, Region> = {
  // India — TODAY'S behaviour, expressed as config. Day-0 change: none.
  IN: {
    code: 'IN', name: 'India', connect: true,
    care: { presence: true, financial: true },
    locale: { languages: ['en', 'hi', 'te'], default: 'en-IN', rtl: false, currency: 'INR', measurement: 'metric' },
    emergency: { number: '108', label: 'Ambulance (108)' },
    timezone: 'Asia/Kolkata', phoneRegion: 'IN', addressSchema: 'in', dataResidency: 'in',
  },
  // Connect-only launch markets — Care disabled, correct local emergency number.
  GB: {
    code: 'GB', name: 'United Kingdom', connect: true, care: {},
    locale: { languages: ['en'], default: 'en-GB', rtl: false, currency: 'GBP', measurement: 'metric' },
    emergency: { number: '999', label: 'Emergency (999)' },
    timezone: 'Europe/London', phoneRegion: 'GB', addressSchema: 'generic', dataResidency: 'eu',
  },
  CA: {
    code: 'CA', name: 'Canada', connect: true, care: {},
    locale: { languages: ['en', 'fr'], default: 'en-CA', rtl: false, currency: 'CAD', measurement: 'metric' },
    emergency: { number: '911', label: 'Emergency (911)' },
    timezone: 'America/Toronto', phoneRegion: 'CA', addressSchema: 'us', dataResidency: 'us',
  },
  AU: {
    code: 'AU', name: 'Australia', connect: true, care: {},
    locale: { languages: ['en'], default: 'en-AU', rtl: false, currency: 'AUD', measurement: 'metric' },
    emergency: { number: '000', label: 'Emergency (000)' },
    timezone: 'Australia/Sydney', phoneRegion: 'AU', addressSchema: 'generic', dataResidency: 'apac',
  },
  US: {
    code: 'US', name: 'United States', connect: true, care: {},
    locale: { languages: ['en', 'es'], default: 'en-US', rtl: false, currency: 'USD', measurement: 'imperial' },
    emergency: { number: '911', label: 'Emergency (911)' },
    timezone: 'America/New_York', phoneRegion: 'US', addressSchema: 'us', dataResidency: 'us',
  },
  DE: {
    code: 'DE', name: 'Germany', connect: true, care: {},
    locale: { languages: ['de', 'en'], default: 'de-DE', rtl: false, currency: 'EUR', measurement: 'metric' },
    emergency: { number: '112', label: 'Notruf (112)' },
    timezone: 'Europe/Berlin', phoneRegion: 'DE', addressSchema: 'eu', dataResidency: 'eu',
  },
  JP: {
    code: 'JP', name: 'Japan', connect: true, care: {},
    locale: { languages: ['ja', 'en'], default: 'ja-JP', rtl: false, currency: 'JPY', measurement: 'metric' },
    emergency: { number: '119', label: '救急 (119)' },
    timezone: 'Asia/Tokyo', phoneRegion: 'JP', addressSchema: 'jp', dataResidency: 'apac',
  },
  BR: {
    code: 'BR', name: 'Brazil', connect: true, care: {},
    locale: { languages: ['pt', 'en'], default: 'pt-BR', rtl: false, currency: 'BRL', measurement: 'metric' },
    emergency: { number: '192', label: 'SAMU (192)' },
    timezone: 'America/Sao_Paulo', phoneRegion: 'BR', addressSchema: 'generic', dataResidency: 'us',
  },
  ZA: {
    code: 'ZA', name: 'South Africa', connect: true, care: {},
    locale: { languages: ['en', 'zu', 'af'], default: 'en-ZA', rtl: false, currency: 'ZAR', measurement: 'metric' },
    emergency: { number: '10177', label: 'Ambulance (10177)' },
    timezone: 'Africa/Johannesburg', phoneRegion: 'ZA', addressSchema: 'generic', dataResidency: 'unknown',
  },
  // The honest fallback for an unrecognised region — asserts NO specific emergency number.
  GENERIC: {
    code: 'GENERIC', name: 'International', connect: true, care: {},
    locale: { languages: ['en'], default: 'en', rtl: false, currency: 'USD', measurement: 'metric' },
    emergency: { number: null, label: 'your local emergency number' },
    timezone: 'UTC', phoneRegion: '', addressSchema: 'generic', dataResidency: 'unknown',
  },
}

/**
 * Resolve a region. An unrecognised or empty code returns GENERIC — NEVER India — so a new
 * country is never handed the wrong emergency number. Existing users are mapped to 'IN' at
 * the data layer, not here.
 */
export function regionFor(code: string | null | undefined): Region {
  const c = (code ?? '').trim().toUpperCase()
  return (REGIONS as Record<string, Region>)[c] ?? REGIONS.GENERIC
}

/** The emergency number to dial, or null when unknown (→ "your local emergency number"). */
export function emergencyFor(code: string | null | undefined): { number: string | null; label: string } {
  return regionFor(code).emergency
}

/** Is a Care module live in this region? Connect never asks this of itself — only Care. */
export function careEnabled(code: string | null | undefined, module: CareModuleId): boolean {
  return regionFor(code).care[module] === true
}

/* ── RegionService accessors — the ONLY way a component reads a regional value. No UI
      touches the config map directly; that's what keeps "one source of truth" true. ── */
export const localeFor = (code: string | null | undefined): string => regionFor(code).locale.default
export const currencyFor = (code: string | null | undefined): string => regionFor(code).locale.currency
export const timezoneFor = (code: string | null | undefined): string => regionFor(code).timezone
export const phoneRegionFor = (code: string | null | undefined): string => regionFor(code).phoneRegion
export const languagesFor = (code: string | null | undefined): string[] => regionFor(code).locale.languages
export const isRtl = (code: string | null | undefined): boolean => regionFor(code).locale.rtl

/** Every configured region (excluding the GENERIC fallback) — for admin/region pickers. */
export const ALL_REGIONS: Region[] = (Object.keys(REGIONS) as RegionCode[])
  .filter((c) => c !== 'GENERIC')
  .map((c) => REGIONS[c])

/**
 * The emergency dial a screen should render. When the number is known → a tel: link with
 * the number; when unknown (GENERIC) → NO link and an honest "call your local emergency
 * number", because we must never dial a wrong one.
 *
 * PHASE 0 CALLERS pass DEFAULT_REGION_CODE explicitly (→ India, 108) — the NUMBER is now
 * sourced from config in one place, while per-user region RESOLUTION waits for the
 * region_code column (Phase 0b). Passing null here would resolve to GENERIC and drop
 * India's 108, so callers pin the region until that column exists.
 */
export function emergencyDial(code: string | null | undefined): { href: string | null; text: string } {
  const e = emergencyFor(code)
  return e.number
    ? { href: `tel:${e.number}`, text: `Call emergency services · ${e.number}` }
    : { href: null, text: 'Call your local emergency number' }
}
