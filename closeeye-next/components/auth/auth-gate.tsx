'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { hasFounderSessionHint } from '@/lib/founder-funnel'
import { isGuardian, isSuperAdmin, isPresenceManager } from '@/lib/roles'
import { isNative } from '@/lib/native'
import { LogoMark } from '@/components/ui/logo'

// The unauthenticated / setup flow (allowed before the dashboard).
const FLOW = ['/welcome', '/auth', '/permissions', '/onboarding', '/guardian/login']
// The signed-in app surfaces (require auth + completed onboarding).
const APP = ['/family', '/guardian', '/pm', '/admin', '/settings', '/notifications', '/search']
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
      // Protect app routes. Staff (PM / Admin) go straight to the sign-in screen —
      // no marketing carousel; families keep the /welcome onboarding intro; a
      // signed-out guardian route sends to the Guardian login.
      if (onApp && !onFlow)
        target = pathname.startsWith('/guardian')
          ? '/guardian/login'
          : pathname.startsWith('/pm') || pathname.startsWith('/admin')
          ? '/auth'
          : '/welcome'
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
      const home = isGuardian(profile)
        ? '/guardian'
        : isSuperAdmin(profile)
        ? '/admin'
        : isPresenceManager(profile)
        ? '/pm'
        : '/family'
      if (onFlow) target = home // skip the auth flow once fully set up
      else if (firstNative && !onApp) target = home // native launch on marketing
    }

    launched.current = true
    if (target && target !== pathname) {
      router.replace(target)
      if (native) return // keep the splash cover until the destination renders
    }
    setReady(true)
  }, [configured, loading, session, onboardingComplete, dataLoading, profile?.role, pathname, native, router])

  if (native && !ready) {
    return (
      <div className="fixed inset-0 z-[9999] grid place-items-center bg-ivory" aria-hidden>
        <LogoMark className="ce-pulse-soft h-20 w-20" />
      </div>
    )
  }
  return null
}
