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
 *   • the India APP ONBOARDING carousel (/welcome — "Everything starts with care", Presence
 *     Manager) REDIRECTS to `/connect`: it is India eldercare onboarding and must never surface on
 *     the global door (the Connect entry is /connect, then /join or /auth).
 *   • everything else passes through: the Connect pages, the app (/space, /auth), and the
 *     LEGAL/technical pages (privacy, terms, refund/cancellation-policy, consent, cookies,
 *     medical-disclaimer, offline) — which Connect and the law both depend on.
 *
 * closeeye.in is never a Connect front door, so India keeps every page exactly as-is.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { frontDoorRouting } from '@/lib/platform/front-door'

export function middleware(req: NextRequest): NextResponse {
  // The pure host×path decision lives in front-door.ts (single source of truth, unit-tested there).
  // Staff consoles (/guardian, /pm, /admin) are guaranteed pass-through on every host by that
  // module's contract test — so this door can never accidentally 307 them to /connect.
  const decision = frontDoorRouting(req.headers.get('host'), req.nextUrl.pathname)
  if (decision.type === 'next') return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = decision.pathname
  // `/` → Connect keeps the clean bare-domain URL (rewrite). India-commercial pages bounce to
  // Connect (307 temporary, since they may gain global versions later), dropping the query.
  if (decision.type === 'rewrite') return NextResponse.rewrite(url)
  url.search = ''
  return NextResponse.redirect(url, 307)
}

// Run on page navigations only — skip Next internals, the API, and any file with an extension
// (static assets). The in-code host + path checks above decide what actually gets rewritten.
export const config = {
  matcher: ['/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)'],
}
