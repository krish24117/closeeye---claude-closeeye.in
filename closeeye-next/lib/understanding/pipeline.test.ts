/**
 * The understanding pipeline's TRUST CONTRACT, frozen:
 *  • Uncertain inferences are never stored silently — they become confirmation requests.
 *  • Only high-confidence, verified understanding links to a person, the timeline and the graph.
 *  • The pipeline is provider-agnostic — swapping providers changes the output, never the rules.
 */
import { describe, it, expect } from 'vitest'
import { understandAsset, type PipelineContext } from './pipeline'
import type { Asset, ConfidenceBand } from './types'
import type { UnderstandingProviders } from './providers'

const hi = { band: 'high' as ConfidenceBand }
const lo = { band: 'low' as ConfidenceBand }

const asset = (o: Partial<Asset> = {}): Asset => ({
  id: 'a1', familyId: 'fam1', modality: 'text', mimeType: 'text/plain',
  uri: 'x', uploadedBy: 'u1', uploadedAt: '2026-07-22T00:00:00Z', text: 'some text', ...o,
})
const ctx: PipelineContext = { lovedOnes: [{ id: 'lo1', name: 'Amma' }] }

function providers(over: Partial<UnderstandingProviders>): UnderstandingProviders {
  const base: UnderstandingProviders = {
    vision: { name: 't', async describeImage() { return { description: '', labels: [], confidence: lo } } },
    ocr: { name: 't', async extractText() { return { text: '', confidence: lo } } },
    document: { name: 't', async understand() { return { assetType: 'unknown', assetTypeConfidence: lo, summary: '', extractions: [] } } },
    speech: { name: 't', async transcribe() { return { transcript: '', confidence: lo } } },
    embedding: null,
    reasoning: { name: 't', async reason() { return { subject: { lovedOneId: null, displayName: 'your family', confidence: lo, reason: '' }, memoryCandidates: [] } } },
  }
  return { ...base, ...over }
}

describe('understandAsset — the trust contract', () => {
  it('never stores an uncertain inference — it asks instead', async () => {
    const r = await understandAsset(asset(), {
      ...ctx,
      providers: providers({
        reasoning: { name: 't', async reason() {
          return {
            subject: { lovedOneId: 'lo1', displayName: 'Amma', confidence: { band: 'medium' }, reason: 'maybe' },
            memoryCandidates: [{ statement: 'Amma has diabetes', kind: 'fact', confidence: { band: 'medium' }, extractions: [] }],
          }
        } },
      }),
    })
    expect(r.verified.memories).toHaveLength(0)
    expect(r.verified.subject).toBeNull()
    expect(r.timeline.lovedOneId).toBeNull()          // unlinked until confirmed
    expect(r.pending.map((p) => p.id)).toEqual(['memory:0', 'subject'])
    expect(r.pending[0]!.prompt).toContain('Amma has diabetes')
  })

  it('verifies, links, timelines and graphs a high-confidence reading', async () => {
    const r = await understandAsset(asset(), {
      ...ctx,
      providers: providers({
        document: { name: 't', async understand() {
          return {
            assetType: 'prescription', assetTypeConfidence: hi, summary: 'Prescription for Metformin',
            extractions: [{ field: 'medication', value: 'Metformin', confidence: hi, observedAt: '2026-07-01' }],
          }
        } },
        reasoning: { name: 't', async reason() {
          return {
            subject: { lovedOneId: 'lo1', displayName: 'Amma', confidence: hi, reason: 'named on the prescription' },
            memoryCandidates: [{ statement: 'Amma takes Metformin', kind: 'fact', confidence: hi, extractions: [] }],
          }
        } },
      }),
    })
    expect(r.verified.memories).toHaveLength(1)
    expect(r.verified.subject?.lovedOneId).toBe('lo1')
    expect(r.timeline.lovedOneId).toBe('lo1')
    expect(r.timeline.at).toBe('2026-07-01')          // dated by the report, not the upload
    expect(r.timeline.assetType).toBe('prescription')
    expect(r.verified.graph.edges).toContainEqual({ from: 'person:lo1', to: 'asset:a1', type: 'has_asset' })
    expect(r.pending).toHaveLength(0)
  })

  it('with no real providers configured, stores nothing (uncertain-by-default)', async () => {
    const r = await understandAsset(asset(), { ...ctx, providers: providers({}) })
    expect(r.verified.memories).toHaveLength(0)
    expect(r.verified.subject).toBeNull()
    expect(r.timeline.lovedOneId).toBeNull()
  })

  it('routes each modality to text, then understands (audio → speech)', async () => {
    const r = await understandAsset(asset({ modality: 'audio', mimeType: 'audio/m4a', text: undefined }), {
      ...ctx,
      providers: providers({
        speech: { name: 't', async transcribe() { return { transcript: 'Amma slept well', confidence: hi } } },
        document: { name: 't', async understand(i) { return { assetType: 'voice_note', assetTypeConfidence: hi, summary: i.text, extractions: [] } } },
      }),
    })
    expect(r.understanding.summary).toBe('Amma slept well')  // the transcript reached document understanding
    expect(r.understanding.assetType).toBe('voice_note')
  })

  it('retrieval embedding is present only when an embedding provider exists', async () => {
    const withEmbed = await understandAsset(asset(), {
      ...ctx,
      providers: providers({ embedding: { name: 't', async embed() { return [0.1, 0.2] } } }),
    })
    expect(withEmbed.embedding).toEqual([0.1, 0.2])
    const without = await understandAsset(asset(), { ...ctx, providers: providers({}) })
    expect(without.embedding).toBeNull()
  })
})
