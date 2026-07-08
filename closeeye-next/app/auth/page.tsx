'use client'

import * as React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, MailCheck, RefreshCw, Clock } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/states'
import { isSupabaseConfigured } from '@/lib/supabase'
import { signInWithGoogle, sendMagicLink } from '@/lib/auth-actions'
import { haptic } from '@/lib/haptics'

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

/** The Google mark for the "Continue with Google" button. */
function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

/** Resend countdown; resets each time a link is (re)sent. */
function Resend({ seedKey, onResend }: { seedKey: number; onResend: () => void }) {
  const [left, setLeft] = React.useState(30)
  React.useEffect(() => setLeft(30), [seedKey])
  React.useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return left > 0 ? (
    <span className="inline-flex items-center gap-1.5 text-caption text-muted"><Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> Resend link in {left}s</span>
  ) : (
    <button type="button" onClick={onResend} className="inline-flex items-center gap-1.5 text-caption font-semibold text-green hover:underline"><RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} /> Resend link</button>
  )
}

function AuthFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const [stage, setStage] = React.useState<'signin' | 'sent'>('signin')
  const [email, setEmail] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [sentAt, setSentAt] = React.useState(0)

  // A magic link returning on the web lands here with `?code=…`; the Supabase
  // client exchanges it automatically, so show a "signing you in" state (not the
  // form) while the auth gate routes on to the dashboard.
  const returning = params.get('code') !== null || params.get('token_hash') !== null
  const [stuck, setStuck] = React.useState(false)

  // If the exchange succeeds the gate navigates away in well under a second. If
  // it hasn't after ~9s the link was opened in a different browser (no PKCE
  // verifier) or has expired — surface a retry instead of spinning forever.
  React.useEffect(() => {
    if (!returning) return
    const t = setTimeout(() => setStuck(true), 9000)
    return () => clearTimeout(t)
  }, [returning])

  const inputCls =
    'w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

  async function sendLink(resend = false) {
    setError('')
    if (!isEmail(email)) return setError('Please enter a valid email address.')
    if (!isSupabaseConfigured) return setError('Sign-in is temporarily unavailable. Please try again shortly.')
    setBusy(true)
    const { error: err } = await sendMagicLink(email)
    setBusy(false)
    if (err) return setError(err)
    haptic('light')
    setSentAt(Date.now())
    if (!resend) setStage('sent')
  }

  async function google() {
    setError('')
    setBusy(true)
    const { error: err } = await signInWithGoogle()
    // Web redirects away; native opens the system browser and returns via deep
    // link. Only surface an error (otherwise the flow continues elsewhere).
    if (err) {
      setBusy(false)
      setError(err)
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="grid min-h-dvh place-items-center bg-ivory px-5 py-10">
      <div className="ce-fade-in w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-11 w-11" />
          <p className="mt-3 text-[1.5rem] font-extrabold lowercase leading-none tracking-[-0.02em] text-ink">close eye</p>
        </div>
        {children}
        <p className="mt-6 text-center text-caption text-muted">
          By continuing you agree to our <Link href="/terms" className="font-semibold text-green hover:underline">Terms</Link> &amp; <Link href="/privacy" className="font-semibold text-green hover:underline">Privacy</Link>.
        </p>
      </div>
    </div>
  )

  if (params.get('timeout') === '1') {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory px-5">
        <div className="w-full max-w-sm">
          <ErrorState icon={Clock} title="Session expired" message="For your security we signed you out after a spell of inactivity. Please sign in again — nothing was lost." onRetry={() => router.replace('/auth')} retryLabel="Sign in again" />
        </div>
      </div>
    )
  }

  if (returning) {
    return (
      <Shell>
        {stuck ? (
          <ErrorState icon={Clock} title="Couldn’t finish signing in" message="Your sign-in link may have expired, or it was opened in a different browser than the one that requested it. Please request a fresh link and open it on the same device." onRetry={() => router.replace('/auth')} retryLabel="Try again" />
        ) : (
          <div className="flex flex-col items-center rounded-lg border border-line bg-card p-8 text-center shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-green" strokeWidth={2} />
            <p className="mt-4 text-body-sm font-medium text-ink">Signing you in…</p>
            <p className="mt-1 text-caption text-muted">Just a moment while we open your family space.</p>
          </div>
        )}
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
        {stage === 'signin' ? (
          <>
            <h1 className="text-h3 text-ink">Sign in to Close Eye</h1>
            <p className="mt-1.5 text-body-sm text-muted">New here? Signing in creates your account.</p>

            {/* Primary: Google — no email needed, works on the app and the web. */}
            <button type="button" disabled={busy} onClick={google} className="mt-5 flex min-h-[3rem] w-full items-center justify-center gap-2.5 rounded-sm border border-ink/15 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] disabled:opacity-60">
              <GoogleG /> Continue with Google
            </button>

            <div className="my-4 flex items-center gap-3 text-caption text-muted"><span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" /></div>

            {/* Fallback: email sign-in link (default Supabase email, no code). */}
            <label className="block">
              <span className="mb-1.5 block text-body-sm font-medium text-ink">Email address</span>
              <input
                type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendLink()}
                className={inputCls}
              />
            </label>
            {error && <p className="mt-3 text-caption text-error">{error}</p>}
            <Button size="lg" className="mt-4 w-full" disabled={busy} onClick={() => sendLink()}>
              {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Sending link…</> : <>Email me a sign-in link <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
            </Button>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green/10 text-green"><MailCheck className="h-6 w-6" strokeWidth={1.75} /></div>
            <h1 className="mt-4 text-h3 text-ink">Check your email</h1>
            <p className="mt-1.5 text-body-sm text-muted">We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Open it <span className="font-medium text-ink">on this device</span> to finish signing in.</p>
            <div className="mt-4 flex justify-center"><Resend seedKey={sentAt} onResend={() => sendLink(true)} /></div>
            {error && <p className="mt-3 text-caption text-error">{error}</p>}
            <button type="button" onClick={() => { setStage('signin'); setError('') }} className="mt-5 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Use a different email</button>
          </div>
        )}
      </div>
    </Shell>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-ivory" />}>
      <AuthFlow />
    </Suspense>
  )
}
