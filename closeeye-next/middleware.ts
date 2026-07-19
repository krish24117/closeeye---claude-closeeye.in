/**
 * Host-based front-door routing — one platform, two front doors (see docs + the platform
 * memory: closeeye.app + connect.closeeye.in = the GLOBAL Connect front doors; closeeye.in =
 * the India marketing front door). They share ONE codebase, so the root path `/` is disambiguated
 * here by Host, not by a forked app.
 *
 * On a Connect front-door host, `/` REWRITES to `/connect` (the URL stays the bare domain; the
 * Connect experience renders). On closeeye.in the root is left alone — the India home still serves.
 * This is a rewrite, not a redirect: closeeye.app/ shows Connect at the clean domain root.
 *
 * Deliberately scoped to the root path only (see `config.matcher`) — every other route resolves
 * identically on every host, so nothing else can regress.
 */
import { NextResponse, type NextRequest } from 'next/server'

/** Hosts whose root is the Connect experience. Everything else (closeeye.in) keeps the India home. */
const CONNECT_FRONT_DOORS = new Set([
  'closeeye.app',
  'www.closeeye.app',
  'connect.closeeye.in',
])

export function middleware(req: NextRequest): NextResponse {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0] ?? ''
  if (req.nextUrl.pathname === '/' && CONNECT_FRONT_DOORS.has(host)) {
    const url = req.nextUrl.clone()
    url.pathname = '/connect'
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

// Only the root path — the cheapest possible matcher, and the only path whose meaning differs
// between the India and Connect front doors.
export const config = {
  matcher: ['/'],
}
