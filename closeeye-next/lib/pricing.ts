import { formatMoney } from '@/lib/platform/currency'

/**
 * CloseEye pricing — round-number, region-detected (founder 2026-07-23).
 * Same plans / names / positioning / features everywhere; ONLY the currency + amount change.
 * India renders INR; every other country renders USD (the international baseline).
 * No psychological pricing — clean round numbers only.
 */

export type PricingRegion = 'IN' | 'US' // 'US' = the international / USD baseline

/** India → INR; anything else (or unknown) → USD international. */
export function pricingRegion(country?: string | null): PricingRegion {
  return (country ?? '').toUpperCase() === 'IN' ? 'IN' : 'US'
}

/** Amounts in major units, per region. */
const AMOUNTS = {
  payg: { IN: 1000, US: 30 },
  membership: { IN: 1000, US: 20 },
  presence: { IN: 8000, US: 100 },
  presencePlus: { IN: 20000, US: 250 },
  familyOffice: { IN: 80000, US: 1000 },
} as const

export type PriceKey = keyof typeof AMOUNTS

/** Formatted price string for a plan in a region, e.g. price('payg','US') → '$30'. */
export function price(key: PriceKey, region: PricingRegion): string {
  return formatMoney(AMOUNTS[key][region], region)
}
