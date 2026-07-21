/**
 * The Context Resolution Engine — CloseEye remembering CONTEXT, not conversations. These freeze the
 * founder's own examples: a corporate ask belongs to Business (not Family), an ambiguous legal ask is
 * clarified, a reminder without a subject asks whose, a property-tax doc resolves Space/Subject/Domain,
 * and context carries across a conversation.
 */
import { describe, it, expect } from 'vitest'
import { defaultContextEngine } from './context'
import type { AssetType, ConversationContext } from './types'

const sig = (text: string, assetType?: AssetType) => ({ text, assetType, lovedOnes: [{ id: 'lo1', name: 'Amma' }] })

describe('Context Resolution Engine — Space · Subject · Intent · Domain', () => {
  it('resolves a corporate ask to the BUSINESS space, not family', () => {
    const r = defaultContextEngine.resolve(sig('book a corporate lawyer'))
    expect(r.space.value).toBe('business')
    expect(r.domain).toBe('legal')
  })

  it('asks business-or-personal when a legal ask is ambiguous', () => {
    const r = defaultContextEngine.resolve(sig('I need a lawyer'))
    expect(r.resolved).toBe(false)
    expect(r.clarifications.some((c) => /business or personal/i.test(c.question))).toBe(true)
  })

  it('asks WHOSE when a reminder needs a subject it cannot resolve', () => {
    const r = defaultContextEngine.resolve(sig('renew passport'))
    expect(r.intent.kind).toBe('remind')
    expect(r.domain).toBe('identity')
    expect(r.clarifications.some((c) => /who/i.test(c.question))).toBe(true)
  })

  it('resolves a business document — business space, company subject', () => {
    const r = defaultContextEngine.resolve(sig('Board meeting minutes — Acme company Q3', 'general_document'))
    expect(r.space.value).toBe('business')
    expect(r.subject.entityKind).toBe('company')
  })

  it('resolves a property-tax doc — property space, finance domain, reminder', () => {
    const r = defaultContextEngine.resolve(sig('Property tax due — Hyderabad house', 'invoice'))
    expect(r.space.value).toBe('property')
    expect(r.domain).toBe('finance')
    expect(r.subject.entityKind).toBe('property')
    expect(r.intent.kind).toBe('remind')
  })

  it('links a named family member as the subject', () => {
    const r = defaultContextEngine.resolve(sig('How is Amma doing?'))
    expect(r.subject.type).toBe('person')
    expect(r.subject.id).toBe('lo1')
  })

  it('carries context across a conversation (continuity)', () => {
    const c0: ConversationContext = { id: 'c1' }
    const r1 = defaultContextEngine.resolve(sig('I need a lawyer'), c0)
    expect(r1.resolved).toBe(false) // asks business or personal
    const c1 = defaultContextEngine.advance(c0, { dimension: 'space', value: 'business' })
    const r2 = defaultContextEngine.resolve(sig('I need a lawyer'), c1)
    expect(r2.space.value).toBe('business') // inherited — no need to re-ask
    expect(r2.resolved).toBe(true)
  })
})
