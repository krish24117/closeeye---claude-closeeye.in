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
})

/**
 * LEGAL · PASSPORT · VISA — OUT of the India claim. Founder, 2026-07-17.
 *
 * The first cut of FINANCIAL leaked all three through generic admin words: "his PASSPORT
 * PAPERWORK in Delhi" and "FILING a court case in Pune" both claimed India, because
 * "paperwork" and "filing" were on the money list. A word that is only financial in
 * context cannot be allowed to decide what we promise. Both halves are pinned: the
 * excluded domains must never claim India, and money must never stop claiming it.
 */
/**
 * WHOSE CITY — the NRI case. Founder, 2026-07-17: "for NRI the serving city is Hyderabad."
 *
 * The city that matters is where the person we would HELP is, never where the caller is.
 * findCity used to return the LONGEST place-name in the sentence, which got this right by
 * accident and wrong the moment the foreign city had more letters:
 *
 *   "I'm in San Francisco, my father is in Hyderabad"  ->  San Francisco  (13 > 9)
 *
 * — so we would have read the CALLER's city, found no presence, and told an NRI we cannot
 * help their father in the one city we actually serve. A lost customer in the core segment,
 * decided by a string length.
 */
describe('whose city · an Indian city beats a foreign one', () => {
  const cityOf = (t: string) => readLedger(t).city

  it('London caller, father in Hyderabad → Hyderabad', () =>
    expect(cityOf("I'm in London and my father is in Hyderabad, I worry about him")).toBe('Hyderabad'))
  it('Dubai caller, mother in Hyderabad → Hyderabad', () =>
    expect(cityOf('I live in Dubai, my mother is alone in Hyderabad')).toBe('Hyderabad'))
  it('THE ONE THAT WAS BROKEN: a LONGER foreign city must not win', () =>
    expect(cityOf("I'm in San Francisco, my father is in Hyderabad")).toBe('Hyderabad'))
  it('the loved one is not always in Hyderabad — we read Delhi, and promise nothing', () => {
    expect(cityOf("I'm in London, my father is in Delhi")).toBe('Delhi')
    expect(coverageFor('presence', 'Delhi')).toBe('unavailable')
  })
  it('a foreign city alone is still read — it is a place, not a person', () =>
    expect(cityOf('my father lives alone in London')).toBe('London'))
})

describe('whose city · two Indian cities means we do not know, so we ask', () => {
  const cityOf = (t: string) => readLedger(t).city

  it('"I\'m in Hyderabad, my mother is in Delhi" → null, never a guess', () => {
    // Guessing here does not cost a wrong label. It costs a family expecting someone in
    // the wrong city. null makes the engine ask (WHERE_QUESTION).
    expect(cityOf("I'm in Hyderabad, my mother is in Delhi")).toBe(null)
  })
  it('but suburbs of ONE market are not two cities', () =>
    expect(cityOf('my father in Gachibowli, Hyderabad needs someone')).toBe('Gachibowli'))
  it('and "new delhi" is not "delhi" twice', () =>
    expect(cityOf('my father lives in New Delhi')).toBe('New Delhi'))
})

/**
 * "INSURANCE" IS A CATEGORY — when the family names the kind, we KEEP it.
 *
 * The MATTER pattern used to capture "insurance claim" but not the "health" / "car" /
 * "life" in front of it, so "his health insurance claim" was echoed as "His insurance
 * claim." — dropping a word the family wrote, on a line labelled "from your words". An
 * engine that must never invent must equally never discard. (The UNSTATED case — "his
 * insurance claim", no kind — is left bare on purpose: the kind becomes the first
 * enrichment question, spec #2-4.)
 */
describe('insurance subtype is kept, never dropped', () => {
  const matter = (t: string) =>
    readLedger(t).ledger.find((l) => l.label === 'The matter')?.body ?? null

  it('health insurance → kept', () =>
    expect(matter('My father needs help with his health insurance claim')).toBe('His health insurance claim.'))
  it('car insurance → kept', () =>
    expect(matter('My father needs help with his car insurance claim')).toBe('His car insurance claim.'))
  it('life insurance → kept', () =>
    expect(matter('My father needs help with his life insurance policy')).toBe('His life insurance policy.'))
  it('travel insurance → kept', () =>
    expect(matter('My father needs help with his travel insurance')).toBe('His travel insurance.'))
  it('property insurance → kept', () =>
    expect(matter('My mother needs help with her property insurance premium')).toBe('Her property insurance premium.'))
  it('mediclaim is a matter on its own', () =>
    expect(matter('My father needs help with his mediclaim')).toBe('His mediclaim.'))

  it('UNSTATED kind stays bare — the engine does not invent a type', () => {
    expect(matter('My father needs help with his insurance claim')).toBe('His insurance claim.')
    expect(matter('My father needs help with his insurance')).toBe('His insurance.')
  })
  it('a non-adjacent "health" is NOT read as the insurance kind', () => {
    // "his health is bad and he needs insurance" — health is about the man, not the cover.
    expect(matter('my father health is bad and he needs insurance sorted'))
      .toBe('His insurance.')
  })
})

describe('legal / passport / visa are OUT of the India claim', () => {
  const said = (t: string) => counsel(readLedger(t)).paragraphs.join(' ')
  const claimsIndia = (t: string) => /anywhere in India/i.test(said(t))

  for (const t of [
    'my father needs help with his passport paperwork in Delhi',
    'my father needs help renewing his visa in Mumbai',
    'someone to help my father with a legal notice in Chennai',
    'my father needs help filing a court case in Pune',
    'my father needs a lawyer in Bangalore',
    'my father has an immigration problem in Kochi',
    'my father needs help with visa paperwork in Delhi',
  ]) {
    it(`no India claim · ${t.slice(0, 46)}`, () => expect(claimsIndia(t)).toBe(false))
  }

  it('a money word does NOT unlock the claim when an excluded domain is also named', () => {
    // "his passport AND his pension" — the passport is the part we cannot promise
    // nationwide, so the safe reading wins.
    expect(claimsIndia('my father needs help with his passport and his pension in Delhi')).toBe(false)
  })

  it('but an INSURANCE CLAIM is money — "claim" must never be read as a court claim', () => {
    expect(claimsIndia('my mother needs help with her insurance claim in Mumbai')).toBe(true)
  })

  for (const t of [
    'my father needs help with his pension paperwork in Delhi',
    'my father needs help with his tax filing in Delhi',
    'my mother needs help with her bank account in Kolkata',
    'my father needs help with his insurance premium in Chennai',
    'my father needs help with his GST audit in Surat',
  ]) {
    it(`money still claims India · ${t.slice(0, 46)}`, () => expect(claimsIndia(t)).toBe(true))
  }

  it('KNOWN GAP, not a silent one: "provident fund" is money a family will actually say, ' +
     'but PROFESSIONAL does not know the phrase — so it never reaches the money branch and ' +
     'gets the generic errand answer. Widening the claim means widening PROFESSIONAL first, ' +
     'deliberately. Pinned so the gap is visible rather than discovered by a family.', () => {
    expect(claimsIndia('my father needs help with his provident fund in Chennai')).toBe(false)
  })
  it('money with no city: asks, never assumes', () => {
    expect(said('My father gets stressed every year with his tax filing. Can someone help him?'))
      .not.toMatch(/anywhere in India/i)
  })
})
