/**
 * Host-based front-door routing — one platform, two front doors (see docs + the platform
 * memory: closeeye.app + connect.closeeye.in = the GLOBAL Connect front doors; closeeye.in =
 * the India marketing front door). They share ONE codebase, so what a path means is disambiguated
 * here by Host, not by a forked app.
 *
 * On a Connect front-door host:
 *   • `/`  REWRITES to `/connect` (the URL stays the bare domain; the Connect experience renders).
 *   • the India-COMMERCIAL marketing pages (services, book, membership, guardian/companion
 *     recruitment, the India about/trust/contact/help/feedback) REDIRECT to `/connect` — they are
 *     India eldercare content and have no place on the global Connect door yet.
 *   • everything else passes through: the Connect pages, the app (/space, /welcome, auth), and the
 *     LEGAL/technical pages (privacy, terms, refund/cancellation-policy, consent, cookies,
 *     medical-disclaimer, offline) — which Connect and the law both depend on.
 *
 * closeeye.in is never a Connect front door, so India keeps every page exactly as-is.
 */
import { NextResponse, type NextRequest } from 'next/server'

/** Hosts whose experience is Connect (global), not the India marketing site. */
const CONNECT_FRONT_DOORS = new Set([
  'closeeye.app',
  'www.closeeye.app',
  'connect.closeeye.in',
])

/**
 * First path segment of India-commercial marketing pages that must NOT appear on the global
 * Connect door. Deliberately a denylist: legal/technical/Connect/app routes are absent, so they
 * always pass through. (Legal — privacy, terms, refund-policy, cancellation-policy, consent,
 * cookies, medical-disclaimer — and offline are intentionally NOT here.)
 */
const INDIA_ONLY = new Set([
  'about',
  'book',
  'membership',
  'services',
  'become-a-guardian',
  'become-a-companion',
  'trust-safety',
  'contact',
  'help',
  'feedback',
])

export function middleware(req: NextRequest): NextResponse {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0] ?? ''
  if (!CONNECT_FRONT_DOORS.has(host)) return NextResponse.next()

  const { pathname } = req.nextUrl

  // `/` → the Connect experience, keeping the clean bare-domain URL (rewrite, not redirect).
  if (pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/connect'
    return NextResponse.rewrite(url)
  }

  // India-commercial page on the global door → bounce to Connect (307: temporary, since these
  // may gain global versions later; not cached as permanent).
  const seg = pathname.split('/')[1] ?? ''
  if (INDIA_ONLY.has(seg)) {
    const url = req.nextUrl.clone()
    url.pathname = '/connect'
    url.search = ''
    return NextResponse.redirect(url, 307)
  }

  return NextResponse.next()
}

// Run on page navigations only — skip Next internals, the API, and any file with an extension
// (static assets). The in-code host + path checks above decide what actually gets rewritten.
export const config = {
  matcher: ['/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)'],
}
