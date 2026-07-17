/**
 * THE COVERAGE POLICY — what Close Eye can do, where.
 *
 * Founder, 2026-07-17: "Presence Manager currently serving in India. For financial
 * assistance. For health, in Hyderabad only."
 *
 * These are capability CLAIMS, so they are pinned. Getting one wrong is not a cosmetic
 * bug: over-promising ends with a family expecting someone who never comes, and
 * under-promising turns away work we can actually do (before this, a Delhi family asking
 * about their father's pension was told we couldn't help — which was never true).
 */
import { describe, it, expect } from 'vitest'
import { coverageFor, isIndia, presenceFor } from './service-region'
import { readLedger, counsel } from '../connect/ledger'

describe('financial · remote, so the whole of India', () => {
  for (const city of ['Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Bangalore', 'Pune', 'Jaipur',
                      'Kochi', 'Guwahati', 'Hyderabad', 'Gachibowli']) {
    it(`${city} → available`, () => expect(coverageFor('financial', city)).toBe('available'))
  }
  for (const city of ['London', 'Dubai', 'Singapore', 'New York', 'Toronto']) {
    it(`${city} → unavailable (we serve India)`, () => expect(coverageFor('financial', city)).toBe('unavailable'))
  }
})

describe('presence · in-person, so Hyderabad Metro only', () => {
  for (const area of ['Hyderabad', 'Secunderabad', 'Gachibowli', 'Madhapur', 'Banjara Hills']) {
    it(`${area} → available`, () => expect(coverageFor('presence', area)).toBe('available'))
  }
  for (const city of ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'London']) {
    it(`${city} → unavailable — we cannot send someone we don't have`, () =>
      expect(coverageFor('presence', city)).toBe('unavailable'))
  }
})

describe('the rule that matters · unknown is NEVER covered, in any domain', () => {
  for (const v of [null, undefined, '', '   ']) {
    it(`financial(${JSON.stringify(v)}) → unknown`, () => expect(coverageFor('financial', v)).toBe('unknown'))
    it(`presence(${JSON.stringify(v)}) → unknown`, () => expect(coverageFor('presence', v)).toBe('unknown'))
  }
  it('a place we have never heard of is not India, and not covered', () => {
    expect(isIndia('Vladivostok')).toBe(false)
    expect(coverageFor('financial', 'Vladivostok')).toBe('unavailable')
    expect(coverageFor('presence', 'Vladivostok')).toBe('unavailable')
  })
})

describe('every served area is Indian by definition', () => {
  // A market can never be added to SERVICE_REGIONS and forgotten in INDIA_AREAS.
  for (const a of ['gachibowli', 'madhapur', 'kondapur', 'hitec city', 'jubilee hills']) {
    it(`${a} is in India`, () => expect(isIndia(a)).toBe(true))
    it(`${a} has presence`, () => expect(presenceFor(a)).toBe('available'))
  }
})

describe('what a family is actually told', () => {
  const said = (t: string) => counsel(readLedger(t)).paragraphs.join(' ')

  it('money in Delhi: YES — and says plainly what we cannot do', () => {
    const p = said('my father needs help with his pension paperwork in Delhi')
    expect(p).toMatch(/anywhere in India/i)
    expect(p).toMatch(/can'?t do outside Hyderabad/i)
    expect(p).not.toMatch(/send a trusted person to sit with/i)   // we cannot be there
  })
  it('money in Hyderabad: someone sits with them', () => {
    expect(said('my father needs help with his tax filing in Hyderabad'))
      .toMatch(/send a trusted person to sit with/i)
  })
  it('money abroad: no claim', () => {
    expect(said('my father needs help with his pension paperwork in London'))
      .not.toMatch(/anywhere in India/i)
  })
  it('health in Delhi: never promises a person', () => {
    const p = said('I need someone to take my father to the hospital in Delhi')
    expect(p).not.toMatch(/anywhere in India/i)
    expect(p).not.toMatch(/Close Eye can put a trusted human on it/i)
  })
  it('legal in Chennai: we did NOT claim lawyers nationwide', () => {
    // FINANCIAL is deliberately narrower than PROFESSIONAL — see ledger.ts.
    expect(said('someone to help my father with a legal notice in Chennai'))
      .not.toMatch(/anywhere in India/i)
  })
  it('money with no city: asks, never assumes', () => {
    expect(said('My father gets stressed every year with his tax filing. Can someone help him?'))
      .not.toMatch(/anywhere in India/i)
  })
})
