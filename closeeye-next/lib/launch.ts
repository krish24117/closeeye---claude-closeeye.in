/**
 * Founder Funnel Launch Mode (Phase 1).
 *
 * Close Eye is deployed but not officially launched. The public launch in
 * Hyderabad is configured (below). ONLY the Founder Funnel (/f/<ref>) runs in
 * pre-launch mode — its visitors register (account + membership selection)
 * without paying or booking. Every other route stays fully live for QA and
 * production validation.
 *
 * CONFIGURATION, not code (Mandatory Change #2): the launch date comes from
 * NEXT_PUBLIC_FOUNDER_LAUNCH_DATE ('YYYY-MM-DD' or a full ISO string) — moving
 * the launch never touches logic. Caveat: NEXT_PUBLIC_* is inlined at build, so
 * changing it needs a redeploy (no code change). The true no-redeploy authority
 * is a Supabase `launch_config` row, added with the DB phase — the same
 * "Supabase is the authority" direction as the account signal (see founder-funnel.ts).
 *
 * Kept dependency-free (no `@/` imports) so the pure gate logic is unit-testable.
 */

const DEFAULT_LAUNCH_ISO = '2026-08-15T00:00:00+05:30' // Hyderabad (IST) — fallback only

function resolveLaunchIso(): string {
  const raw = (process.env.NEXT_PUBLIC_FOUNDER_LAUNCH_DATE ?? '').trim()
  if (!raw) return DEFAULT_LAUNCH_ISO
  // 'YYYY-MM-DD' → IST midnight; anything else is treated as a full ISO string.
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00+05:30` : raw
}

export const FOUNDER_LAUNCH_ISO = resolveLaunchIso()
const parsed = Date.parse(FOUNDER_LAUNCH_ISO)
/** A malformed config falls back to the default date — never NaN. */
const LAUNCH_MS = Number.isNaN(parsed) ? Date.parse(DEFAULT_LAUNCH_ISO) : parsed

/** Human label derived from the configured date, e.g. "15 August 2026". */
export const FOUNDER_LAUNCH_LABEL = new Date(LAUNCH_MS).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
})

/** True until the launch moment. `nowMs` is injectable so it can be tested. */
export function isFounderPreLaunch(nowMs: number = Date.now()): boolean {
  return nowMs < LAUNCH_MS
}

export type LaunchMode = 'pre-launch' | 'live'

/**
 * The current launch mode — the single named accessor for "where are we?".
 * `'pre-launch'` until the configured launch date, then `'live'`. Config-driven
 * (Change #2), so it flips automatically at the launch moment with no deploy of
 * logic. Use this to branch UI/copy; use isFounderFunnelGated() for the per-visitor gate.
 */
export function launchMode(nowMs: number = Date.now()): LaunchMode {
  return isFounderPreLaunch(nowMs) ? 'pre-launch' : 'live'
}

/** Whole days remaining until launch (0 at/after launch). `nowMs` injectable. */
export function daysUntilLaunch(nowMs: number = Date.now()): number {
  return Math.max(0, Math.ceil((LAUNCH_MS - nowMs) / 86_400_000))
}

/**
 * The pure gate. Block only when pre-launch AND this visitor is a founder
 * registrant. The AUTHORITY is `accountIsFounderPrelaunch` — a durable Supabase
 * account signal (Mandatory Change #1). `sessionHint` (localStorage) is only a
 * provisional fallback for the anonymous, pre-account window and must never be
 * the source of truth. A normal visitor (neither signal) is never gated.
 */
export function shouldGateFounderFunnel(input: {
  preLaunch: boolean
  accountIsFounderPrelaunch?: boolean
  sessionHint?: boolean
}): boolean {
  return input.preLaunch && (!!input.accountIsFounderPrelaunch || !!input.sessionHint)
}

/**
 * A founder ref is an opaque prospect id carried by the landing (/f/<ref>) for
 * attribution. Keep it safe: trim, allow only url-safe chars, cap length. '' if empty.
 */
export function sanitizeRef(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
}

/** Honest copy shown when the gate withholds an action during pre-launch. */
export const PRELAUNCH_MEMBERSHIP_NOTE =
  `You're among the first Hyderabad families joining Close Eye. Your membership will become available from ${FOUNDER_LAUNCH_LABEL}.`
export const PRELAUNCH_BOOKING_NOTE =
  `Visits open when Close Eye launches in Hyderabad on ${FOUNDER_LAUNCH_LABEL}.`
