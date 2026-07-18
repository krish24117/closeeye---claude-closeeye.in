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
import { localeFor } from './regions'

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
