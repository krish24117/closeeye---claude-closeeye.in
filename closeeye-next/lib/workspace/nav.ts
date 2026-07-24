/**
 * Workspace navigation — the single source, derived from the Ownership Registry
 * (docs/ownership_registry.md). Primary nav is the five Owners; from the Dock redesign
 * (2026-07-19) they render as a bottom **dock**: four tabs around a central Connect **orb**.
 *
 * Dock order (left → orb → right): Home · Family · ⬢ Connect · Activity · Profile.
 * "Connect" is the product's conversational intelligence — NOT a generic "Ask"; talking to
 * Close Eye IS Connect. It leaves the tab row and becomes the orb (CONNECT_HREF), the primary
 * action. "Profile" is the presentation of the Settings Owner (canonical /space/settings), now a
 * primary destination — so Settings is no longer overflow. Care stays in the data but is hidden
 * from the dock until phase 2 (NEXT_PUBLIC_CARE_ENABLED). Pure data so it stays testable against
 * the registry (nav-regression guardrail).
 */
export interface NavItem {
  href: string
  label: string
  /** Home matches its route exactly; the rest match by prefix (a section owns its children). */
  exact?: boolean
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/space', label: 'Home', exact: true },
  { href: '/space/people', label: 'Family' },
  { href: '/space/connect', label: 'Connect' },
  { href: '/space/activity', label: 'Activity' },
  { href: '/space/settings', label: 'Profile' },
  { href: '/space/care', label: 'Care' },
]

/** The Connect Owner renders as the center orb, not a tab — the shell splits the dock around it. */
export const CONNECT_HREF = '/space/connect'

export const OVERFLOW_NAV: readonly NavItem[] = [
  { href: '/space/billing', label: 'Billing' },
]

export function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}
