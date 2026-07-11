'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Mail, ShieldCheck, WifiOff } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { useAuth } from '@/components/auth/auth-provider'
import { sendEmailOtp, signInWithGoogle } from '@/lib/auth-actions'

export default function GuardianLogin() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const [email, setEmail] = React.useState('')
  const [busy, setBusy] = React.useState<'google' | 'email' | null>(null)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState<string>()

  // Already signed in → the Guardian app (AuthGate also routes companions here).
  React.useEffect(() => {
    if (!loading && session) router.replace('/guardian')
  }, [loading, session, router])

  async function google() {
    setBusy('google')
    setError(undefined)
    const { error } = await signInWithGoogle()
    if (error) {
      setBusy(null)
      setError(error)
    }
    // On success the browser redirects; keep the spinner.
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    const em = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) {
      setError('Enter a valid email address')
      return
    }
    setBusy('email')
    setError(undefined)
    const { error } = await sendEmailOtp(em)
    setBusy(null)
    if (error) {
      setError(error)
      return
    }
    setSent(true)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <Logo variant="mobile" />
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-green">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} /> Guardian sign in
        </span>
        <h1 className="mt-5 text-h3">Welcome back</h1>
        <p className="mt-2 text-body text-muted">Sign in to see today&apos;s visits.</p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        {sent ? (
          <div className="rounded-lg border border-line bg-card p-5 text-center shadow-sm">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-green"><Mail className="h-6 w-6" strokeWidth={1.5} /></span>
            <p className="mt-3 text-body font-semibold text-ink">Check your email</p>
            <p className="mt-1 text-body-sm text-muted">
              We sent a sign-in link to <span className="font-medium text-ink">{email.trim()}</span>. Open it on this device to continue.
            </p>
            <button type="button" onClick={() => setSent(false)} className="mt-4 text-body-sm font-semibold text-green hover:underline">
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <Button type="button" size="lg" variant="secondary" className="w-full" onClick={google} disabled={busy !== null}>
              {busy === 'google' ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : null} Continue with Google
            </Button>
            <div className="flex items-center gap-3 text-caption text-muted"><span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" /></div>
            <form onSubmit={sendLink} className="flex flex-col gap-4">
              <Field label="Email" htmlFor="email" error={error}>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="you@example.com" className="h-14 text-lead" />
              </Field>
              <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
                {busy === 'email' ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Sending…</> : <>Email me a sign-in link <ArrowRight className="h-5 w-5" strokeWidth={1.75} /></>}
              </Button>
            </form>
          </>
        )}

        <p className="mt-2 flex items-center justify-center gap-2 text-caption text-muted">
          <WifiOff className="h-3.5 w-3.5" strokeWidth={1.5} /> Once signed in, the app works offline on your visits.
        </p>
      </div>
    </div>
  )
}
