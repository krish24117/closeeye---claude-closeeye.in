/**
 * Close Eye — Shadow can_access() (Migration Phase A · increment A3).
 *
 * The deterministic, explainable authorization gate over the shadow Identity model.
 * This is the single decision point B3 describes: inherited, purpose-based consent,
 * most-specific override wins, default deny.
 *
 * DETERMINISTIC, NEVER an LLM (Constitution §6). Every decision returns the six
 * explainable fields — Decision, Reason, Matched Rule, Consent Source, Evidence,
 * Confidence — so any outcome can be reconstructed and audited.
 *
 * Phase A note (§2g): pure function, no DB, no writes, not wired into any request
 * path. In Shadow it is only compared against the app's *current* authorization
 * outcomes — it governs nothing yet. Guarantees preserved: zero writes, zero
 * behaviour change, zero downtime, instant rollback, zero performance regression.
 *
 * Design note (§6): clarity over cleverness — plain rules, read top to bottom.
 */

import type { ConfidenceState, ConsentPurpose } from './model'
import type { ShadowFamily } from './shadow-source'

/** Who is asking. e.g. 'family:<id>' · 'presence_manager:<id>' · 'doctor:<id>' · 'ai-external'. */
export type Grantee = string

/** What is being accessed. e.g. 'family:<id>' · 'person:<id>'. */
export type ObjectRef = string

export interface AccessRequest {
  grantee: Grantee
  objectRef: ObjectRef
  purpose: ConsentPurpose
}

/** The full, inspectable authorization result (Constitution §6). */
export interface AccessDecision {
  decision: 'allow' | 'deny'
  reason: string
  matchedRule: string
  consentSource: string | null
  evidence: Record<string, unknown>
  confidence: ConfidenceState
}

/**
 * Purposes the family (owner) may exercise on its own data implicitly. Note that
 * 'ai-reasoning' is deliberately excluded: egress to the reasoning layer always needs
 * an explicit ai-external consent, even for the family's own data.
 */
const FAMILY_INTERNAL_PURPOSES: ReadonlyArray<ConsentPurpose> = [
  'care-coordination',
  'health-review',
  'emergency-response',
  'family-sharing',
]

const CONFIDENCE_RANK: Record<ConfidenceState, number> = { Manual: 3, Confirmed: 2, Suggested: 1, Unknown: 0 }

/** The lowest (least trusted) confidence among the evidence a decision rests on. */
function lowestConfidence(...states: ConfidenceState[]): ConfidenceState {
  return states.reduce((lo, s) => (CONFIDENCE_RANK[s] < CONFIDENCE_RANK[lo] ? s : lo))
}

interface Resolved {
  kind: 'family' | 'person' | 'unknown'
  familyId: string | null
  personId?: string
  confidence: ConfidenceState
}

/** Resolve an object reference within THIS family only (tenant isolation). */
function resolveObject(objectRef: ObjectRef, family: ShadowFamily): Resolved {
  if (objectRef === `family:${family.family.id}`) {
    return { kind: 'family', familyId: family.family.id, confidence: family.family.metadata.confidence }
  }
  if (objectRef.startsWith('person:')) {
    const personId = objectRef.slice('person:'.length)
    const person = family.persons.find((p) => p.id === personId)
    if (person) return { kind: 'person', familyId: person.familyId, personId, confidence: person.metadata.confidence }
  }
  return { kind: 'unknown', familyId: null, confidence: 'Unknown' }
}

/** Does a consent scope cover the resolved object? (family scope inherits to its people.) */
function scopeCovers(scope: string, resolved: Resolved): boolean {
  if (resolved.familyId != null && scope === `family:${resolved.familyId}`) return true
  if (resolved.kind === 'person' && scope === `person:${resolved.personId}`) return true
  return false
}

/** More specific scope wins: object > person > family. */
function scopeSpecificity(scope: string): number {
  if (scope.startsWith('object:')) return 3
  if (scope.startsWith('person:')) return 2
  if (scope.startsWith('family:')) return 1
  return 0
}

function decide(
  decision: 'allow' | 'deny',
  matchedRule: string,
  reason: string,
  consentSource: string | null,
  evidence: Record<string, unknown>,
  confidence: ConfidenceState,
): AccessDecision {
  return { decision, reason, matchedRule, consentSource, evidence, confidence }
}

/**
 * The deterministic authorization gate. Given a request and the family it concerns,
 * return an explainable allow/deny. Default is deny.
 */
export function canAccess(req: AccessRequest, family: ShadowFamily): AccessDecision {
  const evidence: Record<string, unknown> = { grantee: req.grantee, objectRef: req.objectRef, purpose: req.purpose }
  const resolved = resolveObject(req.objectRef, family)

  // 1. The object must resolve within this family (tenant isolation). No object → deny.
  if (resolved.kind === 'unknown' || resolved.familyId == null) {
    return decide('deny', 'unresolved-object', `Object ${req.objectRef} does not resolve within this family.`, null, evidence, 'Manual')
  }
  evidence.familyId = resolved.familyId

  // 2. The family (owner) has implicit access to its own data for family-internal purposes.
  if (req.grantee === `family:${family.family.id}`) {
    if (FAMILY_INTERNAL_PURPOSES.includes(req.purpose)) {
      return decide('allow', 'family-internal-implicit', `The family accesses its own data for "${req.purpose}".`, null, evidence, resolved.confidence)
    }
    return decide('deny', 'purpose-not-permitted', `Family-internal access does not cover purpose "${req.purpose}" — e.g. AI egress needs explicit consent.`, null, evidence, resolved.confidence)
  }

  // 3. Everyone else needs an explicit covering consent; most-specific wins; default deny.
  const covering = family.consents
    .filter((c) => c.grantee === req.grantee && c.purpose === req.purpose && scopeCovers(c.scope, resolved))
    .sort((a, b) => scopeSpecificity(b.scope) - scopeSpecificity(a.scope))
  const top = covering[0]

  if (top && top.status === 'active') {
    evidence.matchedConsentId = top.id
    evidence.matchedScope = top.scope
    return decide(
      'allow',
      `consent:${top.id}`,
      `Grant ${top.id} permits ${req.grantee} to "${req.purpose}" within ${top.scope}.`,
      top.id,
      evidence,
      lowestConfidence(resolved.confidence, top.metadata.confidence),
    )
  }
  if (top && top.status === 'revoked') {
    evidence.matchedConsentId = top.id
    return decide('deny', `consent-revoked:${top.id}`, `The most-specific matching grant (${top.id}) is revoked.`, null, evidence, lowestConfidence(resolved.confidence, top.metadata.confidence))
  }
  return decide('deny', 'default-deny', `No active grant permits ${req.grantee} to "${req.purpose}" on ${req.objectRef}.`, null, evidence, resolved.confidence)
}
