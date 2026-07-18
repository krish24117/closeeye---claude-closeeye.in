/**
 * Sprint-1 nav-regression guardrail — the Workspace navigation must match the ratified
 * Ownership Registry (docs/ownership_registry.md) and the Navigation Constitution.
 */
import { describe, it, expect } from 'vitest'
import { PRIMARY_NAV, OVERFLOW_NAV, isActive } from './nav'

describe('primary nav = the five Owners, in constitutional order', () => {
  it('is exactly Home · Ask · People · Activity · Care', () => {
    expect(PRIMARY_NAV.map((n) => n.label)).toEqual(['Home', 'Ask', 'People', 'Activity', 'Care'])
  })
  it('routes are the registry canonical routes', () => {
    expect(PRIMARY_NAV.map((n) => n.href)).toEqual(['/space', '/space/ask', '/space/people', '/space/activity', '/space/care'])
  })
  it('every primary route is Workspace-rooted (/space)', () => {
    for (const n of PRIMARY_NAV) expect(n.href.startsWith('/space')).toBe(true)
  })
  it('only Home matches exactly; sections own their children', () => {
    expect(PRIMARY_NAV.find((n) => n.href === '/space')?.exact).toBe(true)
    expect(PRIMARY_NAV.filter((n) => n.href !== '/space').every((n) => !n.exact)).toBe(true)
  })
})

describe('overflow = Billing · Settings, behind the Account menu', () => {
  it('is exactly Billing then Settings', () => {
    expect(OVERFLOW_NAV.map((n) => n.label)).toEqual(['Billing', 'Settings'])
    expect(OVERFLOW_NAV.map((n) => n.href)).toEqual(['/space/billing', '/space/settings'])
  })
})

describe('no capability appears in two nav trees (Law 3)', () => {
  it('primary and overflow are disjoint', () => {
    const overlap = PRIMARY_NAV.map((n) => n.href).filter((h) => OVERFLOW_NAV.some((o) => o.href === h))
    expect(overlap).toEqual([])
  })
})

describe('isActive', () => {
  it('Home is active only on exactly /space', () => {
    expect(isActive('/space', '/space', true)).toBe(true)
    expect(isActive('/space/ask', '/space', true)).toBe(false)
  })
  it('a section is active on itself and its children', () => {
    expect(isActive('/space/people', '/space/people')).toBe(true)
    expect(isActive('/space/people/123', '/space/people')).toBe(true)
    expect(isActive('/space/care', '/space/people')).toBe(false)
  })
})
