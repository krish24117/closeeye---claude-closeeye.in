/**
 * Phase 5 gate — CapabilityService.
 *
 * India can do everything (identical to today). Connect-only regions keep Connect and lose
 * every Care surface. Connect is never gated anywhere. An unknown region inherits nothing.
 */
import { describe, it, expect } from 'vitest'
import { can, capabilitiesFor } from './capability'

describe('Connect is the global platform — always available', () => {
  for (const code of ['IN', 'CA', 'JP', 'US', 'atlantis', '', null, undefined]) {
    it(`connect is true for ${JSON.stringify(code)}`, () => {
      expect(can(code, 'connect')).toBe(true)
    })
  }
})

describe('India can do everything — identical to today', () => {
  it('care, presence, guardian, financial all on', () => {
    expect(can('IN', 'care')).toBe(true)
    expect(can('IN', 'presence')).toBe(true)
    expect(can('IN', 'guardian')).toBe(true)
    expect(can('IN', 'financial')).toBe(true)
  })
})

describe('Connect-only regions keep Connect, lose Care', () => {
  for (const code of ['CA', 'JP']) {
    it(`${code}: connect ✓  care ✗  presence ✗  guardian ✗`, () => {
      expect(can(code, 'connect')).toBe(true)
      expect(can(code, 'care')).toBe(false)
      expect(can(code, 'presence')).toBe(false)
      expect(can(code, 'guardian')).toBe(false)
    })
  }
})

describe('an unknown region inherits no Care capability (safety invariant)', () => {
  it('care is false for a region we do not know', () => {
    expect(can('atlantis', 'care')).toBe(false)
    expect(can('atlantis', 'guardian')).toBe(false)
  })
})

describe('capabilitiesFor lists what is live', () => {
  it('India includes connect + care + guardian', () => {
    const caps = capabilitiesFor('IN')
    expect(caps).toContain('connect')
    expect(caps).toContain('care')
    expect(caps).toContain('guardian')
  })
  it('a Connect-only region is connect and nothing more', () => {
    expect(capabilitiesFor('CA')).toEqual(['connect'])
  })
})
