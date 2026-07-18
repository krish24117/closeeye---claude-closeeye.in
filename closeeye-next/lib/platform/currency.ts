/**
 * Phase 3 — CurrencyService. No business logic references a currency directly.
 *
 * Money is an AMOUNT (a number, in major units) plus a REGION. Formatting is locale-aware
 * via Intl.NumberFormat — the ₹ / £ / $ symbol, the grouping (India's lakh vs Western
 * thousands), and the position all come from the locale, never a hand-built string.
 *
 * PRICING IS LOCKED and India renders BYTE-IDENTICALLY: formatMoney(500,'IN') === '₹500',
 * 1500 → '₹1,500', 1000 → '₹1,000'. Verified before wiring. The rounded-pricing brand
 * ("clean rounded prices only") is honoured with maximumFractionDigits:0 — so no currency
 * shows psychological decimals, and India's '₹500' (not '₹500.00') is preserved.
 */
import { regionFor } from './regions'

/** Format an amount (major units) for a region. `formatMoney(500,'IN') → '₹500'`. */
export function formatMoney(amount: number, code?: string | null): string {
  const r = regionFor(code)
  return new Intl.NumberFormat(r.locale.default, {
    style: 'currency',
    currency: r.locale.currency,
    maximumFractionDigits: 0, // rounded-pricing brand; also what preserves India's '₹500'
  }).format(amount)
}

/** Just the currency symbol for a region (e.g. '₹', '£', '$') — for compact UI. */
export function currencySymbol(code?: string | null): string {
  const r = regionFor(code)
  const parts = new Intl.NumberFormat(r.locale.default, { style: 'currency', currency: r.locale.currency }).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value ?? r.locale.currency
}
