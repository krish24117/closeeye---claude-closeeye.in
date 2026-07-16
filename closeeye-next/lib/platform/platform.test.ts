import { describe, it, expect } from 'vitest'
import { ENGINEERING_CONSTITUTION } from './constitution'
import { TRUST_THRESHOLD, CONVERSATION_BUDGET, failMode, decideStep } from './trust'
import { HANDOFF_ACTION, type NextAction } from './next-action'
import { readRefusal } from './refusal'
import {
  evaluateDecision, capabilityAvailable, citySupported, membershipRequired, consentRequired,
  type DecisionRule,
} from './decision-policy'

describe('Engineering Constitution', () => {
  it('states the three immutable principles', () => {
    expect(ENGINEERING_CONSTITUTION).toHaveLength(3)
    expect(ENGINEERING_CONSTITUTION[0]).toMatch(/database remembers.*LLM reasons/i)
    expect(ENGINEERING_CONSTITUTION[1]).toMatch(/fail open.*fail safe/i)
    expect(ENGINEERING_CONSTITUTION[2]).toMatch(/one structured NextAction/i)
  })
})

describe('Trust Matrix — fail open vs fail safe', () => {
  it('only infrastructure fails open', () => {
    expect(failMode('infrastructure')).toBe('open')
    for (const cls of ['identity', 'permission', 'memory', 'safety', 'trust'] as const) {
      expect(failMode(cls)).toBe('safe')
    }
  })
})

describe('TRUST_THRESHOLD governs answer / clarify / handoff', () => {
  it('answers at/above the threshold', () => {
    expect(decideStep(1, 0)).toBe('answer')
    expect(decideStep(TRUST_THRESHOLD, 0)).toBe('answer')
  })
  it('clarifies below the threshold, within budget', () => {
    expect(decideStep(0.2, 0)).toBe('clarify')
    expect(decideStep(0.2, CONVERSATION_BUDGET - 1)).toBe('clarify')
  })
  it('hands off when the conversation budget is spent (fails safe to a human)', () => {
    expect(decideStep(0.2, CONVERSATION_BUDGET)).toBe('handoff')
    expect(decideStep(0.2, CONVERSATION_BUDGET + 3)).toBe('handoff')
  })
})

describe('NextAction', () => {
  it('the safe default is a human handoff', () => {
    const a: NextAction = HANDOFF_ACTION
    expect(a.kind).toBe('handoff')
    expect(a.needsHuman).toBe(true)
    expect(a.confidence).toBe(0)
  })
})

describe('Decision Policy — never invent, never silently fail', () => {
  const action: NextAction = { kind: 'execute', confidence: 1, needsHuman: false }
  it('allows when every rule passes', () => {
    const d = evaluateDecision(action, { membershipActive: true, consented: true, city: 'Hyderabad' }, [
      capabilityAvailable(true), citySupported((c) => c === 'Hyderabad'), membershipRequired, consentRequired,
    ])
    expect(d.outcome).toBe('allow')
  })
  it('denies (never allows) when a rule fails, with an honest reason', () => {
    const d = evaluateDecision(action, { membershipActive: false }, [membershipRequired])
    expect(d.outcome).toBe('deny')
    expect(d.reason).toMatch(/active plan/i)
    expect(d.rule).toBe('membershipRequired')
  })
  it('degrades (not deny) when a capability isn’t live', () => {
    const d = evaluateDecision(action, {}, [capabilityAvailable(false)])
    expect(d.outcome).toBe('degrade')
  })
  it('a throwing rule fails SAFE to a deny — never a silent allow', () => {
    const boom: DecisionRule = () => { throw new Error('provider check down') }
    const d = evaluateDecision(action, {}, [boom, capabilityAvailable(true)])
    expect(d.outcome).toBe('deny')
    expect(d.reason).toMatch(/couldn’t complete|real person/i)
  })
})

/**
 * The refusal contract. The failure this guards against is subtle and expensive: a guard
 * writes honest words that offer a person, and the client throws them away and shows
 * "something went wrong" instead — turning a considered decision into an apparent outage.
 */
describe('readRefusal', () => {
  const errWith = (status: number, body: unknown, headers: Record<string, string> = {}) => ({
    context: new Response(JSON.stringify(body), { status, headers }),
  })

  it('carries the server’s own words for a 429', async () => {
    const r = await readRefusal(errWith(429, { message: 'Message us on WhatsApp and a person will pick this up.' }))
    expect(r?.kind).toBe('rate_limited')
    expect(r?.message).toBe('Message us on WhatsApp and a person will pick this up.')
  })

  it('reads a 403 bot check as a verification refusal', async () => {
    const r = await readRefusal(errWith(403, { message: 'We couldn’t confirm that came from a person.' }))
    expect(r?.kind).toBe('verification_failed')
  })

  it('passes through Retry-After when the server set one', async () => {
    const r = await readRefusal(errWith(429, { message: 'Give it a moment.' }, { 'Retry-After': '90' }))
    expect(r?.retryAfter).toBe(90)
  })

  it('never invents words the server did not write', async () => {
    expect(await readRefusal(errWith(429, {}))).toBeNull()          // no message
    expect(await readRefusal(errWith(429, 'not json at all'))).toBeNull()
  })

  it('is not a refusal when the server genuinely broke (500) or the call never landed', async () => {
    expect(await readRefusal(errWith(500, { message: 'boom' }))).toBeNull()
    expect(await readRefusal(new Error('network down'))).toBeNull()
    expect(await readRefusal(null)).toBeNull()
  })
})
