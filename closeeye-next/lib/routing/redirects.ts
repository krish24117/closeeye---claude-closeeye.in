/**
 * Phase 0 — the single source of truth for legacy → canonical redirects during the Workspace
 * home consolidation (docs/space_home_consolidation_plan.md, docs/navigation_constitution.md).
 *
 * next.config.ts spreads WORKSPACE_REDIRECTS into redirects(); the deep-link guardrail
 * (redirects.test.ts) asserts every legacy path resolves against page-existence OR an entry
 * here — Navigation Law 5: every deep link resolves to a canonical URL.
 *
 * EMPTY until Phase 4 begins moving capabilities. The mechanism exists now so the safety net
 * is in place BEFORE anything moves — nothing is allowed to 404, ever. Phase 4 adds entries
 * like { source: '/family', destination: '/space', permanent: true } and, per capability,
 * { source: '/family/members', destination: '/space/people', permanent: true }.
 */
export interface RouteRedirect {
  source: string
  destination: string
  /** 308 (permanent) for canonical moves — deep links and SEO follow. */
  permanent: boolean
}

export const WORKSPACE_REDIRECTS: RouteRedirect[] = [
  // ── Phase 4 · retire the competing home ──────────────────────────────────────────────────
  // The bare /family dashboard → the Workspace home. EXACT match only (`source: '/family'`), so
  // /family/* functional sub-routes are untouched — they keep working until their /space Owner
  // reaches parity (Care owns booking, Billing/Settings are real, Person Space has health/docs).
  // Phase 3 already made /space the default landing; this closes the door on the old home page.
  { source: '/family', destination: '/space', permanent: true },
  //
  // Capability redirects (/family/members → /space/people, etc.) are ADDED per Owner as each
  // reaches parity — never blanket, or a working page would redirect to a lighter one.
]
