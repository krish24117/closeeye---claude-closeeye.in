'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/** Real sign-out: clears the Supabase session, then returns to the entry flow. */
export function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  const onClick = async () => {
    setBusy(true)
    haptic('warning')
    await signOut()
    router.replace('/welcome')
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
