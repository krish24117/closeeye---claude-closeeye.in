/**
 * Track 2, Step 2 gate — the comprehension core. Proven with a MOCK model (no LLM key): a good
 * output is passed through; a fabricating, malformed, or erroring output NEVER reaches the user —
 * it becomes the ask-fallback. And the eval wiring scores a "capable" mock as passing.
 */
import { describe, it, expect } from 'vitest'
import { comprehend, parseUnderstanding, evaluateComprehension, type ModelCaller } from './comprehend'
import { isValidUnderstanding } from './comprehension'

const FOUNDING = 'My mother is travelling from Hyderabad to Bangalore'

const goodJSON = JSON.stringify({
  intent: 'share',
  subject: { who: 'my mother', relationship: 'mother' },
  situation: 'travelling',
  need: 'none_stated',
  locations: { from: 'Hyderabad', to: 'Bangalore' },
  facts: [{ label: 'situation', value: 'travelling from Hyderabad to Bangalore', provenance: 'stated' }],
  confidence: 'high',
  clarifying_question: null,
  reflection: null,
  safety_signal: false,
})

const buggyJSON = JSON.stringify({
  intent: 'share',
  subject: { who: 'Hyderabad', relationship: 'unknown' }, // a city as the person
  situation: 'unknown',
  need: 'a real-world hand',
  locations: { from: 'Hyderabad', to: 'Bangalore' },
  facts: [{ label: 'lives_in', value: 'She lives in Bangalore', provenance: 'stated' }],
  confidence: 'high',
  clarifying_question: null,
  reflection: null,
  safety_signal: false,
})

const mock = (reply: string): ModelCaller => async () => reply

describe('parseUnderstanding', () => {
  it('parses a clean JSON reply', () => {
    expect(parseUnderstanding(goodJSON)?.subject.who).toBe('my mother')
  })
  it('tolerates code fences and surrounding prose', () => {
    expect(parseUnderstanding('Here you go:\n```json\n' + goodJSON + '\n```')?.subject.who).toBe('my mother')
  })
  it('returns null on non-JSON', () => {
    expect(parseUnderstanding('sorry, I cannot')).toBeNull()
  })
})

describe('comprehend never lets a bad understanding through', () => {
  it('a good model reply passes and is valid', async () => {
    const u = await comprehend(FOUNDING, mock(goodJSON))
    expect(u.subject.who).toBe('my mother')
    expect(u.locations.from).toBe('Hyderabad')
    expect(isValidUnderstanding(u, FOUNDING)).toBe(true)
  })
  it('a fabricating reply is discarded → ask-fallback', async () => {
    const u = await comprehend(FOUNDING, mock(buggyJSON))
    expect(u.intent).toBe('unclear')
    expect(u.clarifying_question).toBeTruthy()
    expect(u.subject.who).not.toBe('Hyderabad')
  })
  it('a malformed reply → ask-fallback', async () => {
    const u = await comprehend(FOUNDING, mock('not json at all'))
    expect(u.intent).toBe('unclear')
    expect(u.clarifying_question).toBeTruthy()
  })
  it('a model error → ask-fallback', async () => {
    const throwing: ModelCaller = async () => { throw new Error('timeout') }
    const u = await comprehend(FOUNDING, throwing)
    expect(u.intent).toBe('unclear')
  })
})

describe('the eval scores a capable model as passing', () => {
  // A "capable" mock: returns a correct understanding per case (what the real model must do).
  const capable: ModelCaller = async (_system, user) => {
    if (/travelling from hyderabad to bangalore/i.test(user))
      return JSON.stringify({ intent: 'share', subject: { who: 'my mother', relationship: 'mother' }, situation: 'travelling', need: 'none_stated', locations: { from: 'Hyderabad', to: 'Bangalore' }, facts: [], confidence: 'high', clarifying_question: null, safety_signal: false })
    if (/shifting my father to chennai/i.test(user))
      return JSON.stringify({ intent: 'share', subject: { who: 'my father', relationship: 'father' }, situation: 'moving', need: 'none_stated', locations: { to: 'Chennai' }, facts: [], confidence: 'high', clarifying_question: null, safety_signal: false })
    if (/insurance/i.test(user))
      return JSON.stringify({ intent: 'request_help', subject: { who: 'my mother', relationship: 'mother' }, situation: 'insurance renewal', need: 'renew insurance', locations: {}, facts: [], confidence: 'high', clarifying_question: null, safety_signal: false })
    // 'Amma' — ambiguous, must ask
    return JSON.stringify({ intent: 'unclear', subject: { who: 'unknown', relationship: 'unknown' }, situation: 'unknown', need: 'unknown', locations: {}, facts: [], confidence: 'low', clarifying_question: 'Who is Amma to you?', safety_signal: false })
  }

  it('all pinned cases pass with a capable model', async () => {
    const results = await evaluateComprehension(capable)
    const failing = results.filter((r) => r.fails.length > 0)
    expect(failing, JSON.stringify(failing, null, 2)).toEqual([])
  })

  it('an incapable model (city-as-person) fails the founding case', async () => {
    const results = await evaluateComprehension(mock(buggyJSON))
    expect(results[0]!.fails.length).toBeGreaterThan(0) // coerced to ask → loses the expected locations
  })
})
