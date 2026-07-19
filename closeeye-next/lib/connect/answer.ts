import { supabase } from '@/lib/supabase'
import { requestUnderstanding } from '@/lib/connect/understand-client'
import { retrieve, type RetrievedContext } from '@/lib/db/retrieve'
import { askCloseEye, type AskTurn } from '@/lib/db/ask'
import type { Understanding } from '@/lib/connect/comprehension'

/**
 * The Connect answer orchestrator — CloseEye's promise made real: Understand → Reason → Answer.
 *
 * It COMPOSES existing, proven modules — it rewrites none of them:
 *   1. Understand  — requestUnderstanding() (the deterministic understanding engine + safety floor).
 *   2. Ground      — retrieve() reads the Family Graph (family_ledger, RLS-scoped) for the subject.
 *   3. Answer      — askCloseEye() → the ask-health edge function (Claude answer + its own patient
 *                    grounding + crisis detection + care-team alert + disclaimer). The retrieved
 *                    family context is passed through `messages`, so the edge function needs no
 *                    change and the answer is grounded in the family's OWN words.
 *   4. Crisis      — surfaces the existing escalation flow immediately; never bypassed.
 *
 * The caller renders the understanding briefly, then the answer (Decision 1: understanding stays
 * visible; it must never be a dead end).
 */
export interface LovedOneRef {
  id: string
  full_name: string
  relationship: string | null
}

export type ConnectKind = 'answer' | 'escalate' | 'clarify' | 'decline' | 'medical' | 'pending' | 'error'

export interface ConnectResult {
  understanding: Understanding | null
  kind: ConnectKind
  text: string | null
  ambulanceNumber?: string | null
  lovedOneId?: string | null
  subjectLabel?: string | null
  queryId?: string | null
  notice?: string | null
}

/** Best-effort match of the understood subject to one of the family's loved ones (for grounding). */
function resolveSubject(u: Understanding | null, lovedOnes: LovedOneRef[]): LovedOneRef | null {
  const who = (u?.subject?.who ?? '').trim().toLowerCase()
  const rel = (u?.subject?.relationship ?? '').trim().toLowerCase()
  if (!who && !rel) return null
  for (const lo of lovedOnes) {
    const full = (lo.full_name ?? '').toLowerCase()
    const r = (lo.relationship ?? '').toLowerCase()
    if (r && (rel === r || who.includes(r))) return lo
    if (full && (who.includes(full) || (full.length > 2 && full.includes(who)))) return lo
  }
  return null
}

/** A leading, invisible context turn so Claude grounds on the family's own facts (never invents). */
function buildGroundingTurn(ctx: RetrievedContext | null): AskTurn | null {
  if (!ctx || !ctx.subject) return null
  const facts = [...ctx.stated, ...ctx.observed].slice(0, 14)
  const name = ctx.subject.name || 'this person'
  const who = `${name}${ctx.subject.relationship ? ` (${ctx.subject.relationship})` : ''}${ctx.subject.city ? `, in ${ctx.subject.city}` : ''}`
  const lines = facts.length ? facts.map((f) => `- ${f.label ? `${f.label}: ` : ''}${f.body}`).join('\n') : '(no specific notes recorded yet)'
  return {
    role: 'user',
    content: `Context from this family's own records about ${who}:\n${lines}\n\nGround your answer in this context and general guidance only. Do not invent details that aren't here.`,
  }
}

/** Run one Connect turn. `priorTurns` are the visible thread's turns (for a natural follow-up).
 *  `askThreadId` is ask-health's OWN first-turn query id — present ⇒ ask-health treats this as a
 *  follow-up (its server-side grounding + cap + persistence run only on the true first turn). It is
 *  distinct from the durable `conversations` row the UI persists. */
export async function answerFamilyQuestion(input: {
  question: string
  lovedOnes: LovedOneRef[]
  askThreadId?: string | null
  subjectId?: string | null
  priorTurns?: AskTurn[]
}): Promise<ConnectResult> {
  const { question } = input

  // FOLLOW-UP — the subject + context are already established (the first turn showed the
  // understanding). Continue via ask-health, which owns multi-turn context AND its own crisis
  // detection, so safety is preserved without a fresh understanding beat.
  if (input.askThreadId) {
    const ask = await askCloseEye({ question, lovedOneId: input.subjectId ?? null, conversationId: input.askThreadId, priorTurns: input.priorTurns })
    return finalize(ask, null, input.subjectId ?? null)
  }

  // FIRST TURN · UNDERSTAND — for the visible trust beat, the deterministic safety floor, and the
  // subject (who the question is about, for grounding).
  const decision = await requestUnderstanding(question)
  const understanding = 'understanding' in decision ? decision.understanding : null

  // CRISIS — interrupt immediately; route through ask-health so the care team is alerted and we use
  // the authoritative escalation. The tested flow, never a copy.
  if (decision.lane === 'escalate') {
    const ask = await askCloseEye({ question, priorTurns: input.priorTurns })
    return {
      understanding: null,
      kind: 'escalate',
      text: ask.kind === 'escalate' ? ask.text : decision.safety.message ?? null,
      ambulanceNumber: ask.kind === 'escalate' ? ask.ambulanceNumber : decision.safety.ambulanceNumber ?? null,
      queryId: ask.queryId,
    }
  }

  // Otherwise ALWAYS produce a grounded answer. ask-health composes it and runs its own
  // out-of-scope / medical / prompt-injection / crisis-backstop guards, so a general wellbeing
  // question ("how is my father?") is answered — not left on a clarify dead-end. The understanding
  // beat is shown by the caller (Decision 1). GROUND on the Family Graph first (Decision 3).
  const subject = resolveSubject(understanding, input.lovedOnes)
  let ground: RetrievedContext | null = null
  try { ground = await retrieve(supabase, subject?.id ?? null) } catch { ground = null }
  const groundingTurn = buildGroundingTurn(ground)
  const ask = await askCloseEye({
    question,
    subjectLabel: understanding?.subject?.who ?? subject?.full_name ?? null,
    lovedOneId: subject?.id ?? null,
    priorTurns: [...(groundingTurn ? [groundingTurn] : []), ...(input.priorTurns ?? [])],
  })
  return finalize(ask, understanding, subject?.id ?? null)
}

function finalize(ask: Awaited<ReturnType<typeof askCloseEye>>, understanding: Understanding | null, subjectId: string | null): ConnectResult {
  if (ask.kind === 'escalate') {
    return { understanding, kind: 'escalate', text: ask.text, ambulanceNumber: ask.ambulanceNumber, queryId: ask.queryId }
  }
  const kind: ConnectKind = ask.kind === 'answer' ? 'answer' : ask.kind === 'capped' ? 'error' : ask.kind
  return { understanding, kind, text: ask.text, lovedOneId: subjectId, queryId: ask.queryId, notice: ask.notice ?? null }
}
