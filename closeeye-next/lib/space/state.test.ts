/**
 * Sprint 2 gate — the Workspace State Model. The priority ladder must never mask a more urgent
 * state, and calm is never claimed without a positive signal (the honesty guarantee).
 */
import { describe, it, expect } from 'vitest'
import { derivePersonState, rollUp, stateMeta, type WorkspaceState } from './state'

const base = { hasPositiveSignal: true, openEssentialBlanks: 0, hasActiveVisit: false, hasEmergency: false }

describe('derivePersonState — strict priority ladder', () => {
  it('emergency beats everything', () => {
    expect(derivePersonState({ ...base, hasEmergency: true, hasActiveVisit: true, openEssentialBlanks: 3 })).toBe('emergency')
  })
  it('active care beats attention', () => {
    expect(derivePersonState({ ...base, hasActiveVisit: true, openEssentialBlanks: 2 })).toBe('active_care')
  })
  it('attention when essential blanks are open', () => {
    expect(derivePersonState({ ...base, openEssentialBlanks: 1 })).toBe('needs_attention')
  })
  it('a settled person with a positive signal is healthy', () => {
    expect(derivePersonState(base)).toBe('healthy')
  })
})

describe('the honesty guarantee — never fake calm', () => {
  it('no positive signal → getting to know, not healthy', () => {
    expect(derivePersonState({ ...base, hasPositiveSignal: false })).toBe('getting_to_know')
  })
  it('a brand-new person (no signals at all) is getting to know', () => {
    expect(derivePersonState({ hasPositiveSignal: false, openEssentialBlanks: 0, hasActiveVisit: false, hasEmergency: false })).toBe('getting_to_know')
  })
})

describe('rollUp — the Workspace shows the most urgent person', () => {
  it('empty family → getting to know', () => {
    expect(rollUp([])).toBe('getting_to_know')
  })
  it('one emergency among calm people wins', () => {
    expect(rollUp(['healthy', 'healthy', 'emergency', 'getting_to_know'])).toBe('emergency')
  })
  it('attention outranks getting-to-know and healthy', () => {
    expect(rollUp(['healthy', 'getting_to_know', 'needs_attention'])).toBe('needs_attention')
  })
  it('all calm rolls up to healthy', () => {
    expect(rollUp(['healthy', 'healthy'])).toBe('healthy')
  })
})

describe('stateMeta covers every state with a tone + label', () => {
  const all: WorkspaceState[] = ['getting_to_know', 'healthy', 'needs_attention', 'active_care', 'emergency', 'resolved']
  for (const s of all) {
    it(`${s} has a label and a tone`, () => {
      const m = stateMeta(s)
      expect(m.label.length).toBeGreaterThan(0)
      expect(['calm', 'learning', 'attention', 'active', 'critical']).toContain(m.tone)
    })
  }
})
