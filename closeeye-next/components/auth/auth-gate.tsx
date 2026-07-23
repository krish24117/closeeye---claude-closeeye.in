'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { hasFounderSessionHint } from '@/lib/founder-funnel'
import { isGuardian, isSuperAdmin, isPresenceManager } from '@/lib/roles'
import { isNative } from '@/lib/native'
import { isConnectHost } from '@/lib/platform/front-door'
import { SplashScreen } from '@/components/ui/splash-screen'

// The unauthenticated / setup flow (allowed before the dashboard).
const FLOW = ['/welcome', '/auth', '/permissions', '/onboarding', '/guardian/login']
// The signed-in app surfaces (require auth + completed onboarding). /space is the Workspace —
// the canonical family home (Phase 3). It self-guards in its own shell (AppShell mounts it
// without AuthGate), so this entry documents intent and covers the native-launch path.
const APP = ['/space', '/family', '/guardian', '/pm', '/admin', '/settings', '/notifications', '/search']
const inList = (p: string, l: string[]) => l.some((f) => p === f || p.startsWith(`${f}/`))

/**
 * The single source of app routing:
 *   • Route protection (web + native): signed-out users can't reach app routes.
 *   • Onboarding gating: a signed-in user with incomplete onboarding is always
 *     sent to /onboarding; the dashboard opens only once onboarding is done.
 *   • Skip-auth: a fully signed-in user never sees the welcome/login flow.
 *   • Native entry: an unauthenticated launch shows the marketing home (/); a
 *     signed-in launch goes straight to the role dashboard. The "Check on My
 *     Family" CTA (/book) resolves to sign-in in the native app.
 * A splash covers the native app until routing resolves — no dashboard flash for
 * returning users.
 */
export function AuthGate() {
  const { session, loading, configured, onboardingComplete } = useAuth()
  const { profile, loading: dataLoading } = useFamilyData()
  const pathname = usePathname()
  const router = useRouter()
  const native = isNative()
  const launched = useRef(false)
  const [ready, setReady] = useState(!native)
  // A minimum graceful display so the splash never flashes-and-vanishes on a warm start — this is
  // flash-prevention, not an artificial hold: once BOTH the app is ready AND this brief beat has
  // passed, the splash fades to reveal the app. Tune SPLASH_MIN_MS to taste.
  const [minShown, setMinShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMinShown(true), 700); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (!configured) {
      setReady(true)
      return
    }
    // Wait for the session and (when signed in) the onboarding + profile to resolve.
    if (loading || (!!session && (onboardingComplete === null || dataLoading))) return

    const onApp = inList(pathname, APP)
    const onFlow = inList(pathname, FLOW)
    const firstNative = native && !launched.current
    let target: string | null = null

    if (!session) {
      // The signed-out family entry is host-aware: on the GLOBAL Connect front doors
      // (closeeye.app / connect.closeeye.in) it is the Connect experience (/connect) — NEVER the
      // India /welcome carousel; on the India door it stays /welcome. This is the root fix for
      // "closeeye.app keeps showing closeeye.in": a signed-out landing on an app route no longer
      // routes to India onboarding on the global door.
      const familyEntry = (typeof window !== 'undefined' && isConnectHost(window.location.host)) ? '/' : '/welcome'
      // Protect app routes. Staff (PM / Admin) go straight to the sign-in screen; a signed-out
      // guardian route sends to the Guardian login.
      if (onApp && !onFlow)
        target = pathname.startsWith('/guardian')
          ? '/guardian/login'
          : pathname.startsWith('/pm') || pathname.startsWith('/admin')
          ? '/auth'
          : familyEntry
      // Native "Check on My Family" → authenticate: the guest booking flow (/book)
      // is web-only, so an unauthenticated tap in the app resolves to sign-in.
      else if (native && (pathname === '/book' || pathname.startsWith('/book/')))
        target = '/auth'
      // Unauthenticated native launch now shows the marketing home at / (the former
      // redirect to /welcome is removed — Mobile Entry Experience spec, FR-1).
    } else if (onboardingComplete === false && !isSuperAdmin(profile) && !isPresenceManager(profile)) {
      // Family setup only. Founder pre-launch registrants finish a different,
      // loved-one-free journey (/join/*); a normal user (no hint, not on /join)
      // goes to /onboarding as before. Staff (admin / Presence Manager) never do
      // family onboarding — they're routed to their console below.
      if (pathname.startsWith('/join')) {
        // stay — the founder join journey (/join/*) guides the rest of setup.
      } else if (hasFounderSessionHint()) {
        target = '/join/welcome' // resume the founder journey, not generic onboarding
      } else if (pathname !== '/onboarding') {
        target = '/onboarding' // must finish onboarding
      }
    } else {
      // Route each role to its home: Guardians → Guardian app, Super Admins →
      // Admin console, Presence Managers → Presence Console, else → Family.
      // (Previously every non-guardian landed in Family, so an admin who signed
      // in was dropped into the family dashboard instead of /admin.)
      // Phase 3 — flip the home. A family lands in the Workspace (/space), not the legacy
      // /family dashboard. Reversible: change this one target back. Staff homes unchanged.
      const home = isGuardian(profile)
        ? '/guardian'
        : isSuperAdmin(profile)
        ? '/admin'
        : isPresenceManager(profile)
        ? '/pm'
        : '/space'
      // Skip the auth flow once fully set up — EXCEPT /onboarding, which owns its own post-completion
      // hand-off (the "space is ready" close → enterSpace/goActivate). Auto-redirecting it the instant
      // onboarding flips complete raced that cinematic screen away; the page navigates itself now.
      if (onFlow && pathname !== '/onboarding') target = home
      else if (firstNative && !onApp) target = home // native launch on marketing
    }

    launched.current = true
    if (target && target !== pathname) {
      router.replace(target)
      if (native) return // keep the splash cover until the destination renders
    }
    setReady(true)
  }, [configured, loading, session, onboardingComplete, dataLoading, profile?.role, pathname, native, router])

  // A fade-to-reveal splash over the app while it boots. Native starts un-ready (routing must
  // resolve) so it always shows; web is ready instantly, so the splash is only the brief graceful
  // beat — never a hold on an app that's already ready.
  return <SplashScreen visible={!ready || !minShown} />
}
