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

/**
 * Relationship equivalence — a spoken reference ("my mother", "amma") resolves to the person in the
 * Family Graph even when their stored relationship is worded differently ("Parent", "Mother", "Mom").
 * General by construction: groups of synonyms, never a one-off per phrase. (Understanding law: the
 * graph is the truth; this only bridges how a family SAYS a relationship to how it's STORED.)
 */
// Everyday words for each SPECIFIC relationship. Expansion is DIRECTIONAL: a specific term also
// carries its generic BRIDGE (mother → parent, son → child), but a bridge word ("parent") never
// expands back DOWN to specifics — so "my mother" can never be mistaken for a stored "Father".
const SYNONYMS: string[][] = [
  ['mother', 'mom', 'mum', 'mummy', 'amma', 'ma', 'mama', 'mataji'],
  ['father', 'dad', 'daddy', 'papa', 'appa', 'baba', 'pitaji'],
  ['spouse', 'wife', 'husband', 'partner'],
  ['son', 'boy'],
  ['daughter', 'girl'],
  ['child', 'children', 'kid', 'baby'],
  ['grandmother', 'grandma', 'granny', 'nani', 'dadi'],
  ['grandfather', 'grandpa', 'grandad', 'nana', 'dada'],
  ['brother'],
  ['sister'],
]
const BRIDGE_OF: Record<string, string> = {
  mother: 'parent', father: 'parent', son: 'child', daughter: 'child',
  grandmother: 'grandparent', grandfather: 'grandparent', brother: 'sibling', sister: 'sibling',
}

function relTokens(term: string): Set<string> {
  const t = (term || '').trim().toLowerCase().replace(/^(my|our|the|your)\s+/i, '').trim()
  const out = new Set<string>()
  if (!t) return out
  out.add(t)
  for (const g of SYNONYMS) {
    if (!g.includes(t)) continue
    g.forEach((x) => out.add(x))
    const bridge = BRIDGE_OF[g[0]!]
    if (bridge) out.add(bridge) // specific → its generic bridge only (never the reverse)
  }
  if (t === 'parents') out.add('parent')
  if (t === 'children') out.add('child')
  return out
}

/** Tokens two relationship words share (e.g. "father" & "Dad" → {father,dad,…}). */
function sharedRelTokens(spoken: string, graphRel: string): Set<string> {
  const a = relTokens(spoken)
  const b = relTokens(graphRel)
  const out = new Set<string>()
  for (const x of a) if (b.has(x)) out.add(x)
  return out
}

/** True when a spoken relationship and a stored relationship refer to the same kind of person. */
function relatesTo(spoken: string, graphRel: string): boolean {
  return sharedRelTokens(spoken, graphRel).size > 0
}

/** Generic bridge tokens — they connect a broad word to a specific one ("parent" ↔ "father"), but a
 *  match on ONLY a bridge is weak: "my father" sharing just `parent` with a stored "Parent" should
 *  lose to a stored "Father". A match on any non-bridge token is a strong, specific match. */
const BRIDGE_TOKENS = new Set(['parent', 'parents', 'child', 'children', 'kid', 'baby', 'sibling', 'grandparent'])

/** Resolve the understood subject to one of the family's loved ones. Reliable resolution is what
 *  keeps Connect from feeling like a chatbot that forgot who your family is (Memory Integrity P2).
 *  Exported for regression tests — the resolution matrix (mother/father/spouse/child) is validated
 *  deterministically, without a live model call. */
export function resolveSubject(u: Understanding | null, lovedOnes: LovedOneRef[]): LovedOneRef | null {
  if (lovedOnes.length === 0) return null
  const who = (u?.subject?.who ?? '').trim().toLowerCase()
  const rel = (u?.subject?.relationship ?? '').trim().toLowerCase()
  const whoRel = who.replace(/^(my|our|the|your)\s+/i, '').trim() // "my mother" → "mother"

  // 1) Name the family used — a real name ("Amma", "Lakshmi") in the question.
  for (const lo of lovedOnes) {
    const full = (lo.full_name ?? '').toLowerCase()
    if (full.length > 2 && who && (who.includes(full) || (whoRel.length > 3 && full.includes(whoRel)))) return lo
  }
  // 2) SPECIFIC relationship — share a token that isn't a generic bridge, so "my father" resolves to
  //    the stored "Father", not a generic "Parent", when both are in the family.
  for (const lo of lovedOnes) {
    const r = lo.relationship ?? ''
    if (!r) continue
    const shared = new Set<string>([...sharedRelTokens(rel, r), ...sharedRelTokens(whoRel, r)])
    for (const t of shared) if (!BRIDGE_TOKENS.has(t)) return lo
  }
  // 3) BROAD relationship — bridge only to a GENERIC stored relationship ("Parent", "Child"), so
  //    "my mother" resolves to a stored "Parent" but NEVER to a specific opposite like "Father".
  for (const lo of lovedOnes) {
    const r = (lo.relationship ?? '').trim().toLowerCase().replace(/^(my|our|the|your)\s+/i, '').trim()
    if (r && BRIDGE_TOKENS.has(r) && (relTokens(rel).has(r) || relTokens(whoRel).has(r))) return lo
  }
  // 4) One-person family + a question about a person → it's them. Removes "who do you mean?"
  //    friction for the overwhelmingly common single-loved-one case.
  if (lovedOnes.length === 1 && (who || rel)) return lovedOnes[0]!
  return null
}

/**
 * A leading, invisible context turn so Connect grounds on the Family Graph AND never denies memory.
 * When facts exist it answers from them; when they don't, it still KNOWS who the person is and frames
 * the gap as "still learning" — never "I forget / start fresh" (Memory Integrity P1 + P3). This steers
 * the model even before the edge system-prompt is redeployed; the prompt makes it constitutional.
 */
function buildGroundingTurn(ctx: RetrievedContext | null, ref: LovedOneRef | null): AskTurn | null {
  const name = ctx?.subject?.name || ref?.full_name || null
  if (!name) return null
  const rel = ctx?.subject?.relationship || ref?.relationship || null
  const city = ctx?.subject?.city || null
  const who = `${name}${rel ? `, the family's ${rel.toLowerCase()}` : ''}${city ? `, in ${city}` : ''}`
  const facts = ctx ? [...ctx.stated, ...ctx.observed].slice(0, 14) : []
  const known = facts.length
    ? `What this family has already told you about ${name}:\n` + facts.map((f) => `- ${f.label ? `${f.label}: ` : ''}${f.body}`).join('\n')
    : `This family has just added ${name}, so you don't have details about them yet — but you know who they are, and you keep everything they tell you from now on.`
  return {
    role: 'user',
    content:
      `[Context for you, Close Eye — do not quote this back]\n` +
      `You are speaking about ${who}. You hold a private, lasting memory of this family and remember across conversations.\n` +
      `${known}\n` +
      `Answer from this and general guidance only; never invent details. If something isn't recorded yet, say you're still ` +
      `learning about ${name} and invite one thing worth remembering — never say you forget, reset, or start fresh, and never ` +
      `ask them to repeat what they've already shared.`,
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
  const groundingTurn = buildGroundingTurn(ground, subject)
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
