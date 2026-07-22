/**
 * Track 2, Step 1 — the Understanding contract + its deterministic guardrail.
 *
 * Implements the Understanding Constitution (docs/understanding_constitution.md): the CLOSED
 * structure comprehension returns, and the checks that run over ANY understanding so a
 * fabrication can't pass through. "unknown" is a first-class value everywhere. No model here yet
 * — this is the target the comprehension core (Step 2) must hit, and the net its output is
 * filtered through in production.
 *
 * Two layers of enforcement, together:
 *   1. validateUnderstanding() — a deterministic net over structure + provenance (this file).
 *   2. the regression EVAL over pinned cases (comprehension.cases.ts) — catches semantic errors a
 *      net can't see (a city named as a person). Both run; the Constitution needs both.
 */

export const UNKNOWN = 'unknown' as const
export const NONE_STATED = 'none_stated' as const

export type Intent = 'share' | 'ask' | 'request_help' | 'greeting' | 'unclear'
export type Confidence = 'high' | 'low'

/** A fact — ONLY the family's actual words (Constitution Law 6). */
export interface StatedFact {
  label: string
  value: string
  provenance: 'stated'
}

export interface Understanding {
  intent: Intent
  subject: {
    /** A PERSON ('my mother', 'Amma', 'self') or 'unknown'. NEVER a place or a thing. */
    who: string
    relationship: string // 'mother' | 'father' | … | 'unknown'
  }
  /** What is happening — 'travelling', 'unwell', 'moving' — or 'unknown'. */
  situation: string
  /** A request the user made, or 'none_stated' (default — never invented), or 'unknown'. */
  need: string
  /** Travel and residence, kept distinct. "travelling from X to Y" ≠ "lives in X". */
  locations: { from?: string; to?: string; lives_in?: string }
  facts: StatedFact[]
  confidence: Confidence
  /** When unsure, the one question to ask. Required when confidence is low / intent unclear. */
  clarifying_question: string | null
  /**
   * One sentence of warm, GENERAL guidance ("what tends to help"), or null. It is Close Eye's
   * counsel — NOT a claim about the family: it may never assert a fact the family didn't state,
   * and it exists only when the subject is understood (see the validator). Payoff on the public
   * first screen, per the founder's ratified decision.
   */
  reflection: string | null
  /** A soft model hint only. The deterministic crisis floor is authoritative (Law 4). */
  safety_signal: boolean
}

export interface Violation { law: string; detail: string }

const norm = (s: string) => s.trim().toLowerCase()

/**
 * The deterministic net over an Understanding. Catches the structural + provenance failures that
 * must never ship, whichever model produced it. A malformed or violating understanding is treated
 * as "unclear → ask" (Law 2) — never guessed at.
 */
export function validateUnderstanding(u: Understanding, rawInput: string): Violation[] {
  const v: Violation[] = []
  const input = norm(rawInput)
  const who = norm(u.subject.who)
  const locs = [u.locations.from, u.locations.to, u.locations.lives_in].filter(Boolean).map((s) => norm(s!))

  // Law 1 — a person is not a place: subject.who may not be one of the locations.
  if (who && who !== UNKNOWN && who !== 'self' && locs.includes(who)) {
    v.push({ law: 'L1', detail: `subject.who "${u.subject.who}" is a location, not a person` })
  }

  // Law 2 — unsure ⇒ ask. Low confidence / unclear / unknown subject on a real turn must carry a question.
  const unsure = u.confidence === 'low' || u.intent === 'unclear' || (u.subject.who === UNKNOWN && (u.intent === 'share' || u.intent === 'ask'))
  if (unsure && !u.clarifying_question) {
    v.push({ law: 'L2', detail: 'unsure, but no clarifying_question — Close Eye must ask, never assert' })
  }

  // Law 2 — don't reflect on what you don't understand. A reflection (Close Eye's guidance) is only
  // permitted when the subject is a known person AND confidence is high — never over an unclear turn.
  if (u.reflection && (u.confidence !== 'high' || u.subject.who === UNKNOWN || u.subject.who === '')) {
    v.push({ law: 'L2', detail: 'reflection present without a confident, known subject — understand first' })
  }

  // Law 2 / 6 — a "stated" fact must trace to the family's actual words (no value invented from nothing).
  for (const f of u.facts) {
    if (f.provenance !== 'stated') { v.push({ law: 'L6', detail: `fact "${f.label}" carries non-stated provenance in the stated list` }); continue }
    if (f.value && !input.includes(norm(f.value))) {
      v.push({ law: 'L2', detail: `stated fact "${f.label}: ${f.value}" is not in the user's words — fabrication` })
    }
  }

  // Shape — closed enums.
  if (!(['high', 'low'] as string[]).includes(u.confidence)) v.push({ law: 'shape', detail: `invalid confidence "${u.confidence}"` })
  if (!(['share', 'ask', 'request_help', 'greeting', 'unclear'] as string[]).includes(u.intent)) v.push({ law: 'shape', detail: `invalid intent "${u.intent}"` })

  return v
}

export const isValidUnderstanding = (u: Understanding, rawInput: string): boolean =>
  validateUnderstanding(u, rawInput).length === 0
