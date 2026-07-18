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
  // Phase 4 fills this. Kept empty in Phase 0 — the guardrail and next.config wiring exist first.
]
