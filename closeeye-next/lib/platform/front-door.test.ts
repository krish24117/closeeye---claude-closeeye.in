/**
 * Contract guardrail — SINGLE UI (founder 2026-07-23: "no more two UI").
 *
 * closeeye.app and closeeye.in share ONE codebase AND now serve ONE identical experience. This test
 * FREEZES that: `frontDoorRouting` must pass EVERY path through on EVERY host — no host-based rewrite
 * or redirect. If a future edit re-introduces a host split (e.g. `/` → /connect on a Connect host, or
 * an India-only segment redirect), the build goes red here before it can ship, so any such change is
 * deliberate and reviewed. `isConnectHost` is kept meaningful (sitemap + auth gate still use it).
 */
import { describe, it, expect } from 'vitest'
import { frontDoorRouting, isConnectHost, STAFF_SEGMENTS } from './front-door'

const HOSTS = [
  'closeeye.app',
  'www.closeeye.app',
  'connect.closeeye.in',
  'closeeye.in',
  'www.closeeye.in',
  null,
  'preview-xyz.vercel.app',
]

const PATHS = [
  '/', '/connect', '/nri', '/book', '/services', '/membership', '/welcome',
  '/space', '/space/connect', '/space/people/abc', '/auth', '/join',
  '/guardian', '/guardian/login', '/pm', '/admin', '/privacy', '/terms',
]

describe('front-door routing — one experience on every host', () => {
  it('every path passes through on every host (no rewrite, no redirect)', () => {
    for (const host of HOSTS) {
      for (const path of PATHS) {
        expect(frontDoorRouting(host, path)).toEqual({ type: 'next' })
      }
    }
  })

  it('staff consoles pass through on a Connect host (unchanged guarantee)', () => {
    for (const seg of STAFF_SEGMENTS) {
      for (const path of [`/${seg}`, `/${seg}/`, `/${seg}/login`, `/${seg}/deep/nested/route`]) {
        expect(frontDoorRouting('closeeye.app', path)).toEqual({ type: 'next' })
      }
    }
  })

  it('isConnectHost still classifies Connect hosts (sitemap + auth gate depend on it)', () => {
    expect(isConnectHost('closeeye.app')).toBe(true)
    expect(isConnectHost('www.closeeye.app')).toBe(true)
    expect(isConnectHost('connect.closeeye.in')).toBe(true)
    expect(isConnectHost('closeeye.in')).toBe(false)
    expect(isConnectHost(null)).toBe(false)
  })
})
