/**
 * Track 2, Step 3 — the understanding pipeline.
 *
 * The canonical order made real (Architecture + Understanding Constitutions):
 *   safety floor (deterministic, ALWAYS first) → comprehend → retrieve → dispose → remember.
 *
 * Every stage is an injected dependency, so the pipeline is pure control-flow — testable with no
 * model and no database, and wired to the real crisis floor / comprehend / Family Graph at the
 * edge (Step 4). Law 4: the safety floor runs first and unconditionally; nothing the model says
 * can suppress it, and a crisis never spends an LLM call.
 */
import type { Understanding } from './comprehension'

/** The deterministic safety floor's verdict. Shape kept minimal; the edge maps the real floor to it. */
export interface SafetyResult {
  message?: string
  ambulanceNumber?: string | null
}

/** What to do with this message. The answer TEXT (grounded in `context`) is composed downstream. */
export type Decision =
  | { lane: 'escalate'; safety: SafetyResult }
  | { lane: 'ask'; understanding: Understanding; question: string }
  | { lane: 'decline'; understanding: Understanding; reason: 'greeting' }
  | { lane: 'care'; understanding: Understanding }
  | { lane: 'answer'; understanding: Understanding; context: unknown }

export interface PipelineDeps {
  /** Deterministic crisis detection on the RAW input. Returns a result to escalate, or null. */
  safetyCheck: (input: string) => SafetyResult | null
  /** The comprehension core (callModel already bound). */
  comprehend: (input: string) => Promise<Understanding>
  /** Retrieve the Family Graph for grounding. Best-effort — a failure degrades, never blocks. */
  retrieve?: (u: Understanding) => Promise<unknown>
  /** Persist the facts the family just stated (append-only). Best-effort. */
  remember?: (u: Understanding) => Promise<void>
}

const DEFAULT_QUESTION = 'Could you tell me a little more about who this is and what’s happening?'
const PRESENCE = /\b(visit|come|someone|presence|help|hand|check on|accompany|be there)\b/i

function needsPresence(u: Understanding): boolean {
  return u.intent === 'request_help' || (u.need !== 'none_stated' && u.need !== 'unknown' && PRESENCE.test(u.need))
}

export async function understand(input: string, deps: PipelineDeps): Promise<Decision> {
  // 1 · SAFETY FLOOR — deterministic, always, first. A crisis returns before any model call.
  const safety = deps.safetyCheck(input)
  if (safety) return { lane: 'escalate', safety }

  // 2 · COMPREHEND
  const u = await deps.comprehend(input)

  // 3 · RETRIEVE the Family Graph (best-effort grounding)
  const context = deps.retrieve ? await deps.retrieve(u).catch(() => null) : null

  // 4 · DISPOSE — deterministic, over the structured understanding.
  let decision: Decision
  if (u.intent === 'greeting') {
    decision = { lane: 'decline', understanding: u, reason: 'greeting' }
  } else if (u.intent === 'unclear' || u.confidence === 'low' || u.clarifying_question) {
    decision = { lane: 'ask', understanding: u, question: u.clarifying_question ?? DEFAULT_QUESTION } // ask, never assume (Law 2)
  } else if (needsPresence(u)) {
    decision = { lane: 'care', understanding: u } // Connect orchestrates; Care fulfils
  } else {
    decision = { lane: 'answer', understanding: u, context } // grounded in what we retrieved (Law 3)
  }

  // 5 · REMEMBER — persist the facts the family shared, on lanes where they told us something.
  if (deps.remember && u.facts.length > 0 && (decision.lane === 'answer' || decision.lane === 'care')) {
    await deps.remember(u).catch(() => {})
  }

  return decision
}
