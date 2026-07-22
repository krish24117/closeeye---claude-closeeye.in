'use client'

import * as React from 'react'
import Link from 'next/link'
import { MapPin, ArrowRight, ArrowLeft, Loader2, Check, MessageCircle } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { setFounderSessionHint } from '@/lib/founder-funnel'
import { submitFounderWaitlist } from '@/lib/db/founder'
import { FOUNDER_LAUNCH_LABEL } from '@/lib/launch'
import { whatsappLink } from '@/lib/site'
import { FOUNDER } from '@/lib/content'

type Mode = 'choose' | 'form' | 'done'

const inputCls =
  'w-full rounded-sm border border-line bg-ivory px-3.5 py-3 text-body text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

// Lenient so NRI numbers pass: 10–15 digits, bare or with a country code.
const validPhone = (p: string) => { const d = p.replace(/\D/g, ''); return d.length >= 10 && d.length <= 15 }
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

/**
 * Lead capture — the low-friction top of the founder funnel. Anyone who reaches
 * out becomes a lead in /admin/leads with NO account, NO payment: just a name +
 * WhatsApp number (email optional; city only when they're outside Hyderabad).
 * Reserving a full place (account + plan) stays a deliberate, secondary step.
 */
export default function FounderInterestPage() {
  const [mode, setMode] = React.useState<Mode>('choose')
  const [inHyd, setInHyd] = React.useState(true)
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [city, setCity] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [saveFailed, setSaveFailed] = React.useState(false)

  // Keep the pre-launch gate armed for this founder visitor.
  React.useEffect(() => { setFounderSessionHint() }, [])

  function choose(hyd: boolean) { setInHyd(hyd); setError(''); setSaveFailed(false); setMode('form') }

  async function submit() {
    if (!name.trim()) { setError('Please tell us your name.'); return }
    if (!validPhone(phone)) { setError('Please enter a valid WhatsApp number.'); return }
    if (!inHyd && !city.trim()) { setError('Please tell us which city your loved one is in.'); return }
    if (email.trim() && !validEmail(email)) { setError('That email address doesn’t look right.'); return }
    setError(''); setSaveFailed(false); setBusy(true)
    const { error: e } = await submitFounderWaitlist({ name, phone, email, city: inHyd ? 'Hyderabad' : city })
    setBusy(false)
    if (e) { console.error('[founder/interest] insert failed:', e); setSaveFailed(true); return }
    setMode('done')
  }

  const firstName = name.trim().split(/\s+/)[0] || 'friend'

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-md items-center gap-2 px-5 pt-6">
        <Logo variant="mobile" />
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-green">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} /> Serving Hyderabad
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        {mode === 'choose' && (
          <div className="ce-fade-in flex flex-1 flex-col">
            <h1 className="font-display text-h2 text-ink">Where is your loved one?</h1>
            <p className="mt-2 text-body text-muted">
              We’re opening in Hyderabad first — one city, done genuinely well. Tell us where your loved one is and we’ll take it from there.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button type="button" onClick={() => choose(true)} className="group flex items-center justify-between gap-3 rounded-lg border-2 border-green bg-accent-soft/40 px-5 py-4 text-left transition-colors hover:bg-accent-soft/70">
                <span>
                  <span className="block text-body font-bold text-ink">In Hyderabad</span>
                  <span className="block text-caption text-muted">Perfect — leave your details and we’ll reach out</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-green transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </button>
              <button type="button" onClick={() => choose(false)} className="flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-card px-5 py-4 text-left transition-colors hover:border-ink/20">
                <span>
                  <span className="block text-body font-bold text-ink">Another city</span>
                  <span className="block text-caption text-muted">We’ll tell you the moment we reach you</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1" />
            <p className="mt-8 text-caption text-muted">Free to register. Nothing is charged before {FOUNDER_LAUNCH_LABEL}.</p>
          </div>
        )}

        {mode === 'form' && (
          <div className="ce-fade-in flex flex-1 flex-col">
            <button type="button" onClick={() => { setMode('choose'); setError(''); setSaveFailed(false) }} className="mb-3 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back
            </button>
            <h1 className="font-display text-h2 text-ink">{inHyd ? 'Leave your details' : 'We’re not in your city yet'}</h1>
            <p className="mt-2 text-body text-muted">
              {inHyd
                ? <>Just your name and WhatsApp number — {FOUNDER.name} will reach out to you personally. No account, no payment.</>
                : <>Leave your details and we’ll let you know the moment Close Eye reaches your loved one’s city. No payment, no commitment.</>}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className={inputCls} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number" type="tel" inputMode="tel" autoComplete="tel" className={inputCls} />
              {!inHyd && <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Which city is your loved one in?" autoComplete="address-level2" className={inputCls} />}
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" inputMode="email" autoComplete="email" className={inputCls} />
            </div>
            {error && <p className="mt-3 text-caption text-error">{error}</p>}
            {saveFailed && (
              <div className="mt-4 rounded-sm border border-line bg-card p-4">
                <p className="text-caption text-muted">We couldn’t save that just now. Please message {FOUNDER.name} directly and we’ll add you ourselves.</p>
                <Button asChild variant="secondary" size="sm" className="mt-3">
                  <a href={whatsappLink(`Hi ${FOUNDER.name}, I’d like to join Close Eye${inHyd ? '' : ` — my parents are in ${city || 'another city'}`}.`)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Message {FOUNDER.name} on WhatsApp
                  </a>
                </Button>
              </div>
            )}
            <Button size="lg" className="mt-6 w-full" disabled={busy} onClick={submit}>
              {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Just a moment…</> : saveFailed ? <>Try again <ArrowRight className="h-5 w-5" strokeWidth={2} /></> : <>{inHyd ? 'Count me in' : 'Join the waitlist'} <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
            </Button>
            <p className="mt-4 text-caption text-muted">No account needed. We’ll only use this to reach you personally.</p>
          </div>
        )}

        {mode === 'done' && (
          <div className="ce-fade-in grid flex-1 place-items-center">
            <div className="flex flex-col items-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-success/12 text-success"><Check className="h-8 w-8" strokeWidth={2.5} /></span>
              <h1 className="font-display mt-6 text-h2 text-ink">{inHyd ? 'You’re in' : 'You’re on the list'}</h1>
              <p className="mt-3 max-w-sm text-body leading-relaxed text-muted">
                {inHyd
                  ? <>Thank you, {firstName}. {FOUNDER.name} will message you personally on WhatsApp very soon — no rush, and nothing to pay.</>
                  : <>Thank you. We’ll personally let you know the moment Close Eye is ready in {city.trim() || 'your city'}.</>}
              </p>
              <Button asChild size="md" className="mt-7">
                <a href={whatsappLink(`Hi ${FOUNDER.name}, I just registered my interest in Close Eye${inHyd ? '' : ` for ${city || 'my city'}`}.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Say hello to {FOUNDER.name}
                </a>
              </Button>
              {inHyd && (
                <Link href="/auth?intent=founding" className="mt-4 inline-flex items-center gap-1 text-body-sm font-semibold text-green transition-colors hover:text-ink">
                  Or reserve your family’s place now <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
