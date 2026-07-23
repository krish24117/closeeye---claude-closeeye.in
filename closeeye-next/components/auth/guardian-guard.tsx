'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { Button } from '@/components/ui/button'
import { isGuardian } from '@/lib/roles'

/**
 * Gate for the Guardian app. Real auth (Supabase session) + a `role='companion'`
 * check — replaces the former demo-bypass login. Signed-out users go to the
 * Guardian sign-in; signed-in non-companions get a clear "wrong app" screen.
 * RLS is the real data gate; this decides which app opens.
 */
export function GuardianGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const { profile, loading: dataLoading } = useFamilyData()

  React.useEffect(() => {
    if (!authLoading && !session) router.replace('/guardian/login')
  }, [authLoading, session, router])

  if (authLoading || (session && dataLoading)) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
      </div>
    )
  }

  if (!session) return null // redirecting to /guardian/login

  if (!isGuardian(profile)) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="flex max-w-sm flex-col items-center rounded-lg border border-line bg-card px-6 py-12 text-center shadow-sm">
          <p className="text-h4 text-ink">Not a Guardian account</p>
          <p className="mt-1.5 text-body-sm text-muted">
            This app is for verified Close Eye Guardians. If you&apos;re a family member, open your Family Space instead.
          </p>
          <div className="mt-5 flex w-full flex-col gap-2.5">
            <Button asChild><a href="/space">Go to Family Space</a></Button>
            <SignOutButton redirectTo="/guardian/login" />
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
