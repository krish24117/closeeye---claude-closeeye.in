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
import { UNKNOWN, type Understanding } from './comprehension'

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
  | { lane: 'medical'; understanding: Understanding } // asked for medical advice — honestly decline, offer a person + a doctor
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

/**
 * Deterministic detection of a request for MEDICAL ADVICE — a dose, a symptom interpretation, a
 * clinical reading, whether to take/stop a medication. Close Eye is not a medical AI (a founding
 * non-goal), so these get an honest "we don't give medical advice → a doctor, and a trusted person"
 * response rather than a guess. Deterministic on purpose (safety decides deterministically): it is
 * tuned to UNDER-detect — a miss is safe (the answer lane never composes advice anyway); a false
 * positive (declining a non-medical message) is the thing to avoid, so every pattern is specific.
 * Urgent medical ("chest pain") is already caught earlier by the crisis floor and never reaches here.
 */
const MEDICAL_ADVICE: RegExp[] = [
  /\b(what|which|how much|how many)\b[^.?!]*\b(medicine|medication|dose|doses|dosage|tablet|tablets|pill|pills|drug|drugs|mg|ml|insulin|antibiotic|antibiotics)\b/i,
  /\b(dose|dosage)\s+(of|for)\b/i,
  /\bshould\s+(he|she|they|we|i|him|her|my\s+\w+)\b[^.?!]*\b(take|taking|stop|stops|stopping|start|starting|continue|switch)\b[^.?!]*\b(medicine|medication|tablet|tablets|pill|pills|dose|drug|drugs|treatment|insulin|dosage)\b/i,
  /\bwhat\s+(could\s+it\s+be|is\s+causing|might\s+(it|this|that)\s+be)\b/i,
  /\bis\s+[^.?!]*\b(blood\s*sugar|blood\s*pressure|bp|sugar\s+level|pulse|heart\s*rate|temperature|fever|reading|readings|level|levels|count|cholesterol)\b[^.?!]*\b(dangerous|normal|serious|high|low|too\s+high|too\s+low|bad|okay|ok|concerning)\b/i,
  /\b(what\s+does|what's|what\s+do)\b[^.?!]*\b(test|report|reports|result|results|reading|scan|x-?ray|mri|blood\s*work|lab)\b[^.?!]*\bmean\b/i,
  /\b(diagnos|prescrib|prescription|symptoms\s+of|treatment\s+for|cure\s+for|remedy\s+for)\b/i,
]
function medicalAdviceSought(input: string): boolean {
  return MEDICAL_ADVICE.some((re) => re.test(input))
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
  const subjectKnown = u.subject.who !== UNKNOWN && u.subject.who.trim() !== ''
  let decision: Decision
  if (u.intent === 'greeting') {
    decision = { lane: 'decline', understanding: u, reason: 'greeting' }
  } else if (medicalAdviceSought(input)) {
    // Asked for medical advice — honestly decline (a doctor is right), offer a trusted person. Not
    // a crisis (that returned above); not an answer we should compose. Close Eye is not a medical AI.
    decision = { lane: 'medical', understanding: u }
  } else if (subjectKnown && needsPresence(u)) {
    // A clear presence request for a KNOWN person is actionable — route to Care, not another
    // question, even if the model hedged confidence. Connect orchestrates; Care fulfils. (Ambiguous
    // requests with no subject still fall through to "ask" below — we never arrange for no-one.)
    decision = { lane: 'care', understanding: u }
  } else if (u.intent === 'unclear' || u.confidence === 'low' || u.clarifying_question) {
    decision = { lane: 'ask', understanding: u, question: u.clarifying_question ?? DEFAULT_QUESTION } // ask, never assume (Law 2)
  } else {
    decision = { lane: 'answer', understanding: u, context } // grounded in what we retrieved (Law 3)
  }

  // 5 · REMEMBER — persist the facts the family shared, on lanes where they told us something.
  if (deps.remember && u.facts.length > 0 && (decision.lane === 'answer' || decision.lane === 'care')) {
    await deps.remember(u).catch(() => {})
  }

  return decision
}
