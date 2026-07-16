import { describe, it, expect } from 'vitest'
import { ENGINEERING_CONSTITUTION } from './constitution'
import { TRUST_THRESHOLD, CONVERSATION_BUDGET, failMode, decideStep } from './trust'
import { HANDOFF_ACTION, type NextAction } from './next-action'
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
