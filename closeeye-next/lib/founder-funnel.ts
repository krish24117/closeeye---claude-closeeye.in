import { isFounderPreLaunch, shouldGateFounderFunnel } from './launch'

/**
 * Founder Funnel — SESSION HINT (Phase 1). NOT the authority (Mandatory Change #1).
 *
 * A convenience localStorage flag marking an anonymous visitor who arrived via the
 * founder landing (/f/<ref>), so the pre-launch gate can apply BEFORE they have an
 * account. localStorage is fragile (cleared, private mode, another device) — so it
 * must never be the source of truth. The AUTHORITY is a durable Supabase account
 * signal (e.g. `founding_registration` / `account_status`), created + set at
 * registration in Phase 3 and passed to the gate as `accountIsFounderPrelaunch`;
 * once present it decides, hint or no hint.
 */
const HINT_KEY = 'ce_founder_hint'

export function setFounderSessionHint(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(HINT_KEY, '1') } catch { /* private mode / quota */ }
}

export function hasFounderSessionHint(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(HINT_KEY) === '1' } catch { return false }
}

export function clearFounderSessionHint(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(HINT_KEY) } catch { /* ignore */ }
}

/**
 * Should this visitor's payment/booking be withheld? Authority-first: the durable
 * account signal decides; the session hint is only a fallback for the pre-account
 * window. Dormant for everyone until Phase 2 sets the hint — so all QA/production
 * traffic is unaffected today. Phase 3 threads the real account signal in as the arg.
 */
export function isFounderFunnelGated(accountIsFounderPrelaunch = false): boolean {
  return shouldGateFounderFunnel({
    preLaunch: isFounderPreLaunch(),
    accountIsFounderPrelaunch,
    sessionHint: hasFounderSessionHint(),
  })
}
