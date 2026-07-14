/**
 * Comprehensive, purpose-based tests for the Shadow can_access() gate (Phase A · A3).
 *
 * Coverage: owner implicit access per purpose, the AI-egress exclusion, staff
 * consent inheritance, cross-tenant / unresolved denial, most-specific override
 * (a revoked person-scope grant beating a family-scope allow), confidence
 * propagation from the Identity Confidence model, full explainability (all six
 * fields), and determinism.
 */

import { describe, it, expect } from 'vitest'
import { canAccess, type AccessRequest } from './can-access'
import type { ShadowFamily } from './shadow-source'
import type { Consent, ConsentPurpose, Family, FamilyMember, ObjectMetadata, Person } from './model'

const meta = (confidence: ObjectMetadata['confidence'] = 'Manual'): ObjectMetadata => ({
  createdBy: 'test',
  source: 'test',
  confidence,
  provenance: 'test',
  consentScope: 'family-internal',
})

const FID = 'f1'

function person(id: string, confidence: ObjectMetadata['confidence'] = 'Manual'): Person {
  return {
    id,
    familyId: FID,
    displayName: id,
    relationshipToFamily: 'Mother',
    age: 72,
    city: 'Hyderabad',
    isMinor: false,
    status: 'active',
    metadata: meta(confidence),
  }
}

function consent(over: Partial<Consent>): Consent {
  return {
    id: 'c',
    familyId: FID,
    grantor: 'admin',
    grantee: 'presence_manager:pm1',
    scope: `family:${FID}`,
    purpose: 'care-coordination',
    grantedAt: null,
    expiresAt: null,
    status: 'active',
    metadata: meta(),
    ...over,
  }
}

function family(over?: Partial<ShadowFamily>): ShadowFamily {
  const fam: Family = { id: FID, status: 'active', metadata: meta() }
  const owner: FamilyMember = {
    id: FID,
    familyId: FID,
    authUserId: FID,
    displayName: 'Asha',
    appRole: 'owner',
    metadata: meta(),
  }
  return {
    family: fam,
    owner,
    persons: [person('p1')],
    consents: [consent({ id: 'c-pm' })],
    ...over,
  }
}

const req = (grantee: string, objectRef: string, purpose: ConsentPurpose): AccessRequest => ({ grantee, objectRef, purpose })
const OWNER = `family:${FID}`

describe('canAccess — family (owner) implicit access, per purpose', () => {
  for (const purpose of ['care-coordination', 'health-review', 'emergency-response', 'family-sharing'] as ConsentPurpose[]) {
    it(`allows the owner on their own person for "${purpose}"`, () => {
      const d = canAccess(req(OWNER, 'person:p1', purpose), family())
      expect(d.decision).toBe('allow')
      expect(d.matchedRule).toBe('family-internal-implicit')
    })
  }

  it('allows the owner on the family object itself', () => {
    expect(canAccess(req(OWNER, `family:${FID}`, 'care-coordination'), family()).decision).toBe('allow')
  })

  it('DENIES the owner "ai-reasoning" — AI egress needs explicit consent', () => {
    const d = canAccess(req(OWNER, 'person:p1', 'ai-reasoning'), family())
    expect(d.decision).toBe('deny')
    expect(d.matchedRule).toBe('purpose-not-permitted')
  })
})

describe('canAccess — staff consent, purpose-scoped', () => {
  it('allows a PM on a person via the family-scope care-coordination grant (inheritance)', () => {
    const d = canAccess(req('presence_manager:pm1', 'person:p1', 'care-coordination'), family())
    expect(d.decision).toBe('allow')
    expect(d.matchedRule).toBe('consent:c-pm')
    expect(d.consentSource).toBe('c-pm')
  })

  it('DENIES the same PM a different purpose (health-review) — no grant', () => {
    const d = canAccess(req('presence_manager:pm1', 'person:p1', 'health-review'), family())
    expect(d.decision).toBe('deny')
    expect(d.matchedRule).toBe('default-deny')
  })

  it('DENIES ai-external by default — nothing reaches the model without explicit consent', () => {
    expect(canAccess(req('ai-external', 'person:p1', 'ai-reasoning'), family()).decision).toBe('deny')
  })

  it('DENIES a doctor by default', () => {
    expect(canAccess(req('doctor:d1', 'person:p1', 'health-review'), family()).decision).toBe('deny')
  })
})

describe('canAccess — isolation & unresolved objects', () => {
  it('denies an object that does not resolve within this family', () => {
    const d = canAccess(req(OWNER, 'person:does-not-exist', 'care-coordination'), family())
    expect(d.decision).toBe('deny')
    expect(d.matchedRule).toBe('unresolved-object')
  })

  it("denies another family's owner acting on this family (default-deny)", () => {
    const d = canAccess(req('family:other', 'person:p1', 'care-coordination'), family())
    expect(d.decision).toBe('deny')
    expect(d.matchedRule).toBe('default-deny')
  })
})

describe('canAccess — most-specific override', () => {
  it('a revoked person-scope grant beats a family-scope allow', () => {
    const fam = family({
      consents: [
        consent({ id: 'c-fam', scope: `family:${FID}`, status: 'active' }),
        consent({ id: 'c-person', scope: 'person:p1', status: 'revoked' }),
      ],
    })
    const d = canAccess(req('presence_manager:pm1', 'person:p1', 'care-coordination'), fam)
    expect(d.decision).toBe('deny')
    expect(d.matchedRule).toBe('consent-revoked:c-person')
  })

  it('a person-scope active grant enables a purpose not granted at family level', () => {
    const fam = family({
      consents: [consent({ id: 'c-doc', grantee: 'doctor:d1', scope: 'person:p1', purpose: 'health-review', status: 'active' })],
    })
    const d = canAccess(req('doctor:d1', 'person:p1', 'health-review'), fam)
    expect(d.decision).toBe('allow')
    expect(d.consentSource).toBe('c-doc')
  })
})

describe('canAccess — confidence propagation (§2h Identity Confidence)', () => {
  it('lowers decision confidence to the least-trusted evidence', () => {
    const fam = family({ persons: [person('p1', 'Suggested')] })
    const d = canAccess(req(OWNER, 'person:p1', 'care-coordination'), fam)
    expect(d.decision).toBe('allow')
    expect(d.confidence).toBe('Suggested')
  })

  it('keeps high confidence when all evidence is Manual', () => {
    expect(canAccess(req(OWNER, 'person:p1', 'care-coordination'), family()).confidence).toBe('Manual')
  })
})

describe('canAccess — explainability & determinism (Constitution §6)', () => {
  const cases: AccessRequest[] = [
    req(OWNER, 'person:p1', 'care-coordination'),
    req(OWNER, 'person:p1', 'ai-reasoning'),
    req('presence_manager:pm1', 'person:p1', 'care-coordination'),
    req('doctor:d1', 'person:p1', 'health-review'),
    req(OWNER, 'person:none', 'care-coordination'),
  ]

  it('every decision carries all six explainable fields', () => {
    for (const c of cases) {
      const d = canAccess(c, family())
      expect(d).toEqual(
        expect.objectContaining({
          decision: expect.stringMatching(/^(allow|deny)$/),
          reason: expect.any(String),
          matchedRule: expect.any(String),
          evidence: expect.any(Object),
          confidence: expect.any(String),
        }),
      )
      expect(d).toHaveProperty('consentSource') // null or a string, but always present
      expect(d.evidence).toMatchObject({ grantee: c.grantee, objectRef: c.objectRef, purpose: c.purpose })
    }
  })

  it('is deterministic — identical inputs produce identical outputs', () => {
    for (const c of cases) {
      expect(canAccess(c, family())).toEqual(canAccess(c, family()))
    }
  })
})
