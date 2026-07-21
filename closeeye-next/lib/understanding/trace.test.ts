/**
 * The Internal Reasoning Trace must record the full decision path, so a misfiled asset can be debugged.
 */
import { describe, it, expect } from 'vitest'
import { understandAsset } from './pipeline'
import { proposeActions } from './actions'
import { buildReasoningTrace } from './trace'
import { PRIVACY_FIRST_POLICY } from './policy'
import { referenceProviders } from './validation/reference-providers'

describe('Internal Reasoning Trace', () => {
  it('records Space · Subject · Intent · Domain · Confidence · Policy · Actions for an interaction', async () => {
    const asset = { id: 'a1', familyId: 'f', modality: 'pdf' as const, mimeType: 'application/pdf', uri: 'x', uploadedBy: 'u', uploadedAt: '2026-07-22T00:00:00Z', text: 'Amma takes Metformin 500mg twice daily.' }
    const r = await understandAsset(asset, { lovedOnes: [{ id: 'lo1', name: 'Amma' }], providers: referenceProviders() })
    const trace = buildReasoningTrace(r, proposeActions(r, { policy: PRIVACY_FIRST_POLICY, careAvailable: true }))

    expect(trace.domain).toBe('health')
    expect(trace.subject.id).toBe('lo1')
    expect(trace.policyApplied.stored).toBe(true)
    expect(trace.space).toBeTruthy()
    expect(trace.intent).toBeTruthy()
    expect(trace.actionCandidates.length).toBeGreaterThan(0)
  })
})
