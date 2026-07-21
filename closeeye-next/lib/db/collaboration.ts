/**
 * Collaboration & Delegation — the data layer over the frozen model (lib/collaboration) and its
 * persistence (migration 20260751000000). It maps DB rows ↔ the model's types, and lets the ENGINE
 * own the logic: purpose/competence is validated by lib/collaboration/engine before anything is
 * written, and every mutation records a timeline-ready collaboration_event so the story writes itself.
 *
 * Everything is family-owned by RLS (owner + their Presence Manager / Admin), so these functions never
 * pass family_user_id for reads — the policy scopes rows automatically. Writes stamp the caller as owner.
 */
import { supabase } from '@/lib/supabase'
import type { Domain } from '@/lib/understanding/types'
import {
  canInvite, completeAssignment as engineComplete, groupTrustedNetwork,
} from '@/lib/collaboration/engine'
import { PRIVACY_FIRST_POLICY } from '@/lib/understanding/policy'
import type {
  Assignment, AssignmentStatus, CollaborationEvent, CollaborationEventKind, CollaborationRole,
  DomainAccess, Invitation, ObjectRef, ThreadMessage, TrustedIdentity, TrustedNetwork,
  VerificationStatus, Availability,
} from '@/lib/collaboration/types'

type Result = { error: string | null }
const ok: Result = { error: null }
const fail = (e: string): Result => ({ error: e })

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/* ── row shapes ──────────────────────────────────────────────────────────────────────────────── */
interface IdentityRow {
  id: string; name: string; role: CollaborationRole; relationship: string | null; organization: string | null
  contact: string | null; verification_status: VerificationStatus; availability: Availability
  trusted_permissions?: { domain: Domain; can_view: boolean; can_comment: boolean; can_complete: boolean }[] | null
}
interface AssignmentRow {
  id: string; object_type: string; object_id: string; object_label: string; domain: Domain; space: string | null
  task: string; assignee_identity_id: string; due_at: string | null; status: AssignmentStatus; assigned_by: string; created_at: string
}
interface EventRow {
  id: string; object_type: string; object_id: string; object_label: string; domain: Domain; space: string | null
  kind: CollaborationEventKind; actor: string; target_name: string | null; summary: string; created_at: string
}
interface ThreadRow {
  id: string; object_type: string; object_id: string; author_identity_id: string | null; body: string; created_at: string
  trusted_identities?: { name: string; role: CollaborationRole } | null
}

/* ── mappers ─────────────────────────────────────────────────────────────────────────────────── */
const toIdentity = (r: IdentityRow): TrustedIdentity => ({
  id: r.id, name: r.name, role: r.role,
  relationship: r.relationship ?? undefined, organization: r.organization ?? undefined,
  permissions: (r.trusted_permissions ?? []).map((p) => ({ domain: p.domain, view: p.can_view, comment: p.can_comment, complete: p.can_complete })),
  verificationStatus: r.verification_status, availability: r.availability,
})
const toEvent = (r: EventRow): CollaborationEvent => ({
  id: r.id, object: { type: r.object_type as ObjectRef['type'], id: r.object_id, label: r.object_label, domain: r.domain, space: (r.space ?? undefined) as ObjectRef['space'] },
  kind: r.kind, actor: r.actor, targetName: r.target_name ?? undefined, at: r.created_at, summary: r.summary,
})

const objCols = (o: ObjectRef) => ({ object_type: o.type, object_id: o.id, object_label: o.label, domain: o.domain, space: o.space ?? null })

/* ── events: the single place a collaboration becomes history ────────────────────────────────── */
async function writeEvent(userId: string, o: ObjectRef, kind: CollaborationEventKind, actor: string, summary: string, targetName?: string): Promise<void> {
  await supabase.from('collaboration_events').insert({ family_user_id: userId, ...objCols(o), kind, actor, target_name: targetName ?? null, summary })
}

/* ── Trusted Network ─────────────────────────────────────────────────────────────────────────── */
export async function fetchTrustedNetwork(): Promise<TrustedNetwork> {
  const { data, error } = await supabase
    .from('trusted_identities')
    .select('id, name, role, relationship, organization, contact, verification_status, availability, trusted_permissions(domain, can_view, can_comment, can_complete)')
    .order('created_at', { ascending: true })
  if (error || !data) return { groups: [] }
  return groupTrustedNetwork((data as unknown as IdentityRow[]).map(toIdentity))
}

export async function upsertTrustedIdentity(input: {
  id?: string; name: string; role: CollaborationRole; relationship?: string; organization?: string; contact?: string
  linkedUserId?: string; verificationStatus?: VerificationStatus; availability?: Availability
}): Promise<{ id: string | null } & Result> {
  const userId = await uid()
  if (!userId) return { id: null, ...fail('not-signed-in') }
  if (!input.name.trim()) return { id: null, ...fail('no-name') }
  const row = {
    family_user_id: userId, name: input.name.trim(), role: input.role,
    relationship: input.relationship?.trim() || null, organization: input.organization?.trim() || null,
    contact: input.contact?.trim() || null, linked_user_id: input.linkedUserId ?? null,
    verification_status: input.verificationStatus ?? 'unverified', availability: input.availability ?? 'unknown',
  }
  const q = input.id
    ? supabase.from('trusted_identities').update(row).eq('id', input.id).select('id').single()
    : supabase.from('trusted_identities').insert(row).select('id').single()
  const { data, error } = await q
  if (error || !data) return { id: null, ...fail('could-not-save') }
  return { id: (data as { id: string }).id, ...ok }
}

export async function removeTrustedIdentity(id: string): Promise<Result> {
  const { error } = await supabase.from('trusted_identities').delete().eq('id', id)
  return error ? fail('could-not-remove') : ok
}

/** Replace a person's per-domain permissions (scoped trust, changed from one place). */
export async function setTrustedPermissions(identityId: string, permissions: DomainAccess[]): Promise<Result> {
  const userId = await uid()
  if (!userId) return fail('not-signed-in')
  await supabase.from('trusted_permissions').delete().eq('identity_id', identityId)
  if (!permissions.length) return ok
  const rows = permissions.map((p) => ({ identity_id: identityId, family_user_id: userId, domain: p.domain, can_view: p.view, can_comment: p.comment, can_complete: p.complete }))
  const { error } = await supabase.from('trusted_permissions').insert(rows)
  return error ? fail('could-not-save') : ok
}

/* ── Invitations — always with a purpose, always competent ───────────────────────────────────── */
export async function sendInvitation(input: {
  object: ObjectRef; role: CollaborationRole; purpose: string
  inviteeIdentityId?: string; inviteeContact?: string; actorName?: string
}): Promise<Result> {
  const userId = await uid()
  if (!userId) return fail('not-signed-in')
  if (!input.purpose.trim()) return fail('An invitation must have a purpose — say what it will help with.')
  if (!canInvite(input.object, input.role, PRIVACY_FIRST_POLICY)) return fail(`A ${input.role.replace(/_/g, ' ')} can’t be invited to a ${input.object.domain} item.`)
  const { error } = await supabase.from('collaboration_invitations').insert({
    family_user_id: userId, ...objCols(input.object), invitee_identity_id: input.inviteeIdentityId ?? null,
    invitee_contact: input.inviteeContact ?? null, role: input.role, purpose: input.purpose.trim(), invited_by: userId,
  })
  if (error) return fail('could-not-invite')
  await writeEvent(userId, input.object, 'invited', input.actorName ?? 'You', `Invited a ${input.role.replace(/_/g, ' ')}: ${input.purpose.trim()}`)
  return ok
}

export async function respondToInvitation(id: string, accept: boolean): Promise<Result> {
  const userId = await uid()
  if (!userId) return fail('not-signed-in')
  const { data, error } = await supabase
    .from('collaboration_invitations')
    .update({ status: accept ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
    .eq('id', id)
    .select('object_type, object_id, object_label, domain, space, role, purpose')
    .single()
  if (error || !data) return fail('could-not-update')
  const r = data as { object_type: string; object_id: string; object_label: string; domain: Domain; space: string | null; role: string; purpose: string }
  const o: ObjectRef = { type: r.object_type as ObjectRef['type'], id: r.object_id, label: r.object_label, domain: r.domain, space: (r.space ?? undefined) as ObjectRef['space'] }
  await writeEvent(userId, o, accept ? 'accepted' : 'declined', r.role.replace(/_/g, ' '), `${r.role.replace(/_/g, ' ')} ${accept ? 'accepted' : 'declined'}: ${r.purpose}`)
  return ok
}

/* ── Sharing — records the share + timeline event (visibility stays Family-Policy-gated) ───────── */
export async function shareObject(input: { object: ObjectRef; withName: string; actorName?: string }): Promise<Result> {
  const userId = await uid()
  if (!userId) return fail('not-signed-in')
  await writeEvent(userId, input.object, 'shared', input.actorName ?? 'You', `Shared with ${input.withName}`, input.withName)
  return ok
}

/* ── Delegation — assign to ANY trusted identity ─────────────────────────────────────────────── */
export async function assignTask(input: {
  object: ObjectRef; task: string; assigneeIdentityId: string; assigneeName: string; dueAt?: string | null; actorName?: string
}): Promise<{ id: string | null } & Result> {
  const userId = await uid()
  if (!userId) return { id: null, ...fail('not-signed-in') }
  if (!input.task.trim()) return { id: null, ...fail('no-task') }
  const { data, error } = await supabase.from('collaboration_assignments').insert({
    family_user_id: userId, ...objCols(input.object), task: input.task.trim(),
    assignee_identity_id: input.assigneeIdentityId, due_at: input.dueAt ?? null, assigned_by: userId,
  }).select('id').single()
  if (error || !data) return { id: null, ...fail('could-not-assign') }
  await writeEvent(userId, input.object, 'assigned', input.actorName ?? 'You', `Assigned “${input.task.trim()}” to ${input.assigneeName}`, input.assigneeName)
  return { id: (data as { id: string }).id, ...ok }
}

export async function setAssignmentStatus(id: string, status: AssignmentStatus): Promise<Result> {
  const userId = await uid()
  if (!userId) return fail('not-signed-in')
  const { data, error } = await supabase
    .from('collaboration_assignments')
    .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
    .eq('id', id)
    .select('object_type, object_id, object_label, domain, space, task, assignee_identity_id')
    .single()
  if (error || !data) return fail('could-not-update')
  if (status === 'done') {
    const r = data as AssignmentRow
    const o: ObjectRef = { type: r.object_type as ObjectRef['type'], id: r.object_id, label: r.object_label, domain: r.domain, space: (r.space ?? undefined) as ObjectRef['space'] }
    // Reuse the engine's completion shaping so the summary is the model's, not ad-hoc.
    const { event } = engineComplete({ id, object: o, task: r.task, assignee: { id: r.assignee_identity_id, name: '', role: 'family_member' }, status: 'open', assignedBy: userId, createdAt: r.created_at } as Assignment, new Date().toISOString())
    await writeEvent(userId, o, 'completed', 'You', event.summary)
  }
  return ok
}

export async function fetchAssignments(object?: ObjectRef): Promise<Assignment[]> {
  let q = supabase.from('collaboration_assignments')
    .select('id, object_type, object_id, object_label, domain, space, task, assignee_identity_id, due_at, status, assigned_by, created_at')
    .order('created_at', { ascending: false })
  if (object) q = q.eq('object_type', object.type).eq('object_id', object.id)
  const { data, error } = await q
  if (error || !data) return []
  return (data as unknown as AssignmentRow[]).map((r) => ({
    id: r.id, object: { type: r.object_type as ObjectRef['type'], id: r.object_id, label: r.object_label, domain: r.domain, space: (r.space ?? undefined) as ObjectRef['space'] },
    task: r.task, assignee: { id: r.assignee_identity_id, name: '', role: 'family_member' }, dueAt: r.due_at ?? undefined,
    status: r.status, assignedBy: r.assigned_by, createdAt: r.created_at,
  }))
}

/* ── Threads — an object owns its discussion ─────────────────────────────────────────────────── */
export async function fetchThread(object: ObjectRef): Promise<(ThreadMessage & { authorName: string; role: CollaborationRole | null })[]> {
  const { data, error } = await supabase
    .from('collaboration_threads')
    .select('id, object_type, object_id, author_identity_id, body, created_at, trusted_identities(name, role)')
    .eq('object_type', object.type).eq('object_id', object.id)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as unknown as ThreadRow[]).map((r) => ({
    id: r.id, objectId: r.object_id, body: r.body, at: r.created_at,
    author: { id: r.author_identity_id ?? 'owner', name: r.trusted_identities?.name ?? 'You', role: r.trusted_identities?.role ?? 'owner' },
    authorName: r.trusted_identities?.name ?? 'You', role: r.trusted_identities?.role ?? null,
  }))
}

export async function postToThread(input: { object: ObjectRef; body: string; authorIdentityId?: string; actorName?: string }): Promise<Result> {
  const userId = await uid()
  if (!userId) return fail('not-signed-in')
  if (!input.body.trim()) return fail('empty')
  const { error } = await supabase.from('collaboration_threads').insert({
    family_user_id: userId, object_type: input.object.type, object_id: input.object.id, domain: input.object.domain,
    space: input.object.space ?? null, author_identity_id: input.authorIdentityId ?? null, author_user_id: userId, body: input.body.trim(),
  })
  if (error) return fail('could-not-post')
  await writeEvent(userId, input.object, 'commented', input.actorName ?? 'You', input.body.trim().slice(0, 140))
  return ok
}

/* ── Timeline — the story, per object or across the family ───────────────────────────────────── */
export async function fetchObjectTimeline(object: ObjectRef): Promise<CollaborationEvent[]> {
  const { data, error } = await supabase
    .from('collaboration_events')
    .select('id, object_type, object_id, object_label, domain, space, kind, actor, target_name, summary, created_at')
    .eq('object_type', object.type).eq('object_id', object.id)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as unknown as EventRow[]).map(toEvent)
}

export async function fetchFamilyTimeline(limit = 40): Promise<CollaborationEvent[]> {
  const { data, error } = await supabase
    .from('collaboration_events')
    .select('id, object_type, object_id, object_label, domain, space, kind, actor, target_name, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return (data as unknown as EventRow[]).map(toEvent)
}
