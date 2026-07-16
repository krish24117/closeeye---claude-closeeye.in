/**
 * CloseEye — the Engineering Constitution.
 *
 * Three immutable principles. Every service, every review, every extension obeys
 * them. They are the engineering counterpart to the product Constitution and are
 * intentionally short enough to hold in your head.
 *
 *   1. The database remembers. The LLM reasons.
 *        Supabase is the single source of truth. The model reasons ONLY over
 *        retrieved context and is never the memory. (see lib/db, family_ledger)
 *
 *   2. Infrastructure failures fail open. Trust failures fail safe.
 *        If a mechanism we added breaks, it must not take the family down with it;
 *        but we never grant, serve, or assert what we cannot verify. (see ./trust)
 *
 *   3. Every request ends with one structured NextAction.
 *        Deterministic or LLM-reasoned, a request resolves to exactly one honest,
 *        structured result — never loose prose that can't drive the product.
 *        (see ./next-action)
 */
export const ENGINEERING_CONSTITUTION = [
  'The database remembers. The LLM reasons.',
  'Infrastructure failures fail open. Trust failures fail safe.',
  'Every request ends with one structured NextAction.',
] as const

export type EngineeringPrinciple = (typeof ENGINEERING_CONSTITUTION)[number]
