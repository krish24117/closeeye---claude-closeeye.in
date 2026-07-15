/**
 * Close Eye Connect — phased rollout switch.
 *
 * Phase 1 (now): experience → understanding → sign-in → Family Space. No visit
 * selection, no payment, no prices.
 *
 * Phase 2 (15 August): visit selection + Razorpay payment + booking, exactly as
 * designed. It is BUILT now but stays dark behind this one flag — flip
 * NEXT_PUBLIC_PHASE_2_ENABLED=true in the environment on launch day and redeploy;
 * no code change.
 *
 * `NEXT_PUBLIC_` so the same value is readable on both server and client.
 */
export const PHASE_2_ENABLED: boolean =
  (process.env.NEXT_PUBLIC_PHASE_2_ENABLED || '').toLowerCase() === 'true'

/** The date visits open, shown in the gentle "not yet" state while Phase 2 is dark. */
export const VISITS_OPEN_LABEL = '15 August'
