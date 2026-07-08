'use client'

import * as React from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, ScanFace, Fingerprint, Eye, EyeOff, ShieldCheck, Smartphone, Laptop, MonitorSmartphone, LogOut, Loader2, MailCheck, RefreshCw, Clock,
} from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { SuccessState, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { haptic } from '@/lib/haptics'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup' | 'otp' | 'forgot' | 'reset' | 'devices' | 'done' | 'timeout'

const DEVICES = [
  { id: 'd1', icon: Smartphone, name: 'iPhone 15 · this device', meta: 'Hyderabad · active now', current: true },
  { id: 'd2', icon: Laptop, name: 'Chrome · Windows', meta: 'Hyderabad · 2 hours ago', current: false },
  { id: 'd3', icon: MonitorSmartphone, name: 'iPad · Safari', meta: 'Bengaluru · 3 days ago', current: false },
]

function OtpTimer({ onResend }: { onResend: () => void }) {
  const [left, setLeft] = React.useState(30)
  React.useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return left > 0 ? (
    <span className="inline-flex items-center gap-1.5 text-caption text-muted"><Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> Resend code in {left}s</span>
  ) : (
    <button type="button" onClick={() => { onResend(); setLeft(30) }} className="inline-flex items-center gap-1.5 text-caption font-semibold text-green hover:underline"><RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} /> Resend code</button>
  )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-body-sm font-medium text-ink">{label}</span>
      <input {...props} className="w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
    </label>
  )
}

function AuthFlow() {
  const toast = useToast()
  const params = useSearchParams()
  const [mode, setMode] = React.useState<Mode>(params.get('timeout') ? 'timeout' : 'login')
  const [method, setMethod] = React.useState<'phone' | 'email'>('phone')
  const [remember, setRemember] = React.useState(true)
  const [showPw, setShowPw] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  function submit(next: Mode, ms = 900) {
    setError('')
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      haptic(next === 'done' ? 'success' : 'light')
      setMode(next)
    }, ms)
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
  const Card = ({ children }: { children: React.ReactNode }) => <div className="rounded-lg border border-line bg-card p-6 shadow-sm">{children}</div>

  /* ── success / timeout full-screen states ─────────────────────────── */
  if (mode === 'done') {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory px-5">
        <div className="w-full max-w-sm">
          <SuccessState title="You’re in 💚" message="Welcome back. Everything’s ready for you." action={<Button asChild size="lg" className="w-full"><Link href="/family">Continue to Family Space</Link></Button>} />
        </div>
      </div>
    )
  }
  if (mode === 'timeout') {
    return (
      <div className="grid min-h-dvh place-items-center bg-ivory px-5">
        <div className="w-full max-w-sm">
          <ErrorState icon={Clock} title="Session expired" message="For your security we signed you out after a spell of inactivity. Please sign in again — nothing was lost." onRetry={() => setMode('login')} retryLabel="Sign in again" />
        </div>
      </div>
    )
  }

  return (
    <Shell>
      {/* Login / Signup */}
      {(mode === 'login' || mode === 'signup') && (
        <Card>
          <div className="mb-5 inline-flex w-full rounded-full border border-line p-1">
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn('flex-1 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors', mode === m ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          {mode === 'signup' && <div className="mb-3"><Field label="Your name" placeholder="Full name" autoComplete="name" /></div>}

          <div className="mb-3 inline-flex w-full rounded-full border border-line p-0.5 text-caption">
            {(['phone', 'email'] as const).map((mth) => (
              <button key={mth} type="button" onClick={() => setMethod(mth)} className={cn('flex-1 rounded-full px-3 py-1.5 font-semibold capitalize transition-colors', method === mth ? 'bg-accent-soft text-green' : 'text-muted hover:text-ink')}>{mth}</button>
            ))}
          </div>
          <Field label={method === 'phone' ? 'Phone number' : 'Email address'} type={method === 'phone' ? 'tel' : 'email'} inputMode={method === 'phone' ? 'tel' : 'email'} placeholder={method === 'phone' ? '+91 …' : 'you@email.com'} autoComplete={method === 'phone' ? 'tel' : 'email'} />

          {mode === 'login' && (
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={() => setRemember((r) => !r)} className="inline-flex items-center gap-2 text-caption text-ink">
                <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', remember ? 'bg-green' : 'bg-line')}><span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-all', remember ? 'left-[1.125rem]' : 'left-0.5')} /></span>
                Remember this device
              </button>
              <button type="button" onClick={() => setMode('forgot')} className="text-caption font-semibold text-green hover:underline">Forgot password?</button>
            </div>
          )}

          {error && <p className="mt-3 text-caption text-error">{error}</p>}

          <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={() => submit('otp')}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> One moment…</> : <>{mode === 'login' ? 'Continue' : 'Create account'} <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
          </Button>

          {mode === 'login' && (
            <>
              <div className="my-4 flex items-center gap-3 text-caption text-muted"><span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" /></div>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => { haptic('success'); toast('Verified with Face ID.'); setMode('done') }} className="flex min-h-[2.75rem] items-center justify-center gap-2 rounded-sm border border-ink/15 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><ScanFace className="h-4 w-4 text-green" strokeWidth={1.75} /> Face ID</button>
                <button type="button" onClick={() => { haptic('success'); toast('Verified with fingerprint.'); setMode('done') }} className="flex min-h-[2.75rem] items-center justify-center gap-2 rounded-sm border border-ink/15 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><Fingerprint className="h-4 w-4 text-green" strokeWidth={1.75} /> Fingerprint</button>
              </div>
              <button type="button" onClick={() => setMode('devices')} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} /> Manage devices &amp; sessions</button>
            </>
          )}
        </Card>
      )}

      {/* OTP */}
      {mode === 'otp' && (
        <Card>
          <button type="button" onClick={() => setMode('login')} className="mb-3 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back</button>
          <h1 className="text-h3 text-ink">Verify it’s you</h1>
          <p className="mt-1.5 text-body-sm text-muted">We sent a 6-digit code to your {method}. Enter it below.</p>
          <input inputMode="numeric" maxLength={6} placeholder="••••••" autoComplete="one-time-code" className="mt-5 w-full rounded-sm border border-line bg-ivory px-4 py-3 text-center text-h3 tracking-[0.5em] text-ink placeholder:tracking-[0.5em] placeholder:text-muted/40 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
          <div className="mt-3"><OtpTimer onResend={() => toast('A new code is on its way.')} /></div>
          <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={() => submit('done')}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Verifying…</> : 'Verify & continue'}
          </Button>
        </Card>
      )}

      {/* Forgot */}
      {mode === 'forgot' && (
        <Card>
          <button type="button" onClick={() => setMode('login')} className="mb-3 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back</button>
          <h1 className="text-h3 text-ink">Reset your password</h1>
          <p className="mt-1.5 text-body-sm text-muted">Enter your email and we’ll send a secure reset link.</p>
          <div className="mt-5"><Field label="Email address" type="email" placeholder="you@email.com" autoComplete="email" /></div>
          <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={() => submit('reset', 1000)}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Sending…</> : <><MailCheck className="h-5 w-5" strokeWidth={1.75} /> Send reset link</>}
          </Button>
        </Card>
      )}

      {/* Reset */}
      {mode === 'reset' && (
        <Card>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-caption font-semibold text-success"><MailCheck className="h-3.5 w-3.5" strokeWidth={2} /> Link verified</p>
          <h1 className="text-h3 text-ink">Choose a new password</h1>
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-body-sm font-medium text-ink">New password</span>
              <span className="relative block">
                <input type={showPw ? 'text' : 'password'} placeholder="At least 8 characters" autoComplete="new-password" className="w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 pr-11 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
                <button type="button" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide' : 'Show'} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink">{showPw ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}</button>
              </span>
            </label>
            <Field label="Confirm password" type={showPw ? 'text' : 'password'} placeholder="Re-enter password" autoComplete="new-password" />
          </div>
          <Button size="lg" className="mt-5 w-full" disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); haptic('success'); toast('Password updated.'); setMode('login') }, 900) }}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : 'Reset password'}
          </Button>
        </Card>
      )}

      {/* Device management */}
      {mode === 'devices' && (
        <Card>
          <button type="button" onClick={() => setMode('login')} className="mb-3 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back</button>
          <h1 className="text-h3 text-ink">Devices &amp; sessions</h1>
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/[0.06] p-3 text-caption text-warning">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} /> New sign-in detected from Chrome · Windows. If this wasn’t you, sign it out.
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {DEVICES.map((d) => {
              const Icon = d.icon
              return (
                <li key={d.id} className="flex items-center gap-3 rounded-md border border-line bg-ivory px-3.5 py-2.5">
                  <Icon className="h-5 w-5 shrink-0 text-green" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-medium text-ink">{d.name}</span><span className="block text-caption text-muted">{d.meta}</span></span>
                  {d.current ? <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-success">This device</span> : <button type="button" onClick={() => toast('Signed out that device.')} className="shrink-0 text-caption font-semibold text-error hover:underline">Sign out</button>}
                </li>
              )
            })}
          </ul>
          <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => toast('Signed out all other devices.')}>Sign out all other devices</Button>
          <button type="button" onClick={() => { haptic('warning'); toast('You’ve been logged out.') }} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-caption font-semibold text-error hover:underline"><LogOut className="h-3.5 w-3.5" strokeWidth={1.75} /> Log out of Close Eye</button>
        </Card>
      )}
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
