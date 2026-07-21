/**
 * The Collaboration & Delegation Platform — domain model.
 *
 * NOT chat, NOT a task manager, NOT a document manager: a Life Coordination layer where AI, family and
 * trusted professionals understand → discuss → decide → delegate → complete → remember, TOGETHER. It is
 * provider-independent and sits ALONGSIDE the frozen understanding platform — reusing its Domain, Space,
 * Family Policy, Knowledge Graph and Timeline, modifying none of them.
 *
 * Principles encoded here: every object is collaborative; every invitation has a purpose; every role
 * respects Family Policy; every contribution becomes timeline + graph (it strengthens the Family Brain).
 */
import type { Domain, Space } from '@/lib/understanding/types'

/** Everything the family provides or lives can be collaborated on — reuses asset/entity vocabulary. */
export type CollaborativeObjectType =
  | 'person' | 'family' | 'personal_profile' | 'business_profile' | 'property'
  | 'medical_report' | 'insurance' | 'passport' | 'legal_document' | 'financial_document'
  | 'travel_plan' | 'reminder' | 'task' | 'timeline_event' | 'guardian_visit'
  | 'presence_visit' | 'memory' | 'business_meeting' | 'lawyer_consultation'

/** Who can be brought in. Every role respects Family Policy + per-domain competence. */
export type CollaborationRole =
  | 'owner' | 'family_member' | 'presence_manager' | 'guardian' | 'doctor'
  | 'lawyer' | 'chartered_accountant' | 'financial_advisor' | 'business_partner' | 'guest'

export interface ObjectRef {
  type: CollaborativeObjectType
  id: string
  label: string
  domain: Domain
  space?: Space
}

export type CollaborationAction = 'share' | 'invite' | 'assign' | 'comment' | 'complete' | 'resolve' | 'request_info'

export interface Collaborator { id: string; name: string; role: CollaborationRole }

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'
export interface Invitation {
  id: string
  object: ObjectRef
  inviteeContact: string
  role: CollaborationRole
  /** REQUIRED — an invitation always solves a problem; never "invite for growth". */
  purpose: string
  status: InvitationStatus
  invitedBy: string
  createdAt: string
}

export type AssignmentStatus = 'open' | 'in_progress' | 'done' | 'blocked'
export interface Assignment {
  id: string
  object: ObjectRef
  task: string
  assignee: Collaborator
  dueAt?: string
  status: AssignmentStatus
  assignedBy: string
  createdAt: string
}

/** An object OWNS its own discussion thread — belongs to context, never a generic chat room. */
export interface ThreadMessage { id: string; objectId: string; author: Collaborator; body: string; at: string }

export type CollaborationEventKind =
  | 'shared' | 'invited' | 'accepted' | 'declined' | 'assigned' | 'commented' | 'reviewed' | 'completed' | 'requested_info'

/** Every collaboration becomes history — timeline-ready and graph-ready. */
export interface CollaborationEvent {
  id: string
  object: ObjectRef
  kind: CollaborationEventKind
  actor: string
  targetName?: string
  at: string
  summary: string
}

/** A contextual collaboration suggestion — extends the Action Orchestrator with WHO can help + why. */
export interface CollaborationProposal {
  action: CollaborationAction
  role?: CollaborationRole
  label: string
  rationale: string
  requiresConfirmation: boolean
}
