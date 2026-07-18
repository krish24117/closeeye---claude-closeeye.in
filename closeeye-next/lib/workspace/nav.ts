/**
 * Workspace navigation — the single source, derived from the Ownership Registry
 * (docs/ownership_registry.md). Primary nav is the five Owners in the constitutional order
 * Home · Ask · People · Activity · Care; Billing and Settings are overflow. Pure data so it is
 * testable against the registry (nav-regression guardrail).
 */
export interface NavItem {
  href: string
  label: string
  /** Home matches its route exactly; the rest match by prefix (a section owns its children). */
  exact?: boolean
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { href: '/space', label: 'Home', exact: true },
  { href: '/space/ask', label: 'Ask' },
  { href: '/space/people', label: 'People' },
  { href: '/space/activity', label: 'Activity' },
  { href: '/space/care', label: 'Care' },
]

export const OVERFLOW_NAV: readonly NavItem[] = [
  { href: '/space/billing', label: 'Billing' },
  { href: '/space/settings', label: 'Settings' },
]

export function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}
