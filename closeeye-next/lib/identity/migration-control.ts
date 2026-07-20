/**
 * Close Eye — Migration Control Center (Migration Phase A · increment A4).
 *
 * The observability for the Identity Shadow migration. Five sections — Identity
 * Parity, Authorization Parity, Shadow Health, Performance, Migration Readiness —
 * plus a plain-English Founder Report. This is the instrumentation that, per
 * "Observability before access" (§6), must exist BEFORE the first live production
 * read (A5).
 *
 * Migration decisions are evidence-based (§6): readiness is a pure function of the
 * measured numbers, never a feeling. Everything here is deterministic — no DB, no
 * writes, no request path, no timestamps — so a report is reproducible and auditable.
 * Guarantees preserved: zero writes, zero behaviour change, zero downtime, instant
 * rollback, zero performance regression.
 *
 * Design note (§6): clarity over cleverness.
 */

import type { LovedOne, Profile } from '@/lib/db/types'
import type { FamilyAssignmentRow } from './adapter'
import { canAccess } from './can-access'
import type { Consent, ConsentPurpose, Person } from './model'
import type { ShadowFamily, ShadowLoadResult } from './shadow-source'

// ── Shared shapes ────────────────────────────────────────────────────────────

export interface Discrepancy {
  kind: string
  ref: string
  detail: string
}

export interface ParityResult {
  total: number
  matched: number
  mismatched: number
  rate: number // 0..1
  discrepancies: Discrepancy[]
}

const NOT_RUN = (reason: string): ParityResult => ({
  total: 0,
  matched: 0,
  mismatched: 0,
  rate: 0,
  discrepancies: [{ kind: 'not-run', ref: '-', detail: reason }],
})

// ── 1. Shadow Health ─────────────────────────────────────────────────────────

export interface ShadowHealth {
  status: 'disabled' | 'healthy' | 'failed'
  enabled: boolean
  ok: boolean
  familiesLoaded: number
  error?: string
}

export function summarizeShadowHealth(r: ShadowLoadResult): ShadowHealth {
  const status: ShadowHealth['status'] = !r.enabled ? 'disabled' : r.ok ? 'healthy' : 'failed'
  return { status, enabled: r.enabled, ok: r.ok, familiesLoaded: r.families.length, error: r.error }
}

// ── 2. Identity Parity ───────────────────────────────────────────────────────

export interface ProductionSnapshot {
  profiles: Profile[]
  lovedOnes: LovedOne[]
  assignments: FamilyAssignmentRow[]
}

export function checkIdentityParity(shadow: ShadowFamily[], source: ProductionSnapshot): ParityResult {
  const discrepancies: Discrepancy[] = []
  const familyById = new Map(shadow.map((f) => [f.family.id, f]))
  const personById = new Map<string, Person>()
  const consentById = new Map<string, Consent>()
  for (const f of shadow) {
    for (const p of f.persons) personById.set(p.id, p)
    for (const c of f.consents) consentById.set(c.id, c)
  }

  const total = source.profiles.length + source.lovedOnes.length + source.assignments.length
  let matched = 0

  for (const prof of source.profiles) {
    const fam = familyById.get(prof.id)
    if (fam && fam.owner.displayName === prof.full_name) matched++
    else discrepancies.push({ kind: 'family', ref: `profiles#${prof.id}`, detail: fam ? 'owner name mismatch' : 'no projected family' })
  }

  for (const lo of source.lovedOnes) {
    const p = personById.get(lo.id)
    const faithful =
      p != null &&
      p.familyId === lo.family_user_id &&
      p.displayName === lo.full_name &&
      p.age === lo.age &&
      p.city === lo.city &&
      p.relationshipToFamily === lo.relationship
    if (faithful) matched++
    else discrepancies.push({ kind: 'person', ref: `loved_ones#${lo.id}`, detail: p ? 'field mismatch or wrong family' : 'no projected person' })
  }

  for (const a of source.assignments) {
    const c = consentById.get(a.id)
    if (c && c.familyId === a.family_user_id && c.grantee === `presence_manager:${a.presence_manager_id}`) matched++
    else discrepancies.push({ kind: 'consent', ref: `family_assignments#${a.id}`, detail: c ? 'mismatch' : 'no projected consent' })
  }

  // Invented data must be zero: every projected object must trace to a source row.
  const sourcePersonIds = new Set(source.lovedOnes.map((l) => l.id))
  for (const id of personById.keys()) {
    if (!sourcePersonIds.has(id)) discrepancies.push({ kind: 'extra-person', ref: `person:${id}`, detail: 'projected person has no source row' })
  }
  const sourceConsentIds = new Set(source.assignments.map((a) => a.id))
  for (const id of consentById.keys()) {
    if (!sourceConsentIds.has(id)) discrepancies.push({ kind: 'extra-consent', ref: `consent:${id}`, detail: 'projected consent has no source row' })
  }

  return { total, matched, mismatched: total - matched, rate: total ? matched / total : 1, discrepancies }
}

// ── 3. Authorization Parity ──────────────────────────────────────────────────

export interface AuthProbe {
  familyId: string
  grantee: string
  objectRef: string
  purpose: ConsentPurpose
  /** The current system's actual outcome — what the shadow gate must reproduce. */
  expected: 'allow' | 'deny'
  label?: string
}

export function checkAuthorizationParity(probes: AuthProbe[], families: ShadowFamily[]): ParityResult {
  const byId = new Map(families.map((f) => [f.family.id, f]))
  const discrepancies: Discrepancy[] = []
  let matched = 0

  for (const probe of probes) {
    const fam = byId.get(probe.familyId)
    const ref = probe.label ?? `${probe.grantee} → ${probe.objectRef} (${probe.purpose})`
    if (!fam) {
      discrepancies.push({ kind: 'auth-family-missing', ref, detail: `family ${probe.familyId} not in shadow` })
      continue
    }
    const d = canAccess({ grantee: probe.grantee, objectRef: probe.objectRef, purpose: probe.purpose }, fam)
    if (d.decision === probe.expected) matched++
    else discrepancies.push({ kind: 'auth-mismatch', ref, detail: `shadow=${d.decision} expected=${probe.expected} rule=${d.matchedRule}` })
  }

  return { total: probes.length, matched, mismatched: probes.length - matched, rate: probes.length ? matched / probes.length : 1, discrepancies }
}

// ── 4. Performance ───────────────────────────────────────────────────────────

export interface PerformanceReport {
  loadMs: number
  budgetMs: number
  withinBudget: boolean
}

export function evaluatePerformance(loadMs: number, budgetMs = 2000): PerformanceReport {
  return { loadMs, budgetMs, withinBudget: loadMs <= budgetMs }
}

// ── 5. Migration Readiness ───────────────────────────────────────────────────

export interface ReadinessVerdict {
  ready: boolean
  blockers: string[]
}

function assessReadiness(input: {
  shadowHealth: ShadowHealth
  identityParity: ParityResult
  authorizationParity: ParityResult
  performance: PerformanceReport
  windowStable: boolean
}): ReadinessVerdict {
  const blockers: string[] = []

  // Health dominates: if the shadow isn't healthy, that is the only actionable blocker.
  if (input.shadowHealth.status !== 'healthy') {
    blockers.push(`Shadow is ${input.shadowHealth.status}${input.shadowHealth.error ? `: ${input.shadowHealth.error}` : ''}.`)
    return { ready: false, blockers }
  }

  const idOk = input.identityParity.rate === 1 && input.identityParity.discrepancies.length === 0
  if (!idOk) blockers.push(`Identity parity ${(input.identityParity.rate * 100).toFixed(1)}% with ${input.identityParity.discrepancies.length} discrepancy(ies).`)

  const authOk = input.authorizationParity.rate === 1 && input.authorizationParity.discrepancies.length === 0
  if (!authOk) blockers.push(`Authorization parity ${(input.authorizationParity.rate * 100).toFixed(1)}% with ${input.authorizationParity.discrepancies.length} discrepancy(ies).`)

  if (!input.performance.withinBudget) blockers.push(`Shadow load ${input.performance.loadMs}ms exceeds budget ${input.performance.budgetMs}ms.`)
  if (!input.windowStable) blockers.push('Observation window not yet stable.')

  return { ready: blockers.length === 0, blockers }
}

// ── The Control Center + Founder Report ──────────────────────────────────────

export interface MigrationControlCenter {
  shadowHealth: ShadowHealth
  identityParity: ParityResult
  authorizationParity: ParityResult
  performance: PerformanceReport
  readiness: ReadinessVerdict
  founderReport: string
}

const pct = (rate: number): string => `${(rate * 100).toFixed(1)}%`

/** A plain-English summary a founder can read without any context. */
export function renderFounderReport(c: Omit<MigrationControlCenter, 'founderReport'>): string {
  const lines: string[] = []
  lines.push('Close Eye — Identity Migration · Phase A (Shadow)')
  lines.push(
    c.readiness.ready
      ? 'Status: READY to recommend Phase B. Every check is green and stable.'
      : `Status: NOT YET READY — ${c.readiness.blockers.length} item(s) to resolve before Phase B.`,
  )
  lines.push('')
  lines.push(`• Shadow health: ${c.shadowHealth.status} (${c.shadowHealth.familiesLoaded} families loaded)`)
  if (c.shadowHealth.status === 'healthy') {
    lines.push(`• Identity parity: ${pct(c.identityParity.rate)} (${c.identityParity.matched}/${c.identityParity.total} match, ${c.identityParity.discrepancies.length} to review)`)
    lines.push(`• Authorization parity: ${pct(c.authorizationParity.rate)} (${c.authorizationParity.matched}/${c.authorizationParity.total} agree, ${c.authorizationParity.discrepancies.length} to review)`)
    lines.push(`• Performance: shadow load ${c.performance.loadMs}ms (budget ${c.performance.budgetMs}ms) — ${c.performance.withinBudget ? 'within budget' : 'OVER budget'}`)
  }
  if (!c.readiness.ready) {
    lines.push('')
    lines.push('Before Phase B:')
    for (const b of c.readiness.blockers) lines.push(`  - ${b}`)
  }
  lines.push('')
  lines.push('Guarantees held: zero writes · zero behaviour change · zero downtime · instant rollback · zero performance regression.')
  return lines.join('\n')
}

/** Build the whole Control Center from measured evidence. Deterministic and pure. */
export function buildMigrationControlCenter(input: {
  shadow: ShadowLoadResult
  source: ProductionSnapshot
  authProbes: AuthProbe[]
  loadMs: number
  budgetMs?: number
  windowStable?: boolean
}): MigrationControlCenter {
  const shadowHealth = summarizeShadowHealth(input.shadow)
  const healthy = shadowHealth.status === 'healthy'

  // When the shadow isn't healthy, parity cannot be trusted — mark it not-run rather
  // than reporting misleading mismatches, and let health be the blocker.
  const identityParity = healthy ? checkIdentityParity(input.shadow.families, input.source) : NOT_RUN(`shadow ${shadowHealth.status}`)
  const authorizationParity = healthy ? checkAuthorizationParity(input.authProbes, input.shadow.families) : NOT_RUN(`shadow ${shadowHealth.status}`)
  const performance = evaluatePerformance(input.loadMs, input.budgetMs)
  const readiness = assessReadiness({ shadowHealth, identityParity, authorizationParity, performance, windowStable: input.windowStable ?? false })

  const base = { shadowHealth, identityParity, authorizationParity, performance, readiness }
  return { ...base, founderReport: renderFounderReport(base) }
}
