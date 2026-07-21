/**
 * The Action Orchestrator — the bridge from understanding → decision → action.
 *
 * After the pipeline has understood an asset, this decides what MEANINGFUL next moves are available and
 * returns them as structured, explainable proposals for the Response Composer. It NEVER executes: it
 * only surfaces opportunities. An action is `autoExecutable` only when the family's policy explicitly
 * pre-authorised that kind; otherwise it needs confirmation. Sharing is proposed only where policy
 * permits it. Provider-independent and deterministic — the platform, not a model, decides what CloseEye
 * can offer to do.
 */
import type { ActionKind, ActionProposal, ConfirmationRequest, PipelineResult } from './types'
import type { FamilyPolicy } from './policy'

export interface ActionContext {
  policy: FamilyPolicy
  /** Is a real-world Trusted Presence visit available for this family/region? */
  careAvailable?: boolean
}

export interface ActionOrchestrator {
  readonly name: string
  propose(result: PipelineResult, ctx: ActionContext): ActionProposal[]
}

const statementOf = (p: ConfirmationRequest): string => ('statement' in p.candidate ? p.candidate.statement : p.prompt)

export function proposeActions(result: PipelineResult, ctx: ActionContext): ActionProposal[] {
  const { context, policy: pol, verified, pending, understanding } = result
  const subject = context.subject
  const auto = (k: ActionKind): boolean => ctx.policy.autoActions?.includes(k) ?? false
  const base = (kind: ActionKind, label: string, rationale: string, payload?: Record<string, string>): ActionProposal =>
    ({ kind, label, rationale, domain: pol.domain, subject, requiresConfirmation: true, autoExecutable: auto(kind), payload })

  const out: ActionProposal[] = []

  // Save to memory — anything the family still needs to confirm.
  pending.filter((p) => p.id.startsWith('memory')).forEach((p) =>
    out.push(base('save_memory', `Remember: ${statementOf(p)}`, 'proposed from this upload, awaiting your confirmation')))

  // Set a reminder — events flagged for one (renewals/expiries), or an explicit "remind" intent.
  verified.events.filter((e) => e.forReminder).forEach((e) =>
    out.push(base('set_reminder', `Set a reminder — ${e.title}`, `a ${e.kind.replace(/_/g, ' ')} dated ${e.at}`, { at: e.at, title: e.title })))
  if (context.intent.kind === 'remind' && !verified.events.some((e) => e.forReminder))
    out.push(base('set_reminder', 'Set a reminder', 'you asked to be reminded'))

  // Share — ONLY where the family's policy permits it for this domain.
  if (pol.sharing !== 'private')
    out.push(base('share', `Share with ${pol.sharing === 'guardians' ? 'your Guardian' : 'your family'}`, `this domain is shared with ${pol.sharing}`))

  // Request missing information — an unresolved subject or an open clarification.
  const ask = context.clarifications[0]?.question ?? (pending.some((p) => p.id === 'subject') ? 'Who is this about?' : null)
  if (ask) out.push({ kind: 'request_information', label: ask, rationale: 'a detail is missing to file this correctly', domain: pol.domain, subject, requiresConfirmation: false, autoExecutable: false })

  // Book a Trusted Presence service — health / care contexts, where Care is available.
  if (ctx.careAvailable && (pol.domain === 'trusted_presence' || pol.domain === 'health'))
    out.push({ ...base('book_trusted_presence', `Bring a trusted person to ${subject.displayName}`, 'a real-world visit could help here'), autoExecutable: false })

  // Compare with existing knowledge — durable facts that may update what we already know.
  if (verified.memories.some((m) => m.memoryType === 'medical' || m.memoryType === 'identity'))
    out.push({ kind: 'compare_knowledge', label: 'Compare with what I already know', rationale: 'this may update an earlier record', domain: pol.domain, subject, requiresConfirmation: false, autoExecutable: false })

  // Create a task — actionable events (a doctor visit, an appointment).
  verified.events.filter((e) => e.kind === 'doctor_visit' || e.kind === 'appointment').forEach((e) =>
    out.push(base('create_task', `Create a task — ${e.title}`, 'this needs a follow-up', { title: e.title, at: e.at })))

  // Mark as complete — a visit summary closes out a visit.
  if (understanding.assetType === 'visit_summary')
    out.push(base('mark_complete', 'Mark this visit complete', 'a visit summary was filed'))

  // Invite a collaborator — shared or business spaces.
  if (context.space.value === 'business' || context.space.value === 'shared')
    out.push(base('invite_collaborator', 'Invite a collaborator', `this is in your ${context.space.value} space`))

  return out
}

export const defaultActionOrchestrator: ActionOrchestrator = { name: 'default', propose: proposeActions }
