/**
 * Decision Policy — the gate between a NextAction and its EXECUTION.
 *
 * A NextAction says WHAT we'd do; the Decision Policy decides whether we MAY do it,
 * by evaluating business rules the reasoning engine must not decide on its own:
 * capability availability, city support, membership, consent, provider availability,
 * operational readiness.
 *
 * Decision failures fail GRACEFULLY (Constitution §2, trust → fail safe):
 *   • Never invent — a rule that can't confirm "yes" does not pass.
 *   • Never silently fail — every outcome carries an honest reason.
 *   • A rule that throws → DENY with a routed-to-a-person reason (never a silent allow).
 *
 * This is an inert contract today (nothing on the live path evaluates it yet); the
 * Care/booking flows and the future Domain Router will consume it in later milestones.
 */
import type { NextAction } from './next-action'

export type DecisionOutcome = 'allow' | 'deny' | 'degrade'
export interface Decision {
  outcome: DecisionOutcome
  reason: string       // honest, user-safe explanation — never a raw error
  rule?: string        // which rule decided (audit)
}

export interface DecisionContext {
  capability?: string
  city?: string | null
  membership?: 'none' | 'connect' | 'care'
  membershipActive?: boolean
  consented?: boolean
  providerAvailable?: boolean
  operationalReady?: boolean
}

export type DecisionRule = (action: NextAction, ctx: DecisionContext) => Decision

/**
 * Evaluate rules in order; the first non-allow decision wins. Any rule that throws is
 * caught and turned into a DENY with an honest reason — never a silent pass, never a
 * fabricated allow.
 */
export function evaluateDecision(action: NextAction, ctx: DecisionContext, rules: DecisionRule[]): Decision {
  for (const rule of rules) {
    let d: Decision
    try {
      d = rule(action, ctx)
    } catch {
      return { outcome: 'deny', reason: 'A readiness check couldn’t complete — a real person will take it from here.', rule: rule.name || 'unknown' }
    }
    if (d.outcome !== 'allow') return d
  }
  return { outcome: 'allow', reason: 'All checks passed.' }
}

/* ── the standard business rules (pure; wired to real flags in later milestones) ── */

/** The capability the action needs must actually be live. */
export const capabilityAvailable = (isLive: boolean): DecisionRule => () =>
  isLive ? { outcome: 'allow', reason: 'capability live', rule: 'capabilityAvailable' }
    : { outcome: 'degrade', reason: 'That isn’t available yet — but a real person can help right now.', rule: 'capabilityAvailable' }

/** We must be on the ground in the family's city. */
export const citySupported = (supported: (c?: string | null) => boolean): DecisionRule => (_a, ctx) =>
  supported(ctx.city) ? { outcome: 'allow', reason: 'city supported', rule: 'citySupported' }
    : { outcome: 'degrade', reason: 'We’re not on the ground there yet — we can still help, just not in person.', rule: 'citySupported' }

/** A live plan is required (e.g. an included Care visit) — never assumed. */
export const membershipRequired: DecisionRule = (_a, ctx) =>
  ctx.membershipActive ? { outcome: 'allow', reason: 'membership active', rule: 'membershipRequired' }
    : { outcome: 'deny', reason: 'This needs an active plan — complete payment to continue.', rule: 'membershipRequired' }

/** Consent must be explicit for sensitive actions. */
export const consentRequired: DecisionRule = (_a, ctx) =>
  ctx.consented === true ? { outcome: 'allow', reason: 'consented', rule: 'consentRequired' }
    : { outcome: 'deny', reason: 'We need your ok before going ahead.', rule: 'consentRequired' }

/** A trusted person / Guardian must be available. */
export const providerAvailable: DecisionRule = (_a, ctx) =>
  ctx.providerAvailable !== false ? { outcome: 'allow', reason: 'provider available', rule: 'providerAvailable' }
    : { outcome: 'degrade', reason: 'No one’s free for this right now — your Presence Manager will arrange it.', rule: 'providerAvailable' }

/** The operation itself must be ready to run. */
export const operationalReady: DecisionRule = (_a, ctx) =>
  ctx.operationalReady !== false ? { outcome: 'allow', reason: 'ready', rule: 'operationalReady' }
    : { outcome: 'degrade', reason: 'We’re getting this ready — a person will follow up.', rule: 'operationalReady' }
