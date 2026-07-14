/**
 * Tests for the Shadow Runner (Phase A · A5) — the out-of-band validation pass.
 * Proves: disabled by default, fail-closed on error, correct probe generation, a
 * green end-to-end pass on faithful data, and determinism.
 */

import { describe, it, expect } from 'vitest'
import type { LovedOne, Profile } from '@/lib/db/types'
import type { FamilyAssignmentRow } from './adapter'
import { assembleShadowIdentity, type ShadowReader } from './shadow-source'
import { generateAuthProbes, runShadowReport } from './shadow-runner'

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

const reader: ShadowReader = {
  readProfiles: async () => profiles,
  readLovedOnes: async () => lovedOnes,
  readFamilyAssignments: async () => assignments,
}

// A deterministic clock: each call advances by 5ms.
function fakeClock(step = 5): () => number {
  let t = 0
  return () => (t += step) - step
}

describe('generateAuthProbes', () => {
  it('emits owner-allow, assigned-PM-allow, and unassigned-deny per person', () => {
    const families = assembleShadowIdentity({ profiles, lovedOnes, assignments })
    const probes = generateAuthProbes(families)
    expect(probes.some((p) => p.grantee === 'family:f1' && p.expected === 'allow')).toBe(true)
    expect(probes.some((p) => p.grantee === 'presence_manager:pm1' && p.expected === 'allow')).toBe(true)
    expect(probes.some((p) => p.grantee === 'presence_manager:__unassigned__' && p.expected === 'deny')).toBe(true)
  })
})

describe('runShadowReport', () => {
  it('is disabled by default (no explicit enable) and reports disabled', async () => {
    const c = await runShadowReport(reader, { enabled: false })
    expect(c.shadowHealth.status).toBe('disabled')
    expect(c.readiness.ready).toBe(false)
    expect(c.founderReport).toContain('NOT YET READY')
  })

  it('produces a green, ready report on faithful data when enabled and window stable', async () => {
    const c = await runShadowReport(reader, { enabled: true, windowStable: true, now: fakeClock() })
    expect(c.shadowHealth.status).toBe('healthy')
    expect(c.identityParity.rate).toBe(1)
    expect(c.authorizationParity.rate).toBe(1)
    expect(c.readiness.ready).toBe(true)
    expect(c.founderReport).toContain('READY to recommend Phase B')
  })

  it('fails closed on a reader error — failed health, never throws', async () => {
    const broken: ShadowReader = {
      readProfiles: async () => {
        throw new Error('RO connection refused')
      },
      readLovedOnes: async () => [],
      readFamilyAssignments: async () => [],
    }
    const c = await runShadowReport(broken, { enabled: true, windowStable: true })
    expect(c.shadowHealth.status).toBe('failed')
    expect(c.shadowHealth.error).toContain('RO connection refused')
    expect(c.readiness.ready).toBe(false)
  })

  it('is deterministic given a fixed clock', async () => {
    const a = await runShadowReport(reader, { enabled: true, windowStable: true, now: fakeClock() })
    const b = await runShadowReport(reader, { enabled: true, windowStable: true, now: fakeClock() })
    expect(a).toEqual(b)
  })
})
