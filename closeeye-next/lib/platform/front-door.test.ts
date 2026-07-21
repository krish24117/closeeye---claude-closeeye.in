/**
 * Integration guardrail — the staff consoles are first-class on every front door.
 *
 * closeeye.app (global Connect door) and closeeye.in (India door) share ONE codebase; what a path
 * means is disambiguated by Host in `frontDoorRouting`. The migration promise is that Guardian, PM
 * and Admin work on closeeye.app without being rebuilt — so this test FREEZES the invariant that a
 * staff segment can never be treated as India-only marketing and 307'd to /connect on the global
 * door. If a future edit adds 'guardian' | 'pm' | 'admin' to the denylist, or otherwise redirects a
 * staff path on a Connect host, the build goes red here before it can ship.
 */
import { describe, it, expect } from 'vitest'
import { frontDoorRouting, INDIA_ONLY_SEGMENTS, STAFF_SEGMENTS } from './front-door'

const CONNECT = 'closeeye.app' // a global Connect front door
const INDIA = 'closeeye.in' // the India marketing door

describe('front-door routing — staff consoles reachable on every front door', () => {
  it('staff routes pass through on the Connect host (never redirected to /connect)', () => {
    for (const seg of STAFF_SEGMENTS) {
      for (const path of [`/${seg}`, `/${seg}/`, `/${seg}/login`, `/${seg}/deep/nested/route`]) {
        expect(frontDoorRouting(CONNECT, path)).toEqual({ type: 'next' })
      }
    }
  })

  it('no staff segment is ever in the India-only denylist', () => {
    for (const seg of STAFF_SEGMENTS) expect(INDIA_ONLY_SEGMENTS.has(seg)).toBe(false)
  })

  it('the app + auth + join + connect routes pass through on the Connect host', () => {
    for (const path of ['/space', '/space/connect', '/space/people/abc', '/auth', '/join', '/connect']) {
      expect(frontDoorRouting(CONNECT, path)).toEqual({ type: 'next' })
    }
  })

  it('India-commercial segments still redirect to /connect on the Connect host', () => {
    for (const seg of INDIA_ONLY_SEGMENTS) {
      expect(frontDoorRouting(CONNECT, `/${seg}`)).toEqual({ type: 'redirect', pathname: '/connect' })
    }
  })

  it('root rewrites to /connect on the Connect host (clean bare-domain URL)', () => {
    expect(frontDoorRouting(CONNECT, '/')).toEqual({ type: 'rewrite', pathname: '/connect' })
  })

  it('the India door is untouched — every path passes through (including staff + marketing)', () => {
    for (const path of ['/', '/guardian', '/pm', '/admin', '/book', '/membership', '/welcome', '/space']) {
      expect(frontDoorRouting(INDIA, path)).toEqual({ type: 'next' })
    }
  })

  it('an unknown host is treated as non-Connect (pass through)', () => {
    expect(frontDoorRouting(null, '/guardian')).toEqual({ type: 'next' })
    expect(frontDoorRouting('preview-xyz.vercel.app', '/')).toEqual({ type: 'next' })
  })
})
