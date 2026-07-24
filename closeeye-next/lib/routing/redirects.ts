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
  // ── Per-Owner capability redirects — ADDED only when the /space Owner reaches parity ──
  // Billing: /space/billing owns the real membership summary + payment history now.
  { source: '/family/billing', destination: '/space/billing', permanent: true },
  // Settings: /space/settings is the real profile/account page (moved intact). /family/profile/edit
  // (the edit form) stays until it re-homes; membership payment stays too.
  { source: '/family/profile', destination: '/space/settings', permanent: true },
  //
  // ── People (Phase 4) — parity reached: /space/people has the roster, the Person Space (view +
  // Edit), the edit form, the health/care profile, and the add flow. The whole family People
  // surface re-homes. `:id/health` is listed BEFORE `:id` (most-specific first).
  { source: '/family/members', destination: '/space/people', permanent: true },
  { source: '/family/members/:id/health', destination: '/space/people/:id/health', permanent: true },
  { source: '/family/members/:id', destination: '/space/people/:id', permanent: true },
  { source: '/family/add', destination: '/space/people/add', permanent: true },
  //
  // ── Re-homing wave 2 (IA consolidation 2026-07-24, founder-approved) — booking, plan
  // activation, visits and conversations relocate under /space via RE-EXPORT pages (same
  // component trees, zero booking/payment/messaging-logic change). Most-specific first.
  { source: '/family/book', destination: '/space/book', permanent: true },
  { source: '/family/membership', destination: '/space/billing/plan', permanent: true },
  { source: '/family/visits/:id', destination: '/space/activity/visit/:id', permanent: true },
  { source: '/family/visits', destination: '/space/activity/visits', permanent: true },
  // Ask is superseded by the canonical /space/connect engine (?q= passes through); the human
  // PM threads + care-updates feed relocate intact under /space/connect/threads.
  { source: '/family/connect/ask', destination: '/space/connect', permanent: true },
  { source: '/family/connect/:id', destination: '/space/connect/threads/:id', permanent: true },
  { source: '/family/connect', destination: '/space/connect/threads', permanent: true },
  //
  // ── Family Journey (founder-approved 2026-07-24): the services catalogue's Owner is the ORB
  // (Connect answers "What do I need?"). The old in-app services list re-homes to /space/connect,
  // whose sheet + conversation now carry "Everything we can arrange" with the canonical prices.
  { source: '/family/services', destination: '/space/connect', permanent: true },
  //
  // Still held (Owner not yet at parity): /family/profile/edit (edit form). It re-homes as its
  // /space Owner reaches parity.
]
