/**
 * The Collaboration Engine — provider-independent, deterministic, and governed by the frozen Family
 * Policy. It decides who may access an object, turns an owner's decision into a purposeful invitation
 * or a delegated assignment, records every collaboration as a timeline-ready event + a graph update
 * (extending the Knowledge Graph beyond memories), and proposes CONTEXTUAL collaborations after an
 * answer. It reuses the understanding platform; it modifies none of it.
 */
import type { Domain, GraphEdge, GraphNode, KnowledgeGraphUpdate, Space } from '@/lib/understanding/types'
import { policyFor, type FamilyPolicy } from '@/lib/understanding/policy'
import { roleCompetentFor } from './roles'
import type {
  Assignment, CollaborationAction, CollaborationEvent, CollaborationEventKind, CollaborationProposal,
  CollaborationRole, Collaborator, Invitation, NextStep, NextStepKind, ObjectRef,
  RecommendedNextSteps, TrustedGroup, TrustedIdentity, TrustedNetwork,
} from './types'

/* ── Access (passive) — who can SEE an object without an explicit invite, under Family Policy ─────── */
export function canRoleAccess(role: CollaborationRole, ref: ObjectRef, policy: FamilyPolicy): boolean {
  if (role === 'owner') return true
  if (!roleCompetentFor(role, ref)) return false
  const sharing = policyFor(policy, ref.domain).sharing
  if (role === 'family_member') return sharing === 'family' || sharing === 'guardians'
  if (role === 'guardian' || role === 'presence_manager') return sharing === 'guardians'
  return false // professionals / guests reach an object only via an explicit invitation
}

/* ── Invitation (owner's explicit grant) — always with purpose ───────────────────────────────────── */
export function canInvite(ref: ObjectRef, role: CollaborationRole, _policy: FamilyPolicy): boolean {
  if (role === 'guest') return true // a guest can be invited to a single object the owner chooses to share
  return roleCompetentFor(role, ref) // the owner may bring in a competent professional/family for THIS object
}

export function createInvitation(args: {
  id: string; object: ObjectRef; inviteeContact: string; role: CollaborationRole; purpose: string
  invitedBy: string; at: string; policy: FamilyPolicy
}): Invitation | { error: string } {
  if (!args.purpose.trim()) return { error: 'An invitation must have a purpose — say what it will help with.' }
  if (!canInvite(args.object, args.role, args.policy)) return { error: `A ${label(args.role)} can’t be invited to a ${args.object.domain} item.` }
  return {
    id: args.id, object: args.object, inviteeContact: args.inviteeContact, role: args.role,
    purpose: args.purpose.trim(), status: 'pending', invitedBy: args.invitedBy, createdAt: args.at,
  }
}

export function respondToInvitation(inv: Invitation, accept: boolean, at: string): { invitation: Invitation; event: CollaborationEvent } {
  const invitation: Invitation = { ...inv, status: accept ? 'accepted' : 'declined' }
  const event = event_(`inv-${inv.id}-${accept ? 'a' : 'd'}`, inv.object, accept ? 'accepted' : 'declined', inv.inviteeContact, at,
    `${label(inv.role)} ${accept ? 'accepted' : 'declined'}: ${inv.purpose}`)
  return { invitation, event }
}

/* ── Delegation — assign responsibility; assignments become timeline events ──────────────────────── */
export function createAssignment(args: {
  id: string; object: ObjectRef; task: string; assignee: Collaborator; assignedBy: string; at: string; dueAt?: string
}): { assignment: Assignment; event: CollaborationEvent } {
  const assignment: Assignment = {
    id: args.id, object: args.object, task: args.task, assignee: args.assignee, dueAt: args.dueAt,
    status: 'open', assignedBy: args.assignedBy, createdAt: args.at,
  }
  const event = event_(`asg-${args.id}`, args.object, 'assigned', args.assignedBy, args.at,
    `Assigned “${args.task}” to ${args.assignee.name}`, args.assignee.name)
  return { assignment, event }
}

export function completeAssignment(a: Assignment, at: string): { assignment: Assignment; event: CollaborationEvent } {
  const assignment: Assignment = { ...a, status: 'done' }
  const event = event_(`asg-${a.id}-done`, a.object, 'completed', a.assignee.name, at, `Completed “${a.task}”`)
  return { assignment, event }
}

/* ── Events → timeline + Knowledge Graph (collaboration is history, and part of the Family Brain) ──── */
function event_(id: string, object: ObjectRef, kind: CollaborationEventKind, actor: string, at: string, summary: string, targetName?: string): CollaborationEvent {
  return { id, object, kind, actor, at, summary, targetName }
}
export { event_ as collaborationEvent }

const EDGE: Partial<Record<CollaborationEventKind, string>> = {
  shared: 'shared_with', assigned: 'assigned_to', reviewed: 'reviewed_by', completed: 'completed_by', accepted: 'joined',
}

/** Extend the Knowledge Graph with a collaboration edge: Krishna → shared → Insurance → reviewed_by → Sister. */
export function collaborationGraph(e: CollaborationEvent): KnowledgeGraphUpdate {
  const objNode: GraphNode = { id: `obj:${e.object.id}`, type: e.object.type, label: e.object.label }
  const actorNode: GraphNode = { id: `actor:${e.actor}`, type: 'person', label: e.actor }
  const nodes: GraphNode[] = [objNode, actorNode]
  const edges: GraphEdge[] = [{ from: actorNode.id, to: objNode.id, type: e.kind }]
  if (e.targetName) {
    const target: GraphNode = { id: `actor:${e.targetName}`, type: 'person', label: e.targetName }
    nodes.push(target)
    edges.push({ from: objNode.id, to: target.id, type: EDGE[e.kind] ?? e.kind })
  }
  return { nodes, edges }
}

/* ── Capabilities — what an actor may do on an object, right now ─────────────────────────────────── */
export function collaborationCapabilities(ref: ObjectRef, actorRole: CollaborationRole, policy: FamilyPolicy): CollaborationAction[] {
  if (actorRole === 'owner') return ['share', 'invite', 'assign', 'comment', 'complete', 'resolve', 'request_info']
  if (!canRoleAccess(actorRole, ref, policy)) return []
  return ['comment', 'complete', 'request_info']
}

/* ── Contextual collaboration — extends the Action Orchestrator with WHO can help + why ──────────── */
const prop = (action: CollaborationAction, role: CollaborationRole | undefined, label: string, rationale: string): CollaborationProposal =>
  ({ action, role, label, rationale, requiresConfirmation: true })

export function proposeCollaboration(ctx: { domain: Domain; space?: Space }, policy: FamilyPolicy): CollaborationProposal[] {
  const out: CollaborationProposal[] = []
  const guardiansOn = policyFor(policy, 'trusted_presence').sharing === 'guardians'

  if (ctx.domain === 'health') {
    out.push(prop('share', 'family_member', 'Share with a family member', 'someone who cares should see this'))
    out.push(prop('invite', 'doctor', 'Invite a doctor to review', 'a clinician can interpret it properly'))
    if (guardiansOn) out.push(prop('invite', 'guardian', 'Invite a Guardian to check in', 'a real-world visit could help'))
  }
  if (ctx.domain === 'legal') {
    out.push(prop('invite', 'lawyer', 'Invite a lawyer to review', 'this needs a legal eye'))
    out.push(prop('request_info', undefined, 'Request the missing pages', 'the document looks incomplete'))
  }
  if (ctx.domain === 'finance') {
    out.push(prop('invite', 'chartered_accountant', 'Invite your CA to review', 'tax and finance review'))
    out.push(prop('assign', 'family_member', 'Assign this to someone', 'a family member can handle the payment'))
  }
  if (ctx.space === 'business') {
    out.push(prop('invite', 'business_partner', 'Invite your business partner', 'they should be across this'))
    out.push(prop('invite', 'lawyer', 'Assign a corporate lawyer', 'contract review'))
    out.push(prop('assign', undefined, 'Schedule a meeting', 'coordinate the next step'))
  }
  if (ctx.space === 'property') {
    out.push(prop('invite', 'family_member', 'Invite a co-owner', 'a family co-owner should see this'))
    out.push(prop('invite', 'lawyer', 'Assign a lawyer', 'property/legal review'))
  }
  if (ctx.space === 'travel') {
    out.push(prop('invite', 'family_member', 'Invite your spouse', 'share the itinerary'))
    out.push(prop('assign', 'presence_manager', 'Assign a Presence Manager', 'coordinate on the ground'))
  }
  return out
}

/* ── Recommended Next Steps — the UNIVERSAL section every answer ends with ────────────────────────────
 * Four groups, always in this order, for EVERY domain: Continue yourself · Ask someone · Trusted help ·
 * Complete. Only the middle two vary by context (via proposeCollaboration). The first and last are
 * domain-agnostic, so the family learns one model whether it's an MRI or a sale deed. Empty groups are
 * dropped, so an answer that needs no collaborator still shows Continue yourself + Complete. */
const PROFESSIONAL = new Set<CollaborationRole>([
  'doctor', 'lawyer', 'chartered_accountant', 'financial_advisor', 'presence_manager', 'guardian', 'business_partner',
])
const ACTION_KIND: Partial<Record<CollaborationAction, NextStepKind>> = {
  share: 'share', invite: 'invite', assign: 'assign', request_info: 'request',
}

export function recommendNextSteps(ctx: { domain: Domain; space?: Space }, policy: FamilyPolicy): RecommendedNextSteps {
  const ask: NextStep[] = []
  const trusted: NextStep[] = []
  for (const p of proposeCollaboration(ctx, policy)) {
    const isTrusted = !!p.role && PROFESSIONAL.has(p.role)
    ;(isTrusted ? trusted : ask).push({
      group: isTrusted ? 'trusted_help' : 'ask_someone',
      kind: ACTION_KIND[p.action] ?? 'share',
      role: p.role, label: p.label, rationale: p.rationale,
    })
  }
  const step = (group: NextStep['group'], kind: NextStepKind, label: string, rationale: string): NextStep =>
    ({ group, kind, label, rationale })

  const sections = [
    {
      group: 'continue_yourself' as const, title: 'Continue yourself', steps: [
        step('continue_yourself', 'save', 'Save to Family Brain', 'keep this so future answers know it'),
        step('continue_yourself', 'compare', 'Compare with the previous one', 'see what changed over time'),
        step('continue_yourself', 'reminder', 'Set a reminder', 'so it isn’t forgotten'),
      ],
    },
    {
      group: 'ask_someone' as const, title: 'Ask someone',
      steps: ask.length ? ask : [step('ask_someone', 'share', 'Share with a family member', 'someone close may want to see this')],
    },
    { group: 'trusted_help' as const, title: 'Trusted help', steps: trusted },
    {
      group: 'complete' as const, title: 'Complete the task', steps: [
        step('complete', 'complete', 'Mark complete', 'when it’s taken care of'),
        step('complete', 'archive', 'Archive', 'put it away — the record stays'),
        step('complete', 'follow', 'Follow progress', 'get updates as it moves'),
      ],
    },
  ]
  return { sections: sections.filter((s) => s.steps.length > 0) }
}

/* ── Trusted Network — the extensible ecosystem, grouped for the human ────────────────────────────── */
function roleGroup(role: CollaborationRole): TrustedGroup {
  if (role === 'presence_manager' || role === 'guardian') return 'trusted_presence'
  if (role === 'business_partner') return 'business'
  if (role === 'doctor' || role === 'lawyer' || role === 'chartered_accountant' || role === 'financial_advisor') return 'professionals'
  return 'family' // owner / family_member / guest
}

export function groupTrustedNetwork(identities: TrustedIdentity[]): TrustedNetwork {
  const order: [TrustedGroup, string][] = [
    ['family', 'Family'], ['trusted_presence', 'Trusted Presence'],
    ['professionals', 'Professionals'], ['business', 'Business'],
  ]
  return {
    groups: order
      .map(([group, title]) => ({ group, title, members: identities.filter((i) => roleGroup(i.role) === group) }))
      .filter((g) => g.members.length > 0),
  }
}

function label(role: CollaborationRole): string {
  return role.replace(/_/g, ' ')
}
