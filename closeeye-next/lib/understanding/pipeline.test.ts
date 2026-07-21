/**
 * The understanding pipeline's contract, frozen — the family-knowledge OS behaves predictably as
 * providers and media evolve:
 *  • Uncertain inferences are never stored silently — they become confirmation requests.
 *  • Only high-confidence, verified understanding links to a person, the timeline, and the graph.
 *  • Classify-before-extract, specialised medical routing, evidence strength, memory ageing and event
 *    detection all hold — and the pipeline stays provider-agnostic (swap changes output, not rules).
 */
import { describe, it, expect } from 'vitest'
import { understandAsset, isStale, type PipelineContext } from './pipeline'
import { PRIVACY_FIRST_POLICY, type FamilyPolicy } from './policy'
import type { Asset, ConfidenceBand, Freshness } from './types'
import type { UnderstandingProviders } from './providers'

const hi = { band: 'high' as ConfidenceBand }
const med = { band: 'medium' as ConfidenceBand }
const lo = { band: 'low' as ConfidenceBand }

const asset = (o: Partial<Asset> = {}): Asset => ({
  id: 'a1', familyId: 'fam1', modality: 'text', mimeType: 'text/plain',
  uri: 'x', uploadedBy: 'u1', uploadedAt: '2026-07-22T00:00:00Z', text: 'some text', ...o,
})
const ctx: PipelineContext = { lovedOnes: [{ id: 'lo1', name: 'Amma' }] }

function providers(over: Partial<UnderstandingProviders>): UnderstandingProviders {
  const base: UnderstandingProviders = {
    classifier: { name: 't', async classify() { return { assetType: 'unknown', confidence: lo } } },
    vision: { name: 't', async describeImage() { return { description: '', labels: [], confidence: lo } } },
    ocr: { name: 't', async extractText() { return { text: '', confidence: lo } } },
    document: { name: 't', async understand() { return { summary: '', extractions: [] } } },
    speech: { name: 't', async transcribe() { return { transcript: '', confidence: lo } } },
    reasoning: { name: 't', async reason() { return { subject: { lovedOneId: null, displayName: 'your family', confidence: lo, reason: '' }, memories: [], events: [] } } },
    translation: null, medical: null, video: null, embedding: null, recommendation: null, notification: null,
  }
  return { ...base, ...over }
}

describe('understandAsset — trust contract', () => {
  it('never stores an uncertain inference — it asks instead', async () => {
    const r = await understandAsset(asset(), { ...ctx, providers: providers({
      reasoning: { name: 't', async reason() { return {
        subject: { lovedOneId: 'lo1', displayName: 'Amma', confidence: med, reason: 'maybe' },
        memories: [{ statement: 'Amma has diabetes', memoryType: 'medical', confidence: med }], events: [],
      } } },
    }) })
    expect(r.verified.memories).toHaveLength(0)
    expect(r.verified.subject).toBeNull()
    expect(r.timeline.lovedOneId).toBeNull()
    expect(r.pending.map((p) => p.id)).toEqual(['memory:0', 'subject'])
  })

  it('verifies, links, timelines, dates by event, and graphs a high-confidence reading', async () => {
    const r = await understandAsset(asset(), { ...ctx, providers: providers({
      classifier: { name: 't', async classify() { return { assetType: 'prescription', confidence: hi } } },
      document: { name: 't', async understand() { return { summary: 'Prescription for Metformin', extractions: [{ field: 'medication', value: 'Metformin', confidence: hi, observedAt: '2026-07-01' }] } } },
      reasoning: { name: 't', async reason() { return {
        subject: { lovedOneId: 'lo1', displayName: 'Amma', confidence: hi, reason: 'named on it' },
        memories: [{ statement: 'Amma takes Metformin', memoryType: 'medical', confidence: hi }],
        events: [{ kind: 'doctor_visit', title: 'Prescription issued', at: '2026-07-01', forReminder: false, confidence: hi }],
      } } },
    }) })
    expect(r.verified.memories).toHaveLength(1)
    expect(r.verified.memories[0]!.evidenceStrength).toBe('ai_inferred')
    expect(r.verified.memories[0]!.freshness.permanence).toBe('temporary') // medical ages
    expect(r.verified.events).toHaveLength(1)
    expect(r.verified.subject?.lovedOneId).toBe('lo1')
    expect(r.timeline.lovedOneId).toBe('lo1')
    expect(r.timeline.at).toBe('2026-07-01')
    expect(r.timeline.eventKind).toBe('doctor_visit')
    expect(r.understanding.assetType).toBe('prescription')
    expect(r.verified.graph.edges).toContainEqual({ from: 'person:lo1', to: 'asset:a1', type: 'has_asset' })
    expect(r.pending).toHaveLength(0)
    expect(r.policy.domain).toBe('health')   // prescription → health domain
    expect(r.policy.reasoned).toBe(true)
    expect(r.policy.stored).toBe(true)
  })

  it('with no real providers configured, stores nothing', async () => {
    const r = await understandAsset(asset(), { ...ctx, providers: providers({}) })
    expect(r.verified.memories).toHaveLength(0)
    expect(r.verified.subject).toBeNull()
    expect(r.timeline.lovedOneId).toBeNull()
  })
})

describe('understandAsset — platform capabilities', () => {
  it('classifies then routes medical assets to the specialised extractor', async () => {
    const r = await understandAsset(asset(), { ...ctx, providers: providers({
      classifier: { name: 't', async classify() { return { assetType: 'lab_report', confidence: hi } } },
      document: { name: 't', async understand() { return { summary: 'DOC', extractions: [] } } },
      medical: { name: 't', async extract() { return { summary: 'MEDICAL', extractions: [] } } },
    }) })
    expect(r.understanding.summary).toBe('MEDICAL') // medical provider won the route
  })

  it('stamps evidence strength from HOW the text was obtained', async () => {
    const withDoc = providers({ document: { name: 't', async understand() { return { summary: '', extractions: [{ field: 'f', value: 'v', confidence: hi }] } } } })
    const typed = await understandAsset(asset({ text: 'typed by user' }), { ...ctx, providers: withDoc })
    expect(typed.understanding.extractions[0]!.evidenceStrength).toBe('user_entered')
    const scanned = await understandAsset(asset({ modality: 'pdf', mimeType: 'application/pdf', text: undefined }), {
      ...ctx, providers: providers({ ...withDoc, ocr: { name: 't', async extractText() { return { text: 'scanned', confidence: hi } } } }),
    })
    expect(scanned.understanding.extractions[0]!.evidenceStrength).toBe('ocr_extracted')
  })

  it('routes audio through speech-to-text before understanding', async () => {
    const r = await understandAsset(asset({ modality: 'audio', mimeType: 'audio/m4a', text: undefined }), { ...ctx, providers: providers({
      classifier: { name: 't', async classify() { return { assetType: 'voice_note', confidence: hi } } },
      speech: { name: 't', async transcribe() { return { transcript: 'Amma slept well', confidence: hi } } },
      document: { name: 't', async understand(i) { return { summary: i.text, extractions: [] } } },
    }) })
    expect(r.understanding.summary).toBe('Amma slept well')
    expect(r.understanding.assetType).toBe('voice_note')
  })

  it('surfaces recommendations + notifications only when those providers exist', async () => {
    const r = await understandAsset(asset(), { ...ctx, providers: providers({
      recommendation: { name: 't', async recommend() { return [{ text: 'Review meds', kind: 'health', confidence: hi }] } },
      notification: { name: 't', async evaluate() { return [{ title: 'Renewal', body: 'soon', kind: 'reminder' }] } },
    }) })
    expect(r.recommendations).toHaveLength(1)
    expect(r.notifications).toHaveLength(1)
    const bare = await understandAsset(asset(), { ...ctx, providers: providers({}) })
    expect(bare.recommendations).toEqual([])
    expect(bare.notifications).toEqual([])
  })

  it('ages memory: permanent never stales, temporary does', () => {
    const permanent: Freshness = { permanence: 'permanent', observedAt: '2020-01-01T00:00:00Z' }
    const temporary: Freshness = { permanence: 'temporary', observedAt: '2026-01-01T00:00:00Z', staleAfterDays: 180 }
    expect(isStale(permanent, '2026-07-22T00:00:00Z')).toBe(false)
    expect(isStale(temporary, '2026-07-22T00:00:00Z')).toBe(true)  // > 180 days later
  })
})

describe('understandAsset — the Family Policy Engine runs before reasoning + storage', () => {
  const highReading = providers({
    classifier: { name: 't', async classify() { return { assetType: 'medical_report', confidence: hi } } },
    document: { name: 't', async understand() { return { summary: 'A report', extractions: [] } } },
    reasoning: { name: 't', async reason() { return {
      subject: { lovedOneId: 'lo1', displayName: 'Amma', confidence: hi, reason: 'named' },
      memories: [{ statement: 'Amma has high BP', memoryType: 'medical', confidence: hi }], events: [],
    } } },
  })
  const overrideHealth = (o: Partial<{ allowInference: boolean; allowStore: boolean }>): FamilyPolicy => ({
    ...PRIVACY_FIRST_POLICY,
    domains: { ...PRIVACY_FIRST_POLICY.domains, health: { allowInference: true, allowStore: true, retentionDays: null, sharing: 'family', ...o } },
  })

  it('skips AI inference entirely when the family turned it off for that domain', async () => {
    const r = await understandAsset(asset(), { ...ctx, providers: highReading, policy: overrideHealth({ allowInference: false }) })
    expect(r.policy.reasoned).toBe(false)
    expect(r.understanding.memoryCandidates).toHaveLength(0) // reasoning never ran
    expect(r.verified.memories).toHaveLength(0)
    expect(r.verified.subject).toBeNull()
  })

  it('reasons but stores nothing (no memory, no confirmation, no graph facts) when storage is off', async () => {
    const r = await understandAsset(asset(), { ...ctx, providers: highReading, policy: overrideHealth({ allowStore: false }) })
    expect(r.policy.reasoned).toBe(true)
    expect(r.policy.stored).toBe(false)
    expect(r.verified.memories).toHaveLength(0)
    expect(r.pending.filter((p) => p.id.startsWith('memory'))).toHaveLength(0) // don't even ask
    expect(r.verified.graph.edges).toHaveLength(0)                              // nothing linked
  })
})
