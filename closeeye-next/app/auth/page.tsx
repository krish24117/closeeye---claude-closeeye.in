'use client'

import * as React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2, Clock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/states'
import { FunnelSteps } from '@/components/funnel/funnel-steps'
import { isSupabaseConfigured } from '@/lib/supabase'
import { signInWithGoogle, signUpWithPassword, signInWithPassword } from '@/lib/auth-actions'
import { planById } from '@/lib/plans'
import { setPendingPlan } from '@/lib/membership-intent'
import { hasFounderSessionHint } from '@/lib/founder-funnel'
import { isNative } from '@/lib/native'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
type Pending = null | 'google' | 'email'
type Mode = 'signin' | 'signup'

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

/**
 * The centred card frame shared by every auth state. Defined at MODULE scope on
 * purpose: a component declared inside AuthFlow would be a new function identity
 * on every render, so each keystroke would remount the inputs — dropping focus
 * and dismissing the mobile keyboard after every character.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
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
}

function AuthFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const native = isNative()
  const [mode, setMode] = React.useState<Mode>('signin')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [showPw, setShowPw] = React.useState(false)
  const [pending, setPending] = React.useState<Pending>(null)
  const [error, setError] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const busy = pending !== null

  // Membership join intent — arrived from /membership (with a plan) or the founder
  // funnel. New customers start on "create account"; persist any chosen plan so it
  // survives the round-trip.
  const joinIntent = params.get('intent') === 'join'
  const foundingIntent = params.get('intent') === 'founding'
  const joinPlanId = joinIntent ? params.get('plan') : null
  const joinPlan = joinPlanId ? planById(joinPlanId) : null
  React.useEffect(() => {
    if (joinPlan) setPendingPlan(joinPlan.id)
  }, [joinPlanId]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    // New customers create an account. Founder-funnel visitors default to signup
    // even if the ?intent flag was lost (e.g. a reload) — the durable session hint
    // (set on the landing / service-area step) carries the context so they never
    // land on the "Sign in" screen by mistake.
    if (joinIntent || foundingIntent || hasFounderSessionHint()) setMode('signup')
  }, [joinIntent, foundingIntent])

  // A returning sign-in (Google, or an older email link) lands with `?code=…`; the
  // Supabase client exchanges it, so show a "signing you in" state while the auth
  // gate routes on to the dashboard.
  const returning = params.get('code') !== null || params.get('token_hash') !== null
  const [stuck, setStuck] = React.useState(false)
  React.useEffect(() => {
    if (!returning) return
    const t = setTimeout(() => setStuck(true), 9000)
    return () => clearTimeout(t)
  }, [returning])

  const inputCls =
    'w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

  async function google() {
    setError('')
    setNotice('')
    setPending('google')
    const { error: err } = await signInWithGoogle()
    if (err) {
      setPending(null)
      setError(err)
      return
    }
    // Web redirects away (spinner rides through the redirect). Native has opened
    // the system browser, so stop the spinner and wait for the deep link.
    if (native) setPending(null)
  }

  function toggleMode() {
    setMode((m) => (m === 'signup' ? 'signin' : 'signup'))
    setError('')
    setNotice('')
    setConfirm('')
  }

  async function submit() {
    setError('')
    setNotice('')
    if (!isEmail(email)) return setError('Please enter a valid email address.')
    if (password.length < 8) return setError('Please use a password with at least 8 characters.')
    if (mode === 'signup' && password !== confirm) return setError('Those passwords don’t match.')
    if (!isSupabaseConfigured) return setError('Sign-in is temporarily unavailable. Please try again shortly.')

    setPending('email')
    if (mode === 'signup') {
      const { error: err, session } = await signUpWithPassword(email, password)
      setPending(null)
      if (err) return setError(err)
      haptic('success')
      if (session) {
        // Account created and signed in — the auth gate routes on from here.
        router.replace('/family')
        return
      }
      // No session → Supabase "Confirm email" is ON. Ask them to confirm + sign in.
      setMode('signin')
      setPassword('')
      setConfirm('')
      setNotice('Account created. Please confirm your email, then sign in below.')
    } else {
      const { error: err } = await signInWithPassword(email, password)
      setPending(null)
      if (err) return setError(err)
      haptic('success')
      router.replace('/family')
    }
  }

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
          <ErrorState icon={Clock} title="Couldn’t finish signing in" message="Your sign-in may have expired, or it was opened in a different browser than the one that started it. Please try again on the same device." onRetry={() => router.replace('/auth')} retryLabel="Try again" />
        ) : (
          <div className="flex flex-col items-center rounded-lg border border-line bg-card p-8 text-center shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-green" strokeWidth={2} />
            <p className="mt-4 text-body-sm font-medium text-ink">Signing you in…</p>
            <p className="mt-1 text-caption text-muted">Just a moment while we open your space.</p>
          </div>
        )}
      </Shell>
    )
  }

  const signup = mode === 'signup'
  const heading = signup
    ? joinPlan
      ? { eyebrow: `${joinPlan.name} · ${joinPlan.price}${joinPlan.period}`, title: `Create your account to activate ${joinPlan.name}`, sub: 'One quick step — then set up your family and activate your membership.' }
      : foundingIntent
      ? { eyebrow: null, title: 'Create your account', sub: 'One quick step — then choose your membership. Nothing to pay today.' }
      : { eyebrow: null, title: 'Create your Close Eye account', sub: 'It only takes a moment.' }
    : { eyebrow: null, title: 'Sign in to Close Eye', sub: 'Welcome back.' }

  return (
    <Shell>
      {joinPlan && <div className="mb-5"><FunnelSteps step={2} /></div>}
      <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
        {heading.eyebrow && <p className="text-caption font-semibold uppercase tracking-widest text-green">{heading.eyebrow}</p>}
        <h1 className={cn('text-h3 text-ink', heading.eyebrow && 'mt-1.5')}>{heading.title}</h1>
        <p className="mt-1.5 text-body-sm text-muted">{heading.sub}</p>

        {/* Primary: Google — no password to remember, works on app + web. */}
        <button type="button" disabled={busy} onClick={google} className="mt-5 flex min-h-[3rem] w-full items-center justify-center gap-2.5 rounded-sm border border-ink/15 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] disabled:opacity-60">
          {pending === 'google' ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Connecting to Google…</> : <><GoogleG /> Continue with Google</>}
        </button>

        <div className="my-4 flex items-center gap-3 text-caption text-muted"><span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" /></div>

        <label className="block">
          <span className="mb-1.5 block text-body-sm font-medium text-ink">Email address</span>
          <input type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-body-sm font-medium text-ink">Password</span>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete={signup ? 'new-password' : 'current-password'}
              placeholder={signup ? 'At least 8 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !signup && submit()}
              className={cn(inputCls, 'pr-10')}
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-ink">
              {showPw ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </div>
        </label>

        {signup && (
          <label className="mt-3 block">
            <span className="mb-1.5 block text-body-sm font-medium text-ink">Confirm password</span>
            <input type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className={inputCls} />
          </label>
        )}

        {notice && (
          <p className="mt-3 flex items-start gap-2 text-caption text-green"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {notice}</p>
        )}
        {error && <p className="mt-3 text-caption text-error">{error}</p>}

        <Button size="lg" className="mt-4 w-full" disabled={busy} onClick={submit}>
          {pending === 'email' ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> {signup ? 'Creating your account…' : 'Signing you in…'}</> : <>{signup ? 'Create account' : 'Sign in'} <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
        </Button>

        <p className="mt-4 text-center text-caption text-muted">
          {signup ? 'Already have an account?' : 'New to Close Eye?'}{' '}
          <button type="button" onClick={toggleMode} className="font-semibold text-green hover:underline">
            {signup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
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
