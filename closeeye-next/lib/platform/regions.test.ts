/**
 * Phase 0 gate — the Region Configuration Layer.
 *
 * The two invariants that make this safe to build on:
 *   1. India is byte-identical to today (108, INR, Care on).
 *   2. An unknown region NEVER inherits India's 108 — a wrong emergency number is lethal.
 */
import { describe, it, expect } from 'vitest'
import { regionFor, emergencyFor, careEnabled, emergencyDial, localeFor, currencyFor, timezoneFor, phoneRegionFor, DEFAULT_REGION_CODE, ALL_REGIONS } from './regions'

describe('India is today, expressed as config', () => {
  it('the default region is India', () => expect(DEFAULT_REGION_CODE).toBe('IN'))
  it('India = 108, INR, presence + financial Care', () => {
    const r = regionFor('IN')
    expect(r.emergency.number).toBe('108')
    expect(r.locale.currency).toBe('INR')
    expect(careEnabled('IN', 'presence')).toBe(true)
    expect(careEnabled('IN', 'financial')).toBe(true)
    expect(r.connect).toBe(true)
  })
})

describe('THE SAFETY INVARIANT · an unknown region never gets 108', () => {
  for (const code of ['', null, undefined, 'XX', 'ZZ', 'atlantis']) {
    it(`regionFor(${JSON.stringify(code)}) → GENERIC, emergency number null`, () => {
      const r = regionFor(code)
      expect(r.code).toBe('GENERIC')
      expect(r.emergency.number).toBe(null) // NOT '108'
      expect(r.emergency.number).not.toBe('108')
      expect(r.emergency.label).toMatch(/local emergency/i)
    })
  }
  it('GENERIC still offers Connect (global), just no Care and no assumed number', () => {
    const r = regionFor('nowhere')
    expect(r.connect).toBe(true)
    expect(Object.values(r.care).some(Boolean)).toBe(false)
  })
})

describe('Connect is global; Care is regional', () => {
  it('every region enables Connect — it is never disabled', () => {
    for (const r of ALL_REGIONS) expect(r.connect).toBe(true)
  })
  it('Connect-only launch markets have the right number and NO Care', () => {
    expect(emergencyFor('GB').number).toBe('999')
    expect(emergencyFor('CA').number).toBe('911')
    expect(emergencyFor('AU').number).toBe('000')
    expect(emergencyFor('DE').number).toBe('112')
    for (const code of ['GB', 'CA', 'AU', 'US', 'DE', 'JP', 'BR', 'ZA']) {
      expect(careEnabled(code, 'presence'), `${code} must not offer presence Care`).toBe(false)
    }
  })
  it('India is the ONLY region with Care enabled today', () => {
    const withCare = ALL_REGIONS.filter((r) => Object.values(r.care).some(Boolean))
    expect(withCare.map((r) => r.code)).toEqual(['IN'])
  })
})

describe('emergencyDial · what the crisis screens render (Phase 0 wiring)', () => {
  it('India (the Phase-0 default) → a real tel:108 link, unchanged', () => {
    const d = emergencyDial(DEFAULT_REGION_CODE)
    expect(d.href).toBe('tel:108')
    expect(d.text).toBe('Call emergency services · 108')
  })
  it('a Connect-only market dials its own number', () => {
    expect(emergencyDial('GB').href).toBe('tel:999')
    expect(emergencyDial('DE').text).toMatch(/112/)
  })
  it('unknown region → NO tel: link and an honest label — never a wrong number', () => {
    const d = emergencyDial('atlantis')
    expect(d.href).toBe(null)
    expect(d.text).toMatch(/your local emergency number/i)
    expect(d.text).not.toMatch(/108/)
  })
})

describe('Phase 1 · the complete Region config (every regional value, one source)', () => {
  it('India carries the full set — timezone, phone region, address schema — all Indian', () => {
    expect(timezoneFor('IN')).toBe('Asia/Kolkata')
    expect(phoneRegionFor('IN')).toBe('IN')
    expect(localeFor('IN')).toBe('en-IN')
    expect(currencyFor('IN')).toBe('INR')
    expect(regionFor('IN').addressSchema).toBe('in')
  })
  it('accessors resolve per region, never a hardcoded value', () => {
    expect(timezoneFor('JP')).toBe('Asia/Tokyo')
    expect(currencyFor('DE')).toBe('EUR')
    expect(phoneRegionFor('GB')).toBe('GB')
  })
  it('every region has a valid IANA-shaped timezone and a phone region (or GENERIC blank)', () => {
    for (const r of ALL_REGIONS) {
      expect(r.timezone).toMatch(/^[A-Za-z]+\/[A-Za-z_]+$|^UTC$/)
      expect(typeof r.phoneRegion).toBe('string')
      expect(['generic', 'in', 'us', 'eu', 'jp']).toContain(r.addressSchema)
    }
  })
})

describe('every configured region is coherent', () => {
  it('has a currency, a default locale, and either a number or an honest label', () => {
    for (const r of ALL_REGIONS) {
      expect(r.locale.currency).toMatch(/^[A-Z]{3}$/)
      expect(r.locale.default).toBeTruthy()
      expect(r.emergency.number || r.emergency.label).toBeTruthy()
    }
  })
  it('case-insensitive resolution — "in", "In", "IN" are the same region', () => {
    expect(regionFor('in').code).toBe('IN')
    expect(regionFor('In').code).toBe('IN')
  })
})
