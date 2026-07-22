/**
 * Phase 3 — CurrencyService. No business logic references a currency directly.
 *
 * Money is an AMOUNT (a number, in major units) plus a REGION. Formatting is locale-aware
 * via Intl.NumberFormat — the ₹ / £ / $ symbol, the grouping (India's lakh vs Western
 * thousands), and the position all come from the locale, never a hand-built string.
 *
 * NATURAL DECIMALS (min 0, max 2) — one formatter for both PRICING and RECEIPTS:
 *   · Round brand prices show NO decimals: formatMoney(500,'IN') === '₹500' (never
 *     '₹500.00') — the rounded-pricing brand is preserved.
 *   · Receipts (a refund or proration in paise) keep their real value: 500.5 → '₹500.5'.
 * A single fixed maximumFractionDigits:0 would have rounded a ₹500.50 receipt to ₹501 —
 * so the formatter shows up to 2 decimals only when they actually exist.
 *
 * PRICING IS LOCKED and India renders BYTE-IDENTICALLY, verified before wiring.
 */
import { regionFor } from './regions'

/** Format an amount (major units) for a region. `formatMoney(500,'IN') → '₹500'`. */
export function formatMoney(amount: number, code?: string | null): string {
  const r = regionFor(code)
  return new Intl.NumberFormat(r.locale.default, {
    style: 'currency',
    currency: r.locale.currency,
    minimumFractionDigits: 0, // round prices → no '.00'
    maximumFractionDigits: 2, // receipts → keep real paise (₹500.50), never rounded away
  }).format(amount)
}

/** Just the currency symbol for a region (e.g. '₹', '£', '$') — for compact UI. */
export function currencySymbol(code?: string | null): string {
  const r = regionFor(code)
  const parts = new Intl.NumberFormat(r.locale.default, { style: 'currency', currency: r.locale.currency }).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value ?? r.locale.currency
}
