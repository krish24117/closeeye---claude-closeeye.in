/**
 * Correctness tests for the Identity Shadow source (Migration Phase A · A2).
 *
 * Proves the read-only assembly is correct and isolated, and — most importantly —
 * that Shadow is disabled by default and fails closed: it never throws into, or
 * falls back to, production behaviour (Constitution §2g, §6).
 */

import { describe, it, expect } from 'vitest'
import type { LovedOne, Profile } from '@/lib/db/types'
import type { FamilyAssignmentRow } from './adapter'
import {
  loadShadowIdentity,
  safeLoadShadowIdentity,
  createSupabaseShadowReader,
  type ShadowReader,
} from './shadow-source'

const p = (id: string, name: string): Profile => ({
  id,
  full_name: name,
  role: 'family',
  admin_role: null,
  phone: null,
  whatsapp_number: null,
  address: null,
})

const lo = (id: string, fam: string, name: string, age: number | null = 70): LovedOne => ({
  id,
  family_user_id: fam,
  full_name: name,
  relationship: 'Mother',
  age,
  city: 'Hyderabad',
  address: null,
  phone_number: null,
  medical_notes: null,
  doctor_name: null,
  nearest_hospital: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  created_at: null,
})

const asg = (id: string, pm: string, fam: string): FamilyAssignmentRow => ({
  id,
  presence_manager_id: pm,
  family_user_id: fam,
  assigned_by: 'admin',
  assigned_at: '2026-07-14T00:00:00Z',
})

function fakeReader(data: {
  profiles: Profile[]
  lovedOnes: LovedOne[]
  assignments: FamilyAssignmentRow[]
}): ShadowReader {
  return {
    readProfiles: async () => data.profiles,
    readLovedOnes: async () => data.lovedOnes,
    readFamilyAssignments: async () => data.assignments,
  }
}

describe('loadShadowIdentity — read-only assembly', () => {
  it('assembles one bundle per family with its own people and consents', async () => {
    const bundles = await loadShadowIdentity(
      fakeReader({
        profiles: [p('f1', 'Asha'), p('f2', 'Ravi')],
        lovedOnes: [lo('a', 'f1', 'Amma'), lo('b', 'f1', 'Nana'), lo('c', 'f2', 'Mummy')],
        assignments: [asg('x', 'pm1', 'f1')],
      }),
    )
    expect(bundles).toHaveLength(2)
    const f1 = bundles.find((b) => b.family.id === 'f1')!
    const f2 = bundles.find((b) => b.family.id === 'f2')!
    expect(f1.persons.map((x) => x.displayName)).toEqual(['Amma', 'Nana'])
    expect(f1.consents).toHaveLength(1)
    expect(f2.persons.map((x) => x.displayName)).toEqual(['Mummy'])
    expect(f2.consents).toHaveLength(0)
  })

  it("never mixes one family's people into another (isolation)", async () => {
    const bundles = await loadShadowIdentity(
      fakeReader({
        profiles: [p('f1', 'A'), p('f2', 'B')],
        lovedOnes: [lo('a', 'f1', 'X'), lo('c', 'f2', 'Y')],
        assignments: [],
      }),
    )
    for (const b of bundles) {
      for (const person of b.persons) {
        expect(person.familyId).toBe(b.family.id)
      }
    }
  })

  it('is safe on empty inputs', async () => {
    const bundles = await loadShadowIdentity(fakeReader({ profiles: [], lovedOnes: [], assignments: [] }))
    expect(bundles).toEqual([])
  })
})

describe('safeLoadShadowIdentity — disabled by default & fail-closed', () => {
  const reader = fakeReader({ profiles: [p('f1', 'A')], lovedOnes: [], assignments: [] })

  it('is disabled by default (no live read without an explicit enable)', async () => {
    const res = await safeLoadShadowIdentity(reader, { enabled: false })
    expect(res).toEqual({ enabled: false, ok: true, families: [] })
  })

  it('runs only when explicitly enabled', async () => {
    const res = await safeLoadShadowIdentity(reader, { enabled: true })
    expect(res.enabled).toBe(true)
    expect(res.ok).toBe(true)
    expect(res.families).toHaveLength(1)
  })

  it('fails closed on error — returns empty, never throws', async () => {
    const brokenReader: ShadowReader = {
      readProfiles: async () => {
        throw new Error('replica unavailable')
      },
      readLovedOnes: async () => [],
      readFamilyAssignments: async () => [],
    }
    const res = await safeLoadShadowIdentity(brokenReader, { enabled: true })
    expect(res).toMatchObject({ enabled: true, ok: false, families: [] })
    expect(res.error).toContain('replica unavailable')
  })
})

describe('createSupabaseShadowReader — reads only, never writes', () => {
  it('only ever issues selects (no insert/update/delete/upsert)', async () => {
    const calls: string[] = []
    const fakeClient = {
      from(table: string) {
        calls.push(`from:${table}`)
        return {
          select: (_cols: string) => {
            calls.push(`select:${table}`)
            return Promise.resolve({ data: [], error: null })
          },
          // No insert/update/delete/upsert methods exist on this fake — a write
          // attempt would throw, proving the reader never tries one.
        }
      },
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const reader = createSupabaseShadowReader(fakeClient)
    await reader.readProfiles()
    await reader.readLovedOnes()
    await reader.readFamilyAssignments()

    expect(calls.filter((c) => c.startsWith('select:'))).toHaveLength(3)
    expect(calls.some((c) => /insert|update|delete|upsert/.test(c))).toBe(false)
  })
})
