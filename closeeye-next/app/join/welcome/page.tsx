'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Calendar, CreditCard, HeartHandshake } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { FounderSteps } from '@/components/founder/founder-steps'
import { useAuth } from '@/components/auth/auth-provider'
import { saveFounderName } from '@/lib/db/founder'
import { FOUNDER_LAUNCH_LABEL } from '@/lib/launch'
import { cn } from '@/lib/utils'

const inputCls =
  'w-full rounded-sm border border-line bg-ivory px-3.5 py-3 text-body text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

const RELATIONSHIPS = ['My parents', 'My mother', 'My father', 'My spouse', 'Someone else'] as const

/** Mobile is required to register a founding family — we need a way to reach them.
 *  Lenient on format so NRI numbers pass: 10–15 digits, bare or with a country code. */
function isValidPhone(p: string): boolean {
  const digits = p.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export default function FounderWelcomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const metaName = ((user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || '').trim()
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [relationship, setRelationship] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  // Self-guard: this step needs an account. If the visitor isn't signed in
  // (e.g. deep-linked here), send them to create one first.
  React.useEffect(() => {
    if (!loading && !user) router.replace('/auth?intent=founding')
  }, [loading, user, router])

  React.useEffect(() => { if (metaName) setName((n) => n || metaName) }, [metaName])

  async function next() {
    if (busy || !user || name.trim().length < 2 || !isValidPhone(phone)) return
    setBusy(true)
    // Save name + contact (mobile required) — onboarding is marked complete later, at the end.
    await saveFounderName(user.id, { fullName: name, phone, relationship })
    router.push('/join/membership')
  }

  if (loading || !user) {
    return <div className="grid min-h-dvh place-items-center bg-ivory"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  const STEPS = [
    { icon: CreditCard, text: 'Choose your membership now — there’s nothing to pay today.' },
    { icon: Calendar, text: `We open in Hyderabad on ${FOUNDER_LAUNCH_LABEL}.` },
    { icon: HeartHandshake, text: 'We activate your membership and arrange your first Presence Visit.' },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-md items-center gap-2 px-5 pt-6">
        <Logo variant="mobile" />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <div className="mb-8"><FounderSteps step={3} /></div>

        <div className="ce-fade-in flex flex-1 flex-col">
          <span className="text-caption font-semibold uppercase tracking-widest text-green">You’re in</span>
          <h1 className="mt-2 text-h2 text-ink">Welcome to Close Eye</h1>
          <p className="mt-2 text-body leading-relaxed text-muted">
            You’re one of the first families joining us in Hyderabad. Here’s what happens next — and there’s nothing to pay today.
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            {STEPS.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <span className="text-body-sm leading-relaxed text-ink">{text}</span>
              </li>
            ))}
          </ul>

          <label className="mt-8 block">
            <span className="mb-1.5 block text-body-sm font-medium text-ink">What should we call you?</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="Your name" autoComplete="name" className={inputCls} />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-body-sm font-medium text-ink">Mobile number</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="+91 90000 00000" type="tel" inputMode="tel" autoComplete="tel" className={inputCls} />
            <span className="mt-1.5 block text-caption text-muted">So we can reach you about your first Presence Visit.{phone.trim() && !isValidPhone(phone) ? <span className="text-warning"> Please enter a valid mobile number.</span> : ''}</span>
          </label>

          <div className="mt-4">
            <span className="mb-2 block text-body-sm font-medium text-ink">Who are you registering for? <span className="font-normal text-muted">(optional)</span></span>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => (
                <button key={r} type="button" onClick={() => setRelationship((cur) => (cur === r ? '' : r))} className={cn('rounded-full border px-3.5 py-1.5 text-body-sm transition-colors', relationship === r ? 'border-green bg-accent-soft/50 font-semibold text-green' : 'border-line text-muted hover:border-ink/20')}>{r}</button>
              ))}
            </div>
          </div>

          <div className="flex-1" />
          <Button size="lg" className={cn('mt-8 w-full')} disabled={busy || name.trim().length < 2 || !isValidPhone(phone)} onClick={next}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> One moment…</> : <>Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
          </Button>
        </div>
      </main>
    </div>
  )
}
