'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { isNative } from '@/lib/native'

/**
 * Real sign-out: clears the Supabase session, then returns to the entry flow.
 * `redirectTo` defaults to the family welcome carousel on web; on native the family
 * return is the marketing home (/) per the Mobile Entry Experience spec (E-2). Staff
 * areas pass '/auth' and the Guardian app '/guardian/login' — unchanged on both.
 */
export function SignOutButton({ className, redirectTo = '/welcome' }: { className?: string; redirectTo?: string }) {
  const { signOut } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  const onClick = async () => {
    setBusy(true)
    haptic('warning')
    await signOut()
    // E-2: on native, the family return (/welcome) becomes the marketing home; web
    // and explicit staff/Guardian destinations are unchanged.
    router.replace(isNative() && redirectTo === '/welcome' ? '/' : redirectTo)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-sm border border-error/25 px-5 py-3 text-body-sm font-semibold text-error transition-colors hover:bg-error/[0.06] disabled:opacity-60',
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <LogOut className="h-4 w-4" strokeWidth={1.75} />}
      Sign out
    </button>
  )
}
