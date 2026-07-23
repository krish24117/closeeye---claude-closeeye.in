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
  'about', 'book', 'membership', 'services', 'become-a-guardian', 'become-a-companion',
  'trust-safety', 'contact', 'help', 'feedback',
  // NRI trusted-presence landing — an India-fulfilment surface. Keep it off the global Connect
  // door (redirects to /connect there); it lives only on closeeye.in.
  'nri',
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
 * The pure host×path front-door decision — the single brain the routing middleware runs. Extracted
 * so it is unit-testable in isolation (NextRequest-free) and so the staff-passthrough invariant can
 * be frozen by a contract test. Behaviour: on a Connect host, `/` rewrites to /connect and
 * India-commercial segments redirect to /connect; everything else — Connect pages, the app (/space,
 * /auth, /join), legal/technical pages, and the STAFF consoles — passes through. On the India door,
 * nothing is rewritten.
 */
export function frontDoorRouting(host: string | null | undefined, pathname: string): FrontDoorDecision {
  if (!isConnectHost(host)) return { type: 'next' }
  if (pathname === '/') return { type: 'rewrite', pathname: '/connect' }
  const seg = pathname.split('/')[1] ?? ''
  if (INDIA_ONLY_SEGMENTS.has(seg)) return { type: 'redirect', pathname: '/connect' }
  return { type: 'next' }
}
