'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { isNative } from '@/lib/native'
import { LogoMark } from '@/components/ui/logo'

// The unauthenticated / setup flow (allowed before the dashboard).
const FLOW = ['/welcome', '/auth', '/permissions', '/onboarding']
// The signed-in app surfaces (require auth + completed onboarding).
const APP = ['/family', '/guardian', '/console', '/admin', '/settings', '/notifications', '/search']
const inList = (p: string, l: string[]) => l.some((f) => p === f || p.startsWith(`${f}/`))

/**
 * The single source of app routing:
 *   • Route protection (web + native): signed-out users can't reach app routes.
 *   • Onboarding gating: a signed-in user with incomplete onboarding is always
 *     sent to /onboarding; the dashboard opens only once onboarding is done.
 *   • Skip-auth: a fully signed-in user never sees the welcome/login flow.
 *   • Native entry: on launch the app enters the correct screen (not marketing).
 * A splash covers the native app until routing resolves — no marketing flash.
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
      if (onApp) target = '/welcome' // protect app routes (web + native)
      else if (firstNative && !onFlow) target = '/welcome' // native launch on marketing
    } else if (onboardingComplete === false) {
      if (pathname !== '/onboarding') target = '/onboarding' // must finish onboarding
    } else {
      // Guardians (companions) land in the Guardian app; everyone else in Family.
      const home = profile?.role === 'companion' ? '/guardian' : '/family'
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
