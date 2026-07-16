/**
 * Trust & decision thresholds — platform-wide (Constitution §2).
 *
 * This module is the canonical home of the Trust Matrix (what fails open vs safe),
 * the single TRUST_THRESHOLD that governs answer / clarify / handoff, and the
 * CONVERSATION_BUDGET that guarantees no family is ever trapped in a loop. The edge
 * functions mirror the fail-mode rule in supabase/functions/_shared/trust.ts — keep
 * the two in sync.
 */

/** Confidence at/above which Connect ANSWERS; below which it CLARIFIES; and, once the
 *  conversation budget is spent, HANDS OFF. One knob, platform-wide. */
export const TRUST_THRESHOLD = 0.6

/** A conversation may clarify at most this many rounds before handing off to a human,
 *  so a family is never trapped in a loop. Exceeding the budget FAILS SAFE — to a
 *  person, never a dead end. */
export const CONVERSATION_BUDGET = 2

/* ── the Trust Matrix, as code ──────────────────────────────────────────────
   Infrastructure failures fail OPEN (availability — a mechanism we added must not
   take the family down). Trust / identity / permission / memory / safety failures
   fail SAFE (never grant, serve, or assert what we cannot verify). */
export type FailMode = 'open' | 'safe'
export type FailureClass = 'infrastructure' | 'identity' | 'permission' | 'memory' | 'safety' | 'trust'

/** The one rule: only infrastructure fails open; everything trust-related fails safe. */
export function failMode(cls: FailureClass): FailMode {
  return cls === 'infrastructure' ? 'open' : 'safe'
}
export const failsOpen = (cls: FailureClass) => failMode(cls) === 'open'
export const failsSafe = (cls: FailureClass) => failMode(cls) === 'safe'

/* ── the one decision: answer | clarify | handoff ── */
export type Step = 'answer' | 'clarify' | 'handoff'

/**
 * The single decision every understanding request makes, governed by the threshold
 * and the conversation budget. Deterministic today (confidence is 1 when a subject is
 * known, low otherwise); the same function serves the future LLM path unchanged.
 */
export function decideStep(confidence: number, clarifyRounds: number): Step {
  if (confidence >= TRUST_THRESHOLD) return 'answer'
  if (clarifyRounds >= CONVERSATION_BUDGET) return 'handoff' // budget spent → fail safe to a human
  return 'clarify'
}
