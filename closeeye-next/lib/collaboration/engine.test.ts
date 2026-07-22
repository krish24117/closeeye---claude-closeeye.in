/**
 * The Collaboration Engine's contracts, frozen: invitations always have a purpose and a competent
 * role, access respects Family Policy, delegation becomes timeline + graph history, and contextual
 * collaboration is proposed per domain/space — never generic.
 */
import { describe, it, expect } from 'vitest'
import {
  canInvite, canRoleAccess, createInvitation, createAssignment, completeAssignment,
  collaborationGraph, collaborationCapabilities, proposeCollaboration, respondToInvitation,
  recommendNextSteps, groupTrustedNetwork,
} from './engine'
import { PRIVACY_FIRST_POLICY } from '@/lib/understanding/policy'
import type { ObjectRef, Collaborator, Invitation, TrustedIdentity } from './types'

const AT = '2026-07-22T00:00:00Z'
const P = PRIVACY_FIRST_POLICY
const medReport: ObjectRef = { type: 'medical_report', id: 'o2', label: "Amma's report", domain: 'health', space: 'family' }
const legalDoc: ObjectRef = { type: 'legal_document', id: 'o1', label: 'Agreement', domain: 'legal', space: 'personal' }
const idDoc: ObjectRef = { type: 'passport', id: 'o4', label: 'Passport', domain: 'identity', space: 'personal' }
const presenceObj: ObjectRef = { type: 'presence_visit', id: 'o5', label: 'Dad visit', domain: 'trusted_presence', space: 'family' }

describe('Collaboration Engine — invitations with purpose + competence', () => {
  it('refuses an invitation with no purpose', () => {
    const r = createInvitation({ id: 'i1', object: legalDoc, inviteeContact: 'a@b.c', role: 'lawyer', purpose: '   ', invitedBy: 'me', at: AT, policy: P })
    expect('error' in r).toBe(true)
  })
  it('creates a pending invitation when purpose + role are right', () => {
    const r = createInvitation({ id: 'i1', object: legalDoc, inviteeContact: 'a@b.c', role: 'lawyer', purpose: 'Review this agreement', invitedBy: 'me', at: AT, policy: P })
    expect('error' in r).toBe(false)
    expect((r as Invitation).status).toBe('pending')
  })
  it('enforces role competence — a lawyer for legal, a doctor for medical, not the reverse', () => {
    expect(canInvite(legalDoc, 'lawyer', P)).toBe(true)
    expect(canInvite(legalDoc, 'doctor', P)).toBe(false)
    expect(canInvite(medReport, 'doctor', P)).toBe(true)
    expect(canInvite(medReport, 'lawyer', P)).toBe(false)
  })
})

describe('Collaboration Engine — access respects Family Policy', () => {
  it('family sees family-shared health, not a private identity doc', () => {
    expect(canRoleAccess('family_member', medReport, P)).toBe(true)
    expect(canRoleAccess('family_member', idDoc, P)).toBe(false)
  })
  it('a Guardian reaches Trusted-Presence (shared with guardians), not a health report', () => {
    expect(canRoleAccess('guardian', presenceObj, P)).toBe(true)
    expect(canRoleAccess('guardian', medReport, P)).toBe(false)
  })
  it('capabilities: owner can do everything; a member can discuss; no access → nothing', () => {
    expect(collaborationCapabilities(medReport, 'owner', P)).toContain('invite')
    expect(collaborationCapabilities(medReport, 'family_member', P)).toEqual(['comment', 'complete', 'request_info'])
    expect(collaborationCapabilities(idDoc, 'family_member', P)).toEqual([])
  })
})

describe('Collaboration Engine — delegation becomes history', () => {
  const assignee: Collaborator = { id: 'sis', name: 'Sister', role: 'family_member' }
  it('an assignment produces a timeline-ready event and a graph edge', () => {
    const { assignment, event } = createAssignment({ id: 'a1', object: medReport, task: 'Buy the medicines', assignee, assignedBy: 'Krishna', at: AT })
    expect(assignment.status).toBe('open')
    expect(event.kind).toBe('assigned')
    expect(event.summary).toContain('Buy the medicines')
    expect(collaborationGraph(event).edges.some((e) => e.type === 'assigned_to')).toBe(true)
  })
  it('completion closes it out on the timeline', () => {
    const { assignment } = createAssignment({ id: 'a1', object: medReport, task: 'Buy the medicines', assignee, assignedBy: 'Krishna', at: AT })
    expect(completeAssignment(assignment, AT).event.kind).toBe('completed')
  })
  it('an invitation response is recorded', () => {
    const inv = createInvitation({ id: 'i1', object: legalDoc, inviteeContact: 'a@b.c', role: 'lawyer', purpose: 'Review', invitedBy: 'me', at: AT, policy: P }) as Invitation
    expect(respondToInvitation(inv, true, AT).event.kind).toBe('accepted')
  })
})

describe('Collaboration Engine — contextual, never generic', () => {
  it('a blood report proposes share + doctor + Guardian', () => {
    const props = proposeCollaboration({ domain: 'health' }, P)
    expect(props.some((p) => p.role === 'doctor')).toBe(true)
    expect(props.some((p) => p.action === 'share' && p.role === 'family_member')).toBe(true)
  })
  it('a business object proposes a business partner + corporate lawyer', () => {
    const props = proposeCollaboration({ domain: 'general', space: 'business' }, P)
    expect(props.some((p) => p.role === 'business_partner')).toBe(true)
    expect(props.some((p) => p.role === 'lawyer')).toBe(true)
  })
  it('a legal document proposes a lawyer + requesting missing pages', () => {
    const props = proposeCollaboration({ domain: 'legal' }, P)
    expect(props.some((p) => p.role === 'lawyer')).toBe(true)
    expect(props.some((p) => p.action === 'request_info')).toBe(true)
  })
})

describe('Recommended Next Steps — one universal model across every domain', () => {
  const groups = (domain: any, space?: any) => recommendNextSteps({ domain, space }, P).sections.map((s) => s.group)

  it('always offers Continue yourself + Complete, even with no collaborator (identity is private)', () => {
    // identity proposes nothing contextual, so ask falls back and trusted drops — the model still holds.
    const g = groups('identity')
    expect(g).toContain('continue_yourself')
    expect(g).toContain('complete')
  })

  it('is IDENTICAL in structure across health, legal and business — only the steps differ', () => {
    const health = recommendNextSteps({ domain: 'health' }, P)
    const legal = recommendNextSteps({ domain: 'legal' }, P)
    const business = recommendNextSteps({ domain: 'general', space: 'business' }, P)
    // Same four-group order everywhere.
    for (const r of [health, legal, business]) {
      expect(r.sections.map((s) => s.group)).toEqual(['continue_yourself', 'ask_someone', 'trusted_help', 'complete'])
    }
    // Trusted help is domain-tailored: a doctor for health, a lawyer for legal, a partner for business.
    const trusted = (r: typeof health) => r.sections.find((s) => s.group === 'trusted_help')!.steps.map((x) => x.role)
    expect(trusted(health)).toContain('doctor')
    expect(trusted(legal)).toContain('lawyer')
    expect(trusted(business)).toContain('business_partner')
  })

  it('Continue yourself always works alone — save, compare, remind need no one else', () => {
    const cont = recommendNextSteps({ domain: 'general', space: 'travel' }, P).sections.find((s) => s.group === 'continue_yourself')!
    expect(cont.steps.map((s) => s.kind)).toEqual(['save', 'compare', 'reminder'])
  })
})

describe('Trusted Network — extensible identities grouped for the human', () => {
  const net: TrustedIdentity[] = [
    { id: 'p1', name: 'Sister', role: 'family_member', permissions: [], verificationStatus: 'verified', availability: 'available' },
    { id: 'p2', name: 'Rukmini', role: 'presence_manager', permissions: [], verificationStatus: 'verified', availability: 'available' },
    { id: 'p3', name: 'Dr. Rao', role: 'doctor', organization: 'Apollo', permissions: [], verificationStatus: 'pending', availability: 'unknown' },
    { id: 'p4', name: 'Partner', role: 'business_partner', permissions: [], verificationStatus: 'unverified', availability: 'busy' },
  ]
  it('groups family / trusted presence / professionals / business without hardcoding a person', () => {
    const g = groupTrustedNetwork(net)
    expect(g.groups.map((s) => s.group)).toEqual(['family', 'trusted_presence', 'professionals', 'business'])
    expect(g.groups.find((s) => s.group === 'professionals')?.members[0]?.name).toBe('Dr. Rao')
  })
  it('drops empty groups — a family with only relatives shows just Family', () => {
    const g = groupTrustedNetwork([net[0]!])
    expect(g.groups.map((s) => s.group)).toEqual(['family'])
  })
})
