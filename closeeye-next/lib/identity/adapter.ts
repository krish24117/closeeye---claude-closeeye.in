/**
 * Close Eye — Identity Shadow adapter (Migration Phase A).
 *
 * PURE, READ-ONLY projections from the current production tables into the new
 * Identity model (./model.ts). These functions take a legacy row and return a new
 * shape — they perform NO database access, NO writes, and touch NO request path.
 * That is the entire point of Phase A: prove the new model reproduces production
 * reality, with zero risk (Constitution §2g).
 *
 * Design note (Constitution §6): clarity over cleverness. Every mapping is written
 * out plainly so it can be read and verified line by line — not optimised.
 */

import type { Profile, LovedOne } from '@/lib/db/types'
import type { Consent, ConfidenceState, Family, FamilyMember, ObjectMetadata, Person } from './model'

/**
 * A row from the production `family_assignments` table
 * (see supabase/migrations/20260708010000_permission_architecture.sql).
 */
export interface FamilyAssignmentRow {
  id: string
  presence_manager_id: string
  family_user_id: string
  assigned_by: string | null
  assigned_at: string | null
}

/**
 * Production records were entered by a real family member, so we treat their
 * identity as Manual (highest human authority) until we ever learn otherwise.
 * This single judgement is kept explicit and in one place on purpose.
 */
const LEGACY_CONFIDENCE: ConfidenceState = 'Manual'

/** Build the universal metadata (Constitution §2h) for a legacy-derived object. */
function legacyMetadata(source: string, provenance: string, createdBy: string): ObjectMetadata {
  return {
    createdBy,
    source,
    confidence: LEGACY_CONFIDENCE,
    provenance,
    consentScope: 'family-internal',
  }
}

/**
 * Project a production `profiles` row into the Family it anchors.
 * Today one account holder == one family, so the family id is the user's id.
 */
export function familyFromProfile(p: Profile): Family {
  return {
    id: p.id,
    status: 'active',
    metadata: legacyMetadata('legacy-adapter:profiles', `profiles#${p.id}`, p.id),
  }
}

/** Project a production `profiles` row into the account holder as a FamilyMember. */
export function familyMemberFromProfile(p: Profile): FamilyMember {
  return {
    id: p.id,
    familyId: p.id,
    authUserId: p.id,
    displayName: p.full_name,
    appRole: 'owner',
    metadata: legacyMetadata('legacy-adapter:profiles', `profiles#${p.id}`, p.id),
  }
}

/**
 * Project a production `loved_ones` row into a Person — identity attributes only.
 * Medical notes, doctor, hospital, and emergency contacts are deliberately NOT
 * carried here; they belong to later layers under their own consent.
 */
export function personFromLovedOne(lo: LovedOne): Person {
  return {
    id: lo.id,
    familyId: lo.family_user_id,
    displayName: lo.full_name,
    relationshipToFamily: lo.relationship,
    age: lo.age,
    city: lo.city,
    isMinor: typeof lo.age === 'number' ? lo.age < 18 : false,
    status: 'active',
    metadata: legacyMetadata('legacy-adapter:loved_ones', `loved_ones#${lo.id}`, lo.family_user_id),
  }
}

/**
 * Project a `family_assignments` row into the Consent it represents: assigning a
 * Presence Manager to a family IS a purpose-scoped grant to coordinate their care.
 */
export function consentFromAssignment(a: FamilyAssignmentRow): Consent {
  const grantor = a.assigned_by ?? 'system:assignment'
  return {
    id: a.id,
    familyId: a.family_user_id,
    grantor,
    grantee: `presence_manager:${a.presence_manager_id}`,
    scope: `family:${a.family_user_id}`,
    purpose: 'care-coordination',
    grantedAt: a.assigned_at,
    expiresAt: null,
    status: 'active',
    metadata: legacyMetadata('legacy-adapter:family_assignments', `family_assignments#${a.id}`, grantor),
  }
}
