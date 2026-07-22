/**
 * Phase 4 — LocaleService. Dates, times, and numbers, formatted for a region.
 *
 * "Make the product locale-aware, not merely translated." The locale drives how a date is
 * written (18 Jul vs 18. Juli), how time reads (1:56 pm vs 13:56), and how numbers group —
 * all from Intl, none hand-rolled. The ~15 scattered `toLocaleDateString('en-IN', …)` calls
 * become `formatDate(date, region, …)` against ONE service.
 *
 * ARCHITECTURE ONLY (this phase): no UI is translated, and behaviour is India-identical —
 * the locale is resolved from the region, and India → 'en-IN' → the exact strings as before.
 *
 * TIMEZONE is deliberately caller-controlled and defaults to the VIEWER'S device (today's
 * behaviour). Forcing a loved one's region timezone — so an NRI sees their parent's LOCAL
 * time — is a real behaviour change and belongs in its own commit (pass opts.timeZone =
 * timezoneFor(region) when we make that call), never slipped in under "architecture only".
 */
import { localeFor, regionFor } from './regions'

/**
 * An example phone number for a region — the placeholder hint in a phone input. India is
 * '+91 90000 00000', byte-identical to the hardcoded hint it replaces; other launch markets
 * show their own dialing code; an unknown region falls back to a neutral 'Phone number'.
 * Illustrative only — validation is libphonenumber's job (phoneRegionFor), never this string.
 */
const PHONE_EXAMPLE: Record<string, string> = {
  IN: '+91 90000 00000',
  GB: '+44 7400 000000',
  US: '+1 555 000 0000',
  CA: '+1 204 000 0000',
  AU: '+61 400 000 000',
  DE: '+49 1512 0000000',
  JP: '+81 90 0000 0000',
  BR: '+55 11 90000 0000',
  ZA: '+27 71 000 0000',
}

export function phonePlaceholder(code: string | null | undefined): string {
  return PHONE_EXAMPLE[regionFor(code).code] ?? 'Phone number'
}

/** The E.164 country calling code for a region (e.g. '+91'), or '' when unknown. */
export function dialCode(code: string | null | undefined): string {
  const m = PHONE_EXAMPLE[regionFor(code).code]?.match(/^\+\d+/)
  return m ? m[0] : ''
}

/**
 * A dialable phone for a `tel:` link. Prefixes the region's calling code when the stored number
 * has none — so an NRI tapping "Call" actually reaches a number back home. A number already in
 * international form (leading '+') is normalised and returned as-is; a purely local number with no
 * known region is returned unchanged (a local dial beats guessing a wrong country code).
 */
export function dialablePhone(phone: string | null | undefined, code: string | null | undefined): string {
  const raw = (phone ?? '').trim()
  if (!raw) return ''
  if (raw.startsWith('+')) return raw.replace(/[^\d+]/g, '')
  const dc = dialCode(code)
  const national = raw.replace(/[^\d]/g, '').replace(/^0+/, '') // drop the national trunk '0'
  return dc && national ? `${dc}${national}` : raw.replace(/[^\d]/g, '')
}

/** Format a time for a region's locale. India ('en-IN') is byte-identical to before. */
export function formatTime(date: Date | string | number, code: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleTimeString(localeFor(code), opts)
}

/** Format a date for a region's locale. */
export function formatDate(date: Date | string | number, code: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString(localeFor(code), opts)
}

/** Format a date+time for a region's locale. */
export function formatDateTime(date: Date | string | number, code: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleString(localeFor(code), opts)
}

/** Format a plain number for a region's locale (grouping only — money is CurrencyService). */
export function formatNumber(n: number, code: string | null | undefined, opts?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(localeFor(code), opts)
}
