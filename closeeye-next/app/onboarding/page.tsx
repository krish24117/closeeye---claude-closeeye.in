'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { completeOnboarding } from '@/lib/profile'
import { haptic } from '@/lib/haptics'

/**
 * Onboarding foundation — the step a signed-in user must complete before the
 * dashboard. Records their name + the completion flag, then opens Family Space.
 * (Loved-ones / details setup can be layered on here later.)
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshOnboarding } = useAuth()
  const [name, setName] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined
    if (meta?.full_name || meta?.name) setName(String(meta.full_name ?? meta.name))
  }, [user])

  async function submit() {
    setError('')
    if (name.trim().length < 2) return setError('Please enter your name so we know who we’re caring for.')
    setBusy(true)
    const { error: err } = await completeOnboarding(name)
    if (err) {
      setBusy(false)
      return setError(err)
    }
    await refreshOnboarding()
    haptic('success')
    router.replace('/family')
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-ivory px-5 py-10">
      <div className="ce-fade-in w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-14 w-14" />
          <h1 className="mt-4 text-h2 text-ink">Welcome to Close Eye</h1>
          <p className="mt-2 text-body text-muted">Let’s set up your family space — it only takes a moment.</p>
        </div>
        <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <label className="block">
            <span className="mb-1.5 block text-body-sm font-medium text-ink">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Full name"
              autoComplete="name"
              className="w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
            />
          </label>
          {error && <p className="mt-3 text-caption text-error">{error}</p>}
          <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={submit}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Setting up…</> : <>Continue to Family Space <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
          </Button>
        </div>
        <p className="mt-4 text-center text-caption text-muted">You can add your loved ones and details next.</p>
      </div>
    </div>
  )
}
