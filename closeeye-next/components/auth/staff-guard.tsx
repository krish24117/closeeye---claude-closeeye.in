'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock } from 'lucide-react'
import { useFamilyData } from '@/components/family/family-data-provider'
import { useAuth } from '@/components/auth/auth-provider'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { canUseConsole, isSuperAdmin } from '@/lib/roles'

/**
 * Client gate for staff-only areas. `console` allows Super Admin + Presence
 * Manager; `admin` allows Super Admin only. RLS is the real data gate — this
 * hides the internal ops/admin UI from any non-staff (or wrong-role) account.
 * Signed-out users are already bounced to /welcome by AuthGate — so anyone who
 * lands here IS signed in, just on the wrong account. The screen therefore
 * offers Sign out (→ /welcome, to log back in as a team account), not just a
 * link back to the family space.
 */
export function StaffGuard({ level, children }: { level: 'console' | 'admin'; children: React.ReactNode }) {
  const { profile, loading } = useFamilyData()
  const { user } = useAuth()
  const allowed = level === 'admin' ? isSuperAdmin(profile) : canUseConsole(profile)

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="flex max-w-sm flex-col items-center rounded-lg border border-line bg-card px-6 py-12 text-center shadow-sm">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-green"><Lock className="h-7 w-7" strokeWidth={1.5} /></span>
          <p className="mt-4 text-h4 text-ink">Restricted</p>
          <p className="mt-1.5 text-body-sm text-muted">This area is for Close Eye team members only.</p>
          {user?.email && (
            <p className="mt-3 text-caption text-muted">
              You’re signed in as <span className="font-semibold text-ink">{user.email}</span>. Sign out and log in with your team account.
            </p>
          )}
          <div className="mt-6 flex w-full flex-col items-center gap-3">
            <SignOutButton redirectTo="/auth" />
            <Link href="/family" className="text-body-sm font-semibold text-green hover:text-green-hover">Go to your family space →</Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
