/**
 * Tests for the Migration Control Center (Phase A · A4).
 *
 * Covers all five sections (Shadow Health, Identity Parity, Authorization Parity,
 * Performance, Migration Readiness), the plain-English Founder Report, the
 * fail-closed disabled path, and determinism. Readiness is proven to be a pure
 * function of the evidence (Constitution §6 — evidence-based migration decisions).
 */

import { describe, it, expect } from 'vitest'
import type { LovedOne, Profile } from '@/lib/db/types'
import type { FamilyAssignmentRow } from './adapter'
import { loadShadowIdentity, type ShadowFamily, type ShadowLoadResult, type ShadowReader } from './shadow-source'
import {
  buildMigrationControlCenter,
  checkAuthorizationParity,
  checkIdentityParity,
  evaluatePerformance,
  summarizeShadowHealth,
  type AuthProbe,
  type ProductionSnapshot,
} from './migration-control'

const profiles: Profile[] = [{ id: 'f1', full_name: 'Asha', role: 'family', admin_role: null, phone: null, whatsapp_number: null, address: null }]
const lovedOnes: LovedOne[] = [
  {
    id: 'p1',
    family_user_id: 'f1',
    full_name: 'Amma',
    relationship: 'Mother',
    age: 72,
    city: 'Hyderabad',
    address: null,
    phone_number: null,
    medical_notes: null,
    doctor_name: null,
    nearest_hospital: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    created_at: null,
  },
]
const assignments: FamilyAssignmentRow[] = [{ id: 'a1', presence_manager_id: 'pm1', family_user_id: 'f1', assigned_by: 'admin', assigned_at: null }]

const source: ProductionSnapshot = { profiles, lovedOnes, assignments }

const reader: ShadowReader = {
  readProfiles: async () => profiles,
  readLovedOnes: async () => lovedOnes,
  readFamilyAssignments: async () => assignments,
}

async function healthyShadow(): Promise<ShadowLoadResult> {
  return { enabled: true, ok: true, families: await loadShadowIdentity(reader) }
}

// Probes whose `expected` values are the current system's correct outcomes.
const probes: AuthProbe[] = [
  { familyId: 'f1', grantee: 'family:f1', objectRef: 'person:p1', purpose: 'care-coordination', expected: 'allow' },
  { familyId: 'f1', grantee: 'family:f1', objectRef: 'person:p1', purpose: 'ai-reasoning', expected: 'deny' },
  { familyId: 'f1', grantee: 'presence_manager:pm1', objectRef: 'person:p1', purpose: 'care-coordination', expected: 'allow' },
  { familyId: 'f1', grantee: 'doctor:d1', objectRef: 'person:p1', purpose: 'health-review', expected: 'deny' },
]

describe('Shadow Health', () => {
  it('classifies disabled / healthy / failed', () => {
    expect(summarizeShadowHealth({ enabled: false, ok: true, families: [] }).status).toBe('disabled')
    expect(summarizeShadowHealth({ enabled: true, ok: true, families: [] }).status).toBe('healthy')
    expect(summarizeShadowHealth({ enabled: true, ok: false, families: [], error: 'x' }).status).toBe('failed')
  })
})

describe('Identity Parity', () => {
  it('is 100% with no discrepancies on a faithful projection', async () => {
    const s = await healthyShadow()
    const r = checkIdentityParity(s.families, source)
    expect(r.rate).toBe(1)
    expect(r.discrepancies).toHaveLength(0)
    expect(r.total).toBe(3)
  })

  it('flags a dropped person', async () => {
    const s = await healthyShadow()
    const stripped: ShadowFamily[] = s.families.map((f) => ({ ...f, persons: [] }))
    const r = checkIdentityParity(stripped, source)
    expect(r.rate).toBeLessThan(1)
    expect(r.discrepancies.some((d) => d.kind === 'person')).toBe(true)
  })

  it('flags an invented (extra) person with no source row', async () => {
    const s = await healthyShadow()
    const fams = structuredClone(s.families)
    fams[0]!.persons.push({ ...fams[0]!.persons[0]!, id: 'ghost' })
    const r = checkIdentityParity(fams, source)
    expect(r.discrepancies.some((d) => d.kind === 'extra-person' && d.ref.includes('ghost'))).toBe(true)
  })

  it('flags a field mismatch', async () => {
    const s = await healthyShadow()
    const fams = structuredClone(s.families)
    fams[0]!.persons[0]!.displayName = 'Wrong'
    const r = checkIdentityParity(fams, source)
    expect(r.discrepancies.some((d) => d.kind === 'person')).toBe(true)
  })
})

describe('Authorization Parity', () => {
  it('is 100% when the shadow gate matches current outcomes', async () => {
    const s = await healthyShadow()
    expect(checkAuthorizationParity(probes, s.families).rate).toBe(1)
  })

  it('flags a disagreement', async () => {
    const s = await healthyShadow()
    const wrong: AuthProbe[] = [{ ...probes[1]!, expected: 'allow' }] // ai-reasoning should be deny
    const r = checkAuthorizationParity(wrong, s.families)
    expect(r.rate).toBe(0)
    expect(r.discrepancies[0]!.kind).toBe('auth-mismatch')
  })

  it('flags a probe against a family missing from the shadow', async () => {
    const s = await healthyShadow()
    const r = checkAuthorizationParity([{ ...probes[0]!, familyId: 'nope' }], s.families)
    expect(r.discrepancies[0]!.kind).toBe('auth-family-missing')
  })
})

describe('Performance', () => {
  it('evaluates against the budget', () => {
    expect(evaluatePerformance(5, 2000).withinBudget).toBe(true)
    expect(evaluatePerformance(5000, 2000).withinBudget).toBe(false)
  })
})

describe('Migration Readiness & Founder Report', () => {
  it('is READY when every check is green and the window is stable', async () => {
    const c = buildMigrationControlCenter({ shadow: await healthyShadow(), source, authProbes: probes, loadMs: 5, windowStable: true })
    expect(c.readiness.ready).toBe(true)
    expect(c.readiness.blockers).toHaveLength(0)
    expect(c.founderReport).toContain('READY to recommend Phase B')
    expect(c.founderReport).toContain('zero writes')
  })

  it('is NOT ready (evidence-based) when identity parity has a discrepancy', async () => {
    const s = await healthyShadow()
    const broken: ShadowLoadResult = { ...s, families: s.families.map((f) => ({ ...f, persons: [] })) }
    const c = buildMigrationControlCenter({ shadow: broken, source, authProbes: probes, loadMs: 5, windowStable: true })
    expect(c.readiness.ready).toBe(false)
    expect(c.readiness.blockers.some((b) => b.includes('Identity parity'))).toBe(true)
    expect(c.founderReport).toContain('NOT YET READY')
  })

  it('is NOT ready and fails closed when the shadow is disabled', async () => {
    const c = buildMigrationControlCenter({
      shadow: { enabled: false, ok: true, families: [] },
      source,
      authProbes: probes,
      loadMs: 0,
      windowStable: true,
    })
    expect(c.shadowHealth.status).toBe('disabled')
    expect(c.readiness.ready).toBe(false)
    expect(c.readiness.blockers[0]).toContain('disabled')
    expect(c.identityParity.discrepancies[0]!.kind).toBe('not-run')
  })

  it('is NOT ready when performance is over budget', async () => {
    const c = buildMigrationControlCenter({ shadow: await healthyShadow(), source, authProbes: probes, loadMs: 9000, budgetMs: 2000, windowStable: true })
    expect(c.readiness.blockers.some((b) => b.includes('exceeds budget'))).toBe(true)
  })

  it('is NOT ready until the observation window is stable', async () => {
    const c = buildMigrationControlCenter({ shadow: await healthyShadow(), source, authProbes: probes, loadMs: 5, windowStable: false })
    expect(c.readiness.blockers.some((b) => b.includes('window'))).toBe(true)
  })

  it('is deterministic — identical evidence produces an identical report', async () => {
    const shadow = await healthyShadow()
    const a = buildMigrationControlCenter({ shadow, source, authProbes: probes, loadMs: 5, windowStable: true })
    const b = buildMigrationControlCenter({ shadow, source, authProbes: probes, loadMs: 5, windowStable: true })
    expect(a).toEqual(b)
  })
})
