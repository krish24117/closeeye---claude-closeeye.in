/**
 * Correctness tests for the Identity Shadow adapter (Migration Phase A).
 *
 * Phase A succeeds on correctness, not performance — so these tests assert the
 * projections faithfully, and the invariants that matter most: universal metadata
 * on every object (§2h), identity-only Persons, and purpose-scoped consent.
 */

import { describe, it, expect } from 'vitest'
import type { Profile, LovedOne } from '@/lib/db/types'
import {
  familyFromProfile,
  familyMemberFromProfile,
  personFromLovedOne,
  consentFromAssignment,
  type FamilyAssignmentRow,
} from './adapter'

const profile: Profile = {
  id: 'u1',
  full_name: 'Asha Rao',
  role: 'family',
  admin_role: null,
  phone: null,
  whatsapp_number: null,
  address: null,
}

const lovedOne: LovedOne = {
  id: 'lo1',
  family_user_id: 'u1',
  full_name: 'Amma Rao',
  relationship: 'Mother',
  age: 72,
  city: 'Hyderabad',
  address: null,
  phone_number: null,
  medical_notes: 'diabetic',
  doctor_name: null,
  nearest_hospital: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  created_at: null,
}

const assignment: FamilyAssignmentRow = {
  id: 'a1',
  presence_manager_id: 'pm1',
  family_user_id: 'u1',
  assigned_by: 'admin1',
  assigned_at: '2026-07-14T00:00:00Z',
}

describe('identity shadow adapter — pure projections', () => {
  it('projects a profile into its Family boundary', () => {
    const f = familyFromProfile(profile)
    expect(f).toMatchObject({ id: 'u1', status: 'active' })
    expect(f.metadata.source).toBe('legacy-adapter:profiles')
    expect(f.metadata.provenance).toBe('profiles#u1')
    expect(f.metadata.confidence).toBe('Manual')
  })

  it('projects a profile into the owning FamilyMember', () => {
    expect(familyMemberFromProfile(profile)).toMatchObject({
      id: 'u1',
      familyId: 'u1',
      authUserId: 'u1',
      displayName: 'Asha Rao',
      appRole: 'owner',
    })
  })

  it('projects a loved_one into a Person with identity attributes only', () => {
    const p = personFromLovedOne(lovedOne)
    expect(p).toMatchObject({
      id: 'lo1',
      familyId: 'u1',
      displayName: 'Amma Rao',
      relationshipToFamily: 'Mother',
      age: 72,
      city: 'Hyderabad',
      isMinor: false,
    })
    // Identity only — no medical/content fields ever leak into a Person.
    for (const forbidden of ['medical_notes', 'doctor_name', 'nearest_hospital', 'emergency_contact_name']) {
      expect(Object.keys(p)).not.toContain(forbidden)
    }
  })

  it('derives isMinor from age, safely when age is unknown', () => {
    expect(personFromLovedOne({ ...lovedOne, age: 3 }).isMinor).toBe(true)
    expect(personFromLovedOne({ ...lovedOne, age: null }).isMinor).toBe(false)
  })

  it('projects a PM assignment into a purpose-scoped Consent', () => {
    const c = consentFromAssignment(assignment)
    expect(c).toMatchObject({
      id: 'a1',
      familyId: 'u1',
      grantor: 'admin1',
      grantee: 'presence_manager:pm1',
      scope: 'family:u1',
      purpose: 'care-coordination',
      status: 'active',
    })
    expect(c.grantedAt).toBe('2026-07-14T00:00:00Z')
  })

  it('falls back to a system grantor when an assignment has no assigner', () => {
    expect(consentFromAssignment({ ...assignment, assigned_by: null }).grantor).toBe('system:assignment')
  })

  it('carries the five universal metadata fields on every projection (§2h)', () => {
    const objects = [
      familyFromProfile(profile),
      familyMemberFromProfile(profile),
      personFromLovedOne(lovedOne),
      consentFromAssignment(assignment),
    ]
    for (const obj of objects) {
      expect(obj.metadata).toEqual(
        expect.objectContaining({
          createdBy: expect.any(String),
          source: expect.any(String),
          confidence: expect.any(String),
          provenance: expect.any(String),
          consentScope: expect.any(String),
        }),
      )
    }
  })
})
