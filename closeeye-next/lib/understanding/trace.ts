/**
 * The Internal Reasoning Trace — assembled from a completed understanding (and the action proposals).
 * It records Space → Subject → Intent → Domain → Confidence → Evidence Used → Memory Retrieved →
 * Policy Applied → Action Candidates, exactly as the CTO specified. Engineers inspect it to see where
 * a decision was made; users never see it. Derived, not stored in the hot path — call it when logging.
 */
import type { ActionProposal, PipelineResult, ReasoningTrace } from './types'

export function buildReasoningTrace(result: PipelineResult, actions: ActionProposal[] = []): ReasoningTrace {
  const c = result.context
  return {
    assetId: result.understanding.assetId,
    space: c.space.value,
    subject: { type: c.subject.type, id: c.subject.id, displayName: c.subject.displayName, confidence: c.subject.confidence.band },
    intent: c.intent.kind,
    domain: c.domain,
    confidence: result.understanding.assetTypeConfidence.band,
    evidenceUsed: result.understanding.extractions.map((e) => `${e.field} (${e.evidenceStrength})`),
    memoryRetrieved: [], // Phase 5 — grounded retrieval fills this
    policyApplied: { domain: result.policy.domain, reasoned: result.policy.reasoned, stored: result.policy.stored, sharing: result.policy.sharing },
    actionCandidates: actions.map((a) => a.kind),
  }
}
