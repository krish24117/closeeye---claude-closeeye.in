/**
 * The three CloseEye-owned engines that the AI plugs INTO (not the other way round): Intent, Domain,
 * Family Policy. Their behaviour is the platform's — deterministic and stable no matter which model
 * is wired underneath.
 */
import { describe, it, expect } from 'vitest'
import { defaultIntentEngine } from './intent'
import { defaultDomainEngine } from './domains'
import { evaluatePolicy, policyFor, PRIVACY_FIRST_POLICY, type FamilyPolicy } from './policy'
import type { Asset } from './types'

const anAsset: Asset = { id: 'a', familyId: 'f', modality: 'image', mimeType: 'image/jpeg', uri: 'x', uploadedBy: 'u', uploadedAt: '2026-07-22T00:00:00Z' }

describe('Intent Engine — clarify rather than assume', () => {
  it('takes an explicit choice as truth', () => {
    expect(defaultIntentEngine.understand({ explicit: 'remind' }).kind).toBe('remind')
  })
  it('understands a question as wanting an answer', () => {
    expect(defaultIntentEngine.understand({ text: 'What medicines is Mom on?' }).kind).toBe('answer')
  })
  it('reads time-bound language as a reminder', () => {
    expect(defaultIntentEngine.understand({ text: 'Passport expires next month' }).kind).toBe('remind')
  })
  it('a bare file with no context ASKS instead of guessing', () => {
    const i = defaultIntentEngine.understand({ asset: anAsset })
    expect(i.kind).toBe('unknown')
    expect(i.clarification?.question).toBeTruthy()
  })
})

describe('Domain Engine — knowledge organises into life domains', () => {
  it('maps asset types to their life domain', () => {
    expect(defaultDomainEngine.forAssetType('prescription')).toBe('health')
    expect(defaultDomainEngine.forAssetType('id_proof')).toBe('identity')
    expect(defaultDomainEngine.forAssetType('insurance_document')).toBe('finance')
    expect(defaultDomainEngine.forAssetType('photo')).toBe('memories')
    expect(defaultDomainEngine.forAssetType('visit_summary')).toBe('trusted_presence')
  })
  it('maps memory types to their life domain', () => {
    expect(defaultDomainEngine.forMemoryType('medical')).toBe('health')
    expect(defaultDomainEngine.forMemoryType('identity')).toBe('identity')
    expect(defaultDomainEngine.forMemoryType('routine')).toBe('household')
  })
})

describe('Family Policy Engine — the family rules win', () => {
  it('privacy-first defaults: identity private, health family-wide, trusted-presence reaches Guardians', () => {
    expect(policyFor(PRIVACY_FIRST_POLICY, 'identity').sharing).toBe('private')
    expect(evaluatePolicy(PRIVACY_FIRST_POLICY, 'share', 'identity').allow).toBe(false)
    expect(evaluatePolicy(PRIVACY_FIRST_POLICY, 'share', 'health').allow).toBe(true)
    expect(evaluatePolicy(PRIVACY_FIRST_POLICY, 'share', 'trusted_presence').allow).toBe(true)
  })
  it('a family can turn inference off for one domain without affecting others', () => {
    const p: FamilyPolicy = {
      ...PRIVACY_FIRST_POLICY,
      domains: { ...PRIVACY_FIRST_POLICY.domains, health: { allowInference: false, allowStore: true, retentionDays: null, sharing: 'family' } },
    }
    expect(evaluatePolicy(p, 'reason', 'health').allow).toBe(false)
    expect(evaluatePolicy(p, 'reason', 'finance').allow).toBe(true)
  })
})
