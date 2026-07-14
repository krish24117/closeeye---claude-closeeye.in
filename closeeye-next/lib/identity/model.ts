/**
 * Close Eye — Identity model (Layer 1 of the Intelligence Stack, Constitution §2f).
 *
 * These are the CANONICAL target shapes the platform is moving toward. During
 * Migration Phase A (Shadow) they are produced *read-only* by the adapter
 * (./adapter.ts) as a projection of the current production tables — nothing is
 * written yet, nothing a family sees changes (Constitution §2g).
 *
 * Design note (Constitution §6 — prove correctness before optimizing): this file
 * is deliberately plain and explicit so it can be reasoned about and verified,
 * not optimised. Clarity over cleverness.
 */

/** Identity Confidence — how much we trust an identity fact (Constitution §2h). */
export type ConfidenceState =
  | 'Manual' // a family member entered it directly — highest human authority
  | 'Confirmed' // a family member accepted a system suggestion
  | 'Suggested' // the system proposed it; not yet trusted — ask, never assert
  | 'Unknown' // unresolved / ambiguous — ask, never assume

/** The vocabulary of consent purposes (Constitution §2h — purpose-based consent). */
export type ConsentPurpose =
  | 'care-coordination'
  | 'health-review'
  | 'emergency-response'
  | 'ai-reasoning'
  | 'family-sharing'

/**
 * Universal metadata carried by EVERY domain object, platform-wide (Constitution §2h).
 * This is what makes trust, explainability, and consent structural on every object.
 */
export interface ObjectMetadata {
  /** The principal that created it — a member id, or a system marker. */
  createdBy: string
  /** Where it came from, e.g. 'legacy-adapter:loved_ones'. */
  source: string
  /** How much we trust it. */
  confidence: ConfidenceState
  /** The chain back to the origin, e.g. 'loved_ones#<row id>'. */
  provenance: string
  /** The consent context under which it may be accessed/used. */
  consentScope: string
}

/** The tenant & privacy boundary. Every object belongs to exactly one Family. */
export interface Family {
  /** The family boundary id. Today this is the account holder's auth user id. */
  id: string
  status: 'active'
  metadata: ObjectMetadata
}

/** A logged-in human operating within a Family (the account holder / member). */
export interface FamilyMember {
  id: string
  familyId: string
  authUserId: string
  displayName: string | null
  appRole: 'owner' | 'member'
  metadata: ObjectMetadata
}

/**
 * A human the family cares for or acts as — the SUBJECT of understanding.
 * Identity attributes ONLY; health, preferences, and media live in later layers
 * under their own consent, never here.
 */
export interface Person {
  id: string
  familyId: string
  displayName: string
  /** The bond as the family states it, e.g. 'Mother'. */
  relationshipToFamily: string | null
  age: number | null
  city: string | null
  isMinor: boolean
  status: 'active'
  metadata: ObjectMetadata
}

/**
 * A canonical typed bond between two Persons. Defined here for model completeness;
 * the adapter does not project relationships until increment A2 (it needs the
 * account holder represented as a Person first).
 */
export interface Relationship {
  id: string
  familyId: string
  fromPersonId: string
  toPersonId: string
  type: string
  status: 'active' | 'archived'
  metadata: ObjectMetadata
}

/**
 * A purpose-scoped permission record (Constitution §2h). Append-only in the real
 * model (an update is a superseding row); in Shadow it is a read-only projection.
 */
export interface Consent {
  id: string
  familyId: string
  /** Who granted it — a member id, or a system marker for legacy-derived grants. */
  grantor: string
  /** Who is permitted, e.g. 'presence_manager:<user id>'. */
  grantee: string
  /** What it covers, e.g. 'family:<id>'. */
  scope: string
  purpose: ConsentPurpose
  grantedAt: string | null
  expiresAt: string | null
  status: 'active' | 'revoked'
  metadata: ObjectMetadata
}
