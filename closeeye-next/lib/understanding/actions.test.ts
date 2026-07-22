/**
 * The Action Orchestrator — understanding → decision → action, as PROPOSALS only. These freeze the
 * safety rules: it never marks an action auto-executable unless the family's policy pre-authorised it,
 * it only proposes sharing where policy permits, and it surfaces the right opportunities per context.
 */
import { describe, it, expect } from 'vitest'
import { understandAsset, type PipelineContext } from './pipeline'
import { proposeActions } from './actions'
import { PRIVACY_FIRST_POLICY, type FamilyPolicy } from './policy'
import type { Asset, ConfidenceBand } from './types'
import type { UnderstandingProviders } from './providers'

const hi = { band: 'high' as ConfidenceBand }
const lo = { band: 'low' as ConfidenceBand }
const asset = (o: Partial<Asset> = {}): Asset => ({ id: 'a1', familyId: 'fam1', modality: 'text', mimeType: 'text/plain', uri: 'x', uploadedBy: 'u1', uploadedAt: '2026-07-22T00:00:00Z', text: 'some text', ...o })
const base: PipelineContext = { lovedOnes: [{ id: 'lo1', name: 'Amma' }] }

function providers(over: Partial<UnderstandingProviders>): UnderstandingProviders {
  const b: UnderstandingProviders = {
    classifier: { name: 't', async classify() { return { assetType: 'unknown', confidence: lo } } },
    vision: { name: 't', async describeImage() { return { description: '', labels: [], confidence: lo } } },
    ocr: { name: 't', async extractText() { return { text: '', confidence: lo } } },
    document: { name: 't', async understand() { return { summary: '', extractions: [] } } },
    speech: { name: 't', async transcribe() { return { transcript: '', confidence: lo } } },
    reasoning: { name: 't', async reason() { return { subject: { lovedOneId: null, displayName: 'your family', confidence: lo, reason: '' }, memories: [], events: [] } } },
    translation: null, medical: null, video: null, embedding: null, recommendation: null, notification: null,
  }
  return { ...b, ...over }
}

const prescription = providers({
  classifier: { name: 't', async classify() { return { assetType: 'prescription', confidence: hi } } },
  document: { name: 't', async understand() { return { summary: 'Prescription', extractions: [] } } },
  reasoning: { name: 't', async reason() { return {
    subject: { lovedOneId: 'lo1', displayName: 'Amma', confidence: hi, reason: 'named' },
    memories: [{ statement: 'Amma takes Metformin', memoryType: 'medical', confidence: hi }],
    events: [{ kind: 'renewal', title: 'Prescription renewal', at: '2026-08-01', forReminder: true, confidence: hi }],
  } } },
})

describe('Action Orchestrator — proposes, never executes', () => {
  it('offers the right moves for a health prescription (share, reminder, book presence, compare)', async () => {
    const r = await understandAsset(asset(), { ...base, providers: prescription })
    const actions = proposeActions(r, { policy: PRIVACY_FIRST_POLICY, careAvailable: true })
    const kinds = actions.map((a) => a.kind)
    expect(kinds).toContain('set_reminder')          // renewal event, forReminder
    expect(kinds).toContain('share')                 // health → family
    expect(kinds).toContain('book_trusted_presence') // care available + health
    expect(kinds).toContain('compare_knowledge')     // a medical memory
  })

  it('NEVER marks an action auto-executable unless policy pre-authorised it', async () => {
    const r = await understandAsset(asset(), { ...base, providers: prescription })
    const none = proposeActions(r, { policy: PRIVACY_FIRST_POLICY, careAvailable: true })
    expect(none.every((a) => a.autoExecutable === false)).toBe(true)

    const withAuto: FamilyPolicy = { ...PRIVACY_FIRST_POLICY, autoActions: ['set_reminder'] }
    const permitted = proposeActions(r, { policy: withAuto, careAvailable: true })
    expect(permitted.find((a) => a.kind === 'set_reminder')!.autoExecutable).toBe(true)
    expect(permitted.find((a) => a.kind === 'share')!.autoExecutable).toBe(false) // only what was authorised
  })

  it('does NOT propose sharing a private domain (identity)', async () => {
    const r = await understandAsset(asset(), { ...base, providers: providers({
      classifier: { name: 't', async classify() { return { assetType: 'id_proof', confidence: hi } } },
      reasoning: { name: 't', async reason() { return { subject: { lovedOneId: 'lo1', displayName: 'Amma', confidence: hi, reason: 'named' }, memories: [], events: [] } } },
    }) })
    expect(r.policy.sharing).toBe('private')
    expect(proposeActions(r, { policy: PRIVACY_FIRST_POLICY }).map((a) => a.kind)).not.toContain('share')
  })

  it('proposes requesting missing information when the subject is unresolved', async () => {
    const r = await understandAsset(asset(), { ...base, providers: providers({
      classifier: { name: 't', async classify() { return { assetType: 'medical_report', confidence: hi } } },
      reasoning: { name: 't', async reason() { return { subject: { lovedOneId: 'lo1', displayName: 'Amma', confidence: { band: 'medium' }, reason: 'maybe' }, memories: [], events: [] } } },
    }) })
    expect(proposeActions(r, { policy: PRIVACY_FIRST_POLICY }).map((a) => a.kind)).toContain('request_information')
  })
})
