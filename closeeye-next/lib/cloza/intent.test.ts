/**
 * The intent layer is what makes Cloza a conversation, not a search box. This freezes the behaviours
 * the founder review requires: capability mapping, follow-ups that inherit the prior turn, city detection
 * and comparison — and honest "unknown" when there's nothing to go on.
 */
import { describe, it, expect } from 'vitest'
import { resolveIntent } from './intent'
import type { ClozaScope, ClozaTurn, ClozaAnswer } from './types'

const scope: ClozaScope = { role: 'founder', userName: 'Krishna', dateRange: { label: 'today' } }
const turn = (capability: string): ClozaTurn => ({ question: 'q', answer: { title: 't', segments: [], source: 's', capability } as ClozaAnswer })

describe('resolveIntent — context-aware, multi-turn', () => {
  it('maps a fresh question to its capability', () => {
    expect(resolveIntent(scope, 'how’s revenue looking?').capability).toBe('revenue')
    expect(resolveIntent(scope, 'how are we growing?').capability).toBe('growth')
    expect(resolveIntent(scope, 'what should I do next?').capability).toBe('actions')
  })

  it('a follow-up "break that down by city" inherits the previous turn', () => {
    const i = resolveIntent(scope, 'break that down by city', [turn('revenue')])
    expect(i.capability).toBe('revenue') // inherited — the refinement carried no capability of its own
    expect(i.breakdown).toBe('city')
    expect(i.isFollowUp).toBe(true)
  })

  it('"compare Hyderabad with Bangalore" detects both cities and inherits capability', () => {
    const i = resolveIntent(scope, 'compare Hyderabad with Bangalore', [turn('growth')])
    expect(i.capability).toBe('growth')
    expect(i.breakdown).toBe('city')
    expect(i.compare).toEqual(['Hyderabad', 'Bangalore'])
  })

  it('carries scope city when the question doesn’t name one', () => {
    const scoped: ClozaScope = { ...scope, city: 'Hyderabad' }
    expect(resolveIntent(scoped, 'how’s revenue?').city).toBe('Hyderabad')
  })

  it('is honest when there’s nothing to inherit or match', () => {
    expect(resolveIntent(scope, 'tell me a joke').capability).toBe('unknown')
    expect(resolveIntent(scope, 'break that down', []).capability).toBe('unknown') // no prior turn
  })
})
