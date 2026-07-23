/**
 * Phase 3 gate — CurrencyService.
 *
 * The invariant: India renders BYTE-IDENTICALLY to the LOCKED price strings it replaced.
 * Pricing is a Product-Director decision; this commit changes HOW the ₹ is produced (Intl,
 * not a literal), never WHAT is shown.
 */
import { describe, it, expect } from 'vitest'
import { formatMoney, currencySymbol } from './currency'
import { PLANS, SERVICES } from '@/lib/plans'

describe('India renders exactly the LOCKED strings', () => {
  it('the membership prices are unchanged', () => {
    expect(formatMoney(500, 'IN')).toBe('₹500')
    expect(formatMoney(1500, 'IN')).toBe('₹1,500')
    expect(formatMoney(1000, 'IN')).toBe('₹1,000')
    expect(formatMoney(2000, 'IN')).toBe('₹2,000')
  })
  it('no psychological decimals — the rounded-pricing brand holds', () => {
    expect(formatMoney(500, 'IN')).not.toMatch(/\./) // '₹500', never '₹500.00'
  })
  it('Indian lakh grouping is correct (more correct than a naive format)', () => {
    expect(formatMoney(100000, 'IN')).toBe('₹1,00,000')
  })
})

describe('plans.ts reflects the current pricing (₹500/₹1,500 retired 2026-07-23)', () => {
  it('Membership ₹1,000, Presence ₹8,000 — the current India prices', () => {
    expect(PLANS.find((p) => p.key === 'connect')?.price).toBe('₹1,000')
    expect(PLANS.find((p) => p.key === 'care')?.price).toBe('₹8,000')
  })
  it('the numeric amount travels alongside for per-region formatting', () => {
    expect(PLANS.find((p) => p.key === 'connect')?.amount).toBe(1000)
    expect(PLANS.find((p) => p.key === 'care')?.amount).toBe(8000)
  })
  it('no retired ₹500/₹1,500 remains in the plans', () => {
    expect(PLANS.some((p) => p.amount === 500 || p.amount === 1500)).toBe(false)
  })
  it('services keep "Starting at ₹X" exactly', () => {
    const byName = (n: string) => SERVICES.find((s) => s.name === n)
    expect(byName('Home Wellbeing Visit')?.price).toBe('Starting at ₹1,000')
    expect(byName('Hospital Companion')?.price).toBe('Starting at ₹2,000')
    expect(byName('Custom Request')?.price).toBe('Starting at ₹1,000')
  })
})

describe('other regions format from the same amount, locale-aware', () => {
  it('the symbol and grouping come from the locale, never a string', () => {
    expect(formatMoney(500, 'GB')).toBe('£500')
    expect(formatMoney(500, 'US')).toBe('$500')
    expect(formatMoney(500, 'DE')).toMatch(/500\s*€|€\s*500/) // de-DE puts € after
    expect(currencySymbol('IN')).toBe('₹')
    expect(currencySymbol('GB')).toBe('£')
  })
  it('an unknown region falls back to a coherent format, never a crash', () => {
    expect(typeof formatMoney(500, 'atlantis')).toBe('string')
  })
})
