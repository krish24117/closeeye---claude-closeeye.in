/**
 * Family Page v2 — the derivation gate.
 *
 * The one that matters most: the Snapshot NEVER fakes calm. Everything else is
 * deterministic derivation from the graph, pinned so the page can't drift from the
 * Constitution it's meant to express.
 */
import { describe, it, expect } from 'vitest'
import type { LedgerLine, Blank } from '@/lib/connect/ledger'
import {
  deriveSnapshot, deriveRecommendations, groupUnderstanding, categoryOf, askSuggestions,
  type UnderstandingInput,
} from './understanding'

const fact = (label: string, body: string, inferred = false): LedgerLine => ({ label, body, inferred })
const blank = (key: string, text: string): Blank => ({ key, text })

const base = (over: Partial<UnderstandingInput> = {}): UnderstandingInput => ({
  subject: { name: 'Ramesh', relationship: 'father', city: 'Mumbai' },
  gender: 'he', known: [], learned: [], blanks: [], observedCount: 0, ...over,
})

/* the founder's screenshot case */
const RELOCATING = base({
  known: [fact('Someone you love', 'Your father'), fact("What's happening", 'Moving to Ahmedabad'), fact("What's needed", 'Wheelchair')],
  blanks: [blank('call', 'What you call him'), blank('health', 'His health, and what he manages day to day'),
           blank('reach', 'Who can reach him in twenty minutes, if ever needed')],
  subject: { name: 'Ramesh', relationship: 'father', city: 'Ahmedabad' },
})

describe('THE HONESTY GUARANTEE · the Snapshot never fakes calm', () => {
  it('a family known for seven minutes is NEVER "calm" or "safe"', () => {
    const snap = deriveSnapshot(base({ blanks: [blank('health', 'His health')] }), [])
    expect(snap.state).not.toBe('calm')
    expect(snap.headline.toLowerCase()).not.toMatch(/safe|calm|doing well/)
  })
  it('all facts known, but NO visit ever → "settled", not "calm" (nothing pending ≠ he is well)', () => {
    const snap = deriveSnapshot(base({ blanks: [], observedCount: 0 }), [])
    expect(snap.state).toBe('settled')
    expect(snap.headline).toBe('Nothing needs you right now')
    expect(snap.headline).not.toMatch(/well|safe|calm/)
  })
  it('"calm" fires ONLY with a real positive signal — a completed observation', () => {
    const snap = deriveSnapshot(base({ blanks: [], observedCount: 1 }), [])
    expect(snap.state).toBe('calm')
    expect(snap.headline).toMatch(/doing well/)
  })
  it('a critical gap → "action", and says what needs doing', () => {
    const recs = deriveRecommendations(RELOCATING)
    const snap = deriveSnapshot(RELOCATING, recs)
    expect(snap.state).toBe('action')
    expect(snap.headline).toMatch(/detail|add/i)
  })
})

describe('Recommendations · derived from gaps + situation, each with a why', () => {
  it('relocating → book moving assistance to the city (primary)', () => {
    const r = deriveRecommendations(RELOCATING)
    const move = r.find((x) => x.id === 'move')
    expect(move?.text).toBe('Book moving assistance to Ahmedabad')
    expect(move?.tone).toBe('primary')
    expect(move?.critical).toBe(false)
  })
  it('no reachable person → a CRITICAL recommendation (drives the snapshot)', () => {
    const reach = deriveRecommendations(RELOCATING).find((x) => x.id === 'reach')
    expect(reach?.critical).toBe(true)
    expect(reach?.why).toMatch(/NEARBY/)
  })
  it('no health info → a CRITICAL safety recommendation', () => {
    const health = deriveRecommendations(RELOCATING).find((x) => x.id === 'health')
    expect(health?.critical).toBe(true)
    expect(health?.text).toMatch(/his health/i)
  })
  it('a complete graph with no situation → no recommendations, no invented busywork', () => {
    expect(deriveRecommendations(base({ blanks: [], known: [fact('Someone you love', 'Your father')] }))).toEqual([])
  })
})

describe('Understanding · organised into a mental model, never a flat table', () => {
  it('routes labels to the right section', () => {
    expect(categoryOf('Someone you love')).toBe('Identity')
    expect(categoryOf("What's happening")).toBe('Current situation')
    expect(categoryOf('His health, and what he manages day to day')).toBe('Health')
    expect(categoryOf('His age, and the shape of his mornings')).toBe('Daily routine')
    expect(categoryOf('Who can reach him in twenty minutes')).toBe('Support network')
  })
  it('groups facts + blanks into sections with counts', () => {
    const secs = groupUnderstanding(RELOCATING)
    const ids = secs.find((s) => s.category === 'Identity')
    expect(ids?.items.some((x) => x.kind === 'fact')).toBe(true) // "Your father" known
    const health = secs.find((s) => s.category === 'Health')
    expect(health?.learningCount).toBe(1) // health is still an ○
  })
  it('the raw quote ("In your words") is NOT a fact in the model — it is the source', () => {
    const withQuote = base({ known: [{ label: 'In your words', body: 'my dad wants to move', quote: true }] })
    const secs = groupUnderstanding(withQuote)
    const bodies = secs.flatMap((s) => s.items).map((x) => (x.kind === 'fact' ? x.body : x.text))
    expect(bodies).not.toContain('my dad wants to move')
  })
  it('an inferred fact carries provenance "inferred" — never shown as stated', () => {
    const secs = groupUnderstanding(base({ known: [fact('What I think you need', 'company', true)] }))
    const item = secs.flatMap((s) => s.items).find((x) => x.kind === 'fact' && x.body === 'company')
    expect(item && item.kind === 'fact' && item.provenance).toBe('inferred')
  })
})

describe('Ask suggestions · evolve from context', () => {
  it('relocating → offers help with the move', () => {
    expect(askSuggestions(RELOCATING)[0]).toMatch(/move/i)
  })
  it('open blanks → offers "what\'s still missing"; always offers urgency', () => {
    const s = askSuggestions(RELOCATING)
    expect(s).toContain("What's still missing?")
    expect(s).toContain('Is there anything urgent?')
    expect(s.length).toBeLessThanOrEqual(3)
  })
})
