/**
 * Nav-regression guardrail — the Workspace navigation must match the ratified Ownership Registry
 * (docs/ownership_registry.md) and the Navigation Constitution. Updated for the Dock redesign
 * (2026-07-19): the five Owners render as a dock — four tabs around the central Connect orb.
 */
import { describe, it, expect } from 'vitest'
import { PRIMARY_NAV, OVERFLOW_NAV, CONNECT_HREF, isActive } from './nav'

describe('primary nav = the five Owners, in dock order', () => {
  it('is exactly Home · People · Connect · Activity · Profile · Care', () => {
    expect(PRIMARY_NAV.map((n) => n.label)).toEqual(['Home', 'People', 'Connect', 'Activity', 'Profile', 'Care'])
  })
  it('routes are the registry canonical routes (Profile presents the Settings Owner)', () => {
    expect(PRIMARY_NAV.map((n) => n.href)).toEqual([
      '/space', '/space/people', '/space/connect', '/space/activity', '/space/settings', '/space/care',
    ])
  })
  it('every primary route is Workspace-rooted (/space)', () => {
    for (const n of PRIMARY_NAV) expect(n.href.startsWith('/space')).toBe(true)
  })
  it('only Home matches exactly; sections own their children', () => {
    expect(PRIMARY_NAV.find((n) => n.href === '/space')?.exact).toBe(true)
    expect(PRIMARY_NAV.filter((n) => n.href !== '/space').every((n) => !n.exact)).toBe(true)
  })
})

describe('Connect is the orb, not a tab', () => {
  it('CONNECT_HREF is a primary Owner rendered as the center orb', () => {
    expect(CONNECT_HREF).toBe('/space/connect')
    expect(PRIMARY_NAV.some((n) => n.href === CONNECT_HREF)).toBe(true)
  })
  it('splits the dock into two tabs on each side (excluding the hidden Care tab)', () => {
    const tabs = PRIMARY_NAV.filter((n) => n.href !== CONNECT_HREF && n.href !== '/space/care')
    expect(tabs.map((n) => n.label)).toEqual(['Home', 'People', 'Activity', 'Profile'])
  })
})

describe('overflow = Billing only, behind the Account menu (Settings is now Profile, primary)', () => {
  it('is exactly Billing', () => {
    expect(OVERFLOW_NAV.map((n) => n.label)).toEqual(['Billing'])
    expect(OVERFLOW_NAV.map((n) => n.href)).toEqual(['/space/billing'])
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
    expect(isActive('/space/connect', '/space', true)).toBe(false)
  })
  it('a section is active on itself and its children', () => {
    expect(isActive('/space/people', '/space/people')).toBe(true)
    expect(isActive('/space/people/123', '/space/people')).toBe(true)
    expect(isActive('/space/care', '/space/people')).toBe(false)
  })
})
