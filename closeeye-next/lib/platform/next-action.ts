/**
 * NextAction — the single structured result of every request (Constitution §3).
 *
 * Whether an answer comes from the deterministic engine or (later) LLM reasoning over
 * retrieved context, every request resolves to exactly ONE NextAction. It carries the
 * honest answer, at most one clarifying question, structured next steps the UI renders
 * generically, a confidence score (governs answer/clarify/handoff via TRUST_THRESHOLD),
 * and whether a human is needed. Prose alone cannot drive a platform; this can.
 */
export type ActionKind =
  | 'answer'    // we can help now, from what we understand
  | 'clarify'   // we need one more thing before we can help
  | 'handoff'   // a real person is the right answer now
  | 'execute'   // perform/offer a concrete capability (book, upload, …)
  | 'escalate'  // a safety event — route immediately (e.g. emergency)

/** A concrete next step the UI renders generically (button, link, dial). */
export interface ActionOffer {
  id: string
  label: string
  kind: 'book' | 'upload' | 'call' | 'whatsapp' | 'create_space' | 'pay' | 'link'
  href?: string
}

export interface NextAction {
  kind: ActionKind
  answer?: string          // grounded response — NEVER fabricated (Constitution §1)
  question?: string        // when kind === 'clarify' — the single thing we still need
  offers?: ActionOffer[]   // structured next steps
  confidence: number       // 0..1 — see TRUST_THRESHOLD
  needsHuman: boolean       // true → a real person (handoff / escalate)
  reason?: string          // why this action — for audit; never shown raw
}

/** A safe, honest default — used when a builder can't produce a real action. */
export const HANDOFF_ACTION: NextAction = {
  kind: 'handoff',
  answer: 'Let me get you to a real person who can help.',
  confidence: 0,
  needsHuman: true,
  reason: 'no confident action available',
}
