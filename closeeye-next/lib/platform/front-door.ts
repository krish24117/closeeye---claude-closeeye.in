/**
 * The single owner of "which hosts are the global Connect front door vs the India door."
 *
 * One codebase serves multiple front doors (closeeye.app + connect.closeeye.in = global Connect;
 * closeeye.in = India). Several places need this classification — the routing middleware (what a
 * path means per host) and the sitemap (which pages to list per host). They MUST agree, so the set
 * lives here once and both import it. Never re-hardcode the host list elsewhere.
 */
export const CONNECT_FRONT_DOORS: ReadonlySet<string> = new Set([
  'closeeye.app',
  'www.closeeye.app',
  'connect.closeeye.in',
])

/** True when the request host is a global Connect front door (not the India marketing site). */
export function isConnectHost(host: string | null | undefined): boolean {
  const h = (host ?? '').toLowerCase().split(':')[0] ?? ''
  return CONNECT_FRONT_DOORS.has(h)
}

/**
 * First path segment of India-COMMERCIAL marketing pages that must NOT appear on the global Connect
 * door (they redirect to /connect there). Deliberately a denylist: legal/technical/Connect/app/STAFF
 * routes are absent, so they always pass through. Owned here (not in middleware) so the routing layer
 * and any sitemap/guardrail agree on one source of truth.
 */
export const INDIA_ONLY_SEGMENTS: ReadonlySet<string> = new Set([
  // /pricing, /services, /membership and /book now 308 to /plans (commerce consolidation);
  // 'plans' is the single commerce segment.
  'about', 'plans', 'become-a-guardian', 'become-a-companion',
  'trust-safety', 'contact', 'help', 'feedback',
  // India app onboarding carousel — "Everything starts with care" / Presence Manager. The global
  // door onboards through /connect → /join or /auth.
  'welcome',
])

/**
 * The staff-console segments. These are the SHARED operational backbone (one codebase, brand- and
 * front-door-agnostic) and must be reachable on EVERY front door — closeeye.app included. They are
 * the invariant the guardrail test protects: a staff segment must never land in INDIA_ONLY_SEGMENTS,
 * or Guardian/PM/Admin would silently 307 to /connect on the global door. Integration-first: we
 * surface these consoles on closeeye.app, never fork or rebuild them.
 */
export const STAFF_SEGMENTS: ReadonlySet<string> = new Set(['guardian', 'pm', 'admin'])

export type FrontDoorDecision =
  | { type: 'next' }
  | { type: 'rewrite'; pathname: string }
  | { type: 'redirect'; pathname: string }

/**
 * SINGLE UI (founder 2026-07-23: "no more two UI"). closeeye.in and closeeye.app now serve ONE
 * identical experience, so the front door NO LONGER diverges by host: every path passes through on
 * every host. `/` is the Trusted-Presence home on both; nothing rewrites to /connect and no
 * India-commercial segment is redirected. The exports above (isConnectHost, INDIA_ONLY_SEGMENTS,
 * STAFF_SEGMENTS) are retained for the sitemap, the auth gate, and back-compat.
 *
 * Kept as a pure, unit-tested function (rather than deleted) so the "one experience everywhere"
 * contract is frozen by a test and any future re-introduction of a host split is a deliberate,
 * reviewed change here — never an accident scattered across the middleware.
 */
export function frontDoorRouting(_host: string | null | undefined, _pathname: string): FrontDoorDecision {
  return { type: 'next' }
}
