/**
 * Track 2, Step 1 gate — the Understanding contract enforces the Constitution.
 *
 * Proves the two nets work BEFORE any model exists: the structural guardrail
 * (validateUnderstanding) and the case eval (checkCase). The founding screenshot bug — a city
 * named as the person, an invented need — must be caught. A correct understanding must pass.
 */
import { describe, it, expect } from 'vitest'
import { validateUnderstanding, isValidUnderstanding, type Understanding } from './comprehension'
import { COMPREHENSION_CASES, checkCase } from './comprehension.cases'

const FOUNDING_INPUT = 'My mother is travelling from Hyderabad to Bangalore'

// What a CORRECT understanding of the founding sentence looks like — the target Step 2 must hit.
const correct: Understanding = {
  intent: 'share',
  subject: { who: 'my mother', relationship: 'mother' },
  situation: 'travelling',
  need: 'none_stated',
  locations: { from: 'Hyderabad', to: 'Bangalore' },
  facts: [{ label: 'situation', value: 'travelling from Hyderabad to Bangalore', provenance: 'stated' }],
  confidence: 'high',
  clarifying_question: null,
  safety_signal: false,
}

// The exact bug from the screenshot, expressed in the contract.
const buggy: Understanding = {
  intent: 'share',
  subject: { who: 'Hyderabad', relationship: 'unknown' }, // a CITY in the person slot
  situation: 'unknown',
  need: 'a real-world hand in Hyderabad', // INVENTED — nothing was requested
  locations: { from: 'Hyderabad', to: 'Bangalore' },
  facts: [{ label: 'lives_in', value: 'She lives in Bangalore', provenance: 'stated' }], // fabricated claim
  confidence: 'high',
  clarifying_question: null,
  safety_signal: false,
}

describe('a correct understanding passes both nets', () => {
  it('the structural guardrail is clean', () => {
    expect(validateUnderstanding(correct, FOUNDING_INPUT)).toEqual([])
    expect(isValidUnderstanding(correct, FOUNDING_INPUT)).toBe(true)
  })
  it('the case eval is clean', () => {
    const founding = COMPREHENSION_CASES[0]!
    expect(checkCase(correct, founding)).toEqual([])
  })
})

describe('the screenshot bug is caught — it can never ship', () => {
  const founding = COMPREHENSION_CASES[0]!

  it('the case eval flags a city named as the person', () => {
    const fails = checkCase(buggy, founding)
    expect(fails.some((f) => /place\/thing, not the person/.test(f))).toBe(true)
  })
  it('the structural net flags subject.who == a location', () => {
    expect(validateUnderstanding(buggy, FOUNDING_INPUT).some((v) => v.law === 'L1')).toBe(true)
  })
  it('the structural net flags the fabricated "stated" fact', () => {
    // "She lives in Bangalore" is not what the user typed — a stated fact must trace to their words.
    expect(validateUnderstanding(buggy, FOUNDING_INPUT).some((v) => /fabrication/.test(v.detail))).toBe(true)
  })
  it('the eval flags the invented need', () => {
    expect(checkCase(buggy, founding).some((f) => /invented/.test(f))).toBe(true)
  })
})

describe('unsure ⇒ ask, never assert (Law 2)', () => {
  const unsure: Understanding = { ...correct, confidence: 'low', clarifying_question: null }
  it('low confidence without a question is a violation', () => {
    expect(validateUnderstanding(unsure, FOUNDING_INPUT).some((v) => v.law === 'L2')).toBe(true)
  })
  it('the same, with a question, is clean', () => {
    expect(validateUnderstanding({ ...unsure, clarifying_question: 'Is she moving, or just visiting?' }, FOUNDING_INPUT)).toEqual([])
  })
})

describe('every pinned case is well-formed', () => {
  for (const c of COMPREHENSION_CASES) {
    it(`${c.name} has an input and an expectation`, () => {
      expect(c.input.length).toBeGreaterThan(0)
      expect(Object.keys(c.expect).length).toBeGreaterThan(0)
    })
  }
})
