/**
 * The Validation Harness — the release gate. Every provider implementation is run against representative
 * scenarios and scored on the metrics the CTO named: understanding accuracy, clarification accuracy,
 * wrong-classification rate, hallucination rate, correct memory placement / subject / domain resolution,
 * and correct action suggestions. Success is NOT "it compiles" — it is these numbers clearing thresholds.
 * Provider-agnostic: pass the reference providers today, the Claude providers tomorrow — same gate.
 */
import { understandAsset } from '../pipeline'
import { proposeActions } from '../actions'
import { defaultContextEngine } from '../context'
import { PRIVACY_FIRST_POLICY } from '../policy'
import type { ActionKind, AssetType, Domain, IntentKind, Modality, Space, SubjectType } from '../types'
import type { UnderstandingProviders } from '../providers'

export interface Scenario {
  id: string
  bucket: string // Health / Legal / Property / Finance / Identity / Business / Travel / Family / Household
  input: { text?: string; modality?: Modality }
  lovedOnes?: { id: string; name: string }[]
  expect: {
    space?: Space
    subjectType?: SubjectType
    subjectId?: string | null
    domain?: Domain
    intent?: IntentKind
    assetType?: AssetType
    clarifies?: boolean
    memories?: string[]
    noMemories?: boolean
    actions?: ActionKind[]
  }
}

interface Observed {
  space: Space; subjectType: SubjectType; subjectId: string | null; domain: Domain; intent: IntentKind
  assetType?: AssetType; clarifies: boolean; memories: string[]; actions: ActionKind[]
}

async function observe(s: Scenario, providers: UnderstandingProviders): Promise<Observed> {
  const lovedOnes = s.lovedOnes ?? []
  if (s.input.modality) {
    const asset = { id: s.id, familyId: 'fam', modality: s.input.modality, mimeType: 'application/octet-stream', uri: 'x', uploadedBy: 'u', uploadedAt: '2026-07-22T00:00:00Z', text: s.input.text }
    const r = await understandAsset(asset, { lovedOnes, providers })
    const actions = proposeActions(r, { policy: PRIVACY_FIRST_POLICY, careAvailable: true })
    return {
      space: r.context.space.value, subjectType: r.context.subject.type, subjectId: r.context.subject.id,
      domain: r.context.domain, intent: r.context.intent.kind, assetType: r.understanding.assetType,
      clarifies: r.context.clarifications.length > 0 || r.pending.length > 0,
      memories: r.verified.memories.map((m) => m.statement), actions: actions.map((a) => a.kind),
    }
  }
  const c = defaultContextEngine.resolve({ text: s.input.text, lovedOnes })
  return { space: c.space.value, subjectType: c.subject.type, subjectId: c.subject.id, domain: c.domain, intent: c.intent.kind, clarifies: c.clarifications.length > 0, memories: [], actions: [] }
}

export interface HarnessMetrics {
  total: number
  understandingAccuracy: number
  clarificationAccuracy: number
  wrongClassificationRate: number
  hallucinationRate: number
  correctMemoryPlacement: number
  correctSubjectResolution: number
  correctDomainResolution: number
  correctActionSuggestions: number
  byBucket: Record<string, { total: number; correct: number }>
}

export async function runHarness(scenarios: Scenario[], providers: UnderstandingProviders): Promise<HarnessMetrics> {
  let understanding = 0
  let clarN = 0, clarOK = 0, clsN = 0, clsWrong = 0, hallN = 0, hall = 0
  let memN = 0, memOK = 0, subN = 0, subOK = 0, domN = 0, domOK = 0, actN = 0, actOK = 0
  const byBucket: Record<string, { total: number; correct: number }> = {}

  for (const s of scenarios) {
    const o = await observe(s, providers)
    const e = s.expect
    const checks: boolean[] = []
    if (e.space !== undefined) checks.push(o.space === e.space)
    if (e.intent !== undefined) checks.push(o.intent === e.intent)
    if (e.domain !== undefined) { domN++; const ok = o.domain === e.domain; if (ok) domOK++; checks.push(ok) }
    if (e.subjectType !== undefined) { subN++; const ok = o.subjectType === e.subjectType && (e.subjectId === undefined || o.subjectId === e.subjectId); if (ok) subOK++; checks.push(ok) }
    if (e.assetType !== undefined) { clsN++; const ok = o.assetType === e.assetType; if (!ok) clsWrong++; checks.push(ok) }
    if (e.clarifies !== undefined) { clarN++; const ok = o.clarifies === e.clarifies; if (ok) clarOK++; checks.push(ok) }
    if (e.memories !== undefined) { memN++; const ok = e.memories.every((m) => o.memories.some((x) => x.includes(m))); if (ok) memOK++; checks.push(ok) }
    if (e.noMemories) checks.push(o.memories.length === 0)
    if (e.noMemories || e.memories !== undefined) { hallN++; const expected = e.memories ?? []; if (o.memories.some((x) => !expected.some((m) => x.includes(m)))) hall++ }
    if (e.actions !== undefined) { actN++; const ok = e.actions.every((a) => o.actions.includes(a)); if (ok) actOK++; checks.push(ok) }

    const correct = checks.length > 0 && checks.every(Boolean)
    if (correct) understanding++
    const b = (byBucket[s.bucket] ??= { total: 0, correct: 0 })
    b.total++; if (correct) b.correct++
  }

  const ratio = (a: number, b: number) => (b === 0 ? 1 : Math.round((a / b) * 1000) / 1000)
  return {
    total: scenarios.length,
    understandingAccuracy: ratio(understanding, scenarios.length),
    clarificationAccuracy: ratio(clarOK, clarN),
    wrongClassificationRate: ratio(clsWrong, clsN),
    hallucinationRate: ratio(hall, hallN),
    correctMemoryPlacement: ratio(memOK, memN),
    correctSubjectResolution: ratio(subOK, subN),
    correctDomainResolution: ratio(domOK, domN),
    correctActionSuggestions: ratio(actOK, actN),
    byBucket,
  }
}

/** The release gate — thresholds every provider must clear. Tighten as the corpus grows to 500/domain. */
export const RELEASE_GATE = {
  understandingAccuracy: 0.8,
  wrongClassificationRate: 0.1, // max
  hallucinationRate: 0.05, // max
  correctDomainResolution: 0.9,
  correctSubjectResolution: 0.9,
  clarificationAccuracy: 0.8,
}
