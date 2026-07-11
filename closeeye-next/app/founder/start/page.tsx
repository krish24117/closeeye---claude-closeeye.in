'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, ArrowRight, ArrowLeft, Loader2, Check, MessageCircle } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { FounderSteps } from '@/components/founder/founder-steps'
import { setFounderSessionHint, getFounderRef } from '@/lib/founder-funnel'
import { submitFounderWaitlist } from '@/lib/db/founder'
import { founderWaitlistError } from '@/lib/founder-journey'
import { FOUNDER_LAUNCH_LABEL } from '@/lib/launch'
import { whatsappLink } from '@/lib/site'
import { FOUNDER } from '@/lib/content'

type Mode = 'choose' | 'form' | 'done'

const inputCls =
  'w-full rounded-sm border border-line bg-ivory px-3.5 py-3 text-body text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

export default function FounderServiceAreaPage() {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>('choose')
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [city, setCity] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const [saveFailed, setSaveFailed] = React.useState(false)

  // Confirm this is a founder-funnel visitor so the pre-launch gate applies even
  // if they reached this step directly (the landing normally sets it first).
  React.useEffect(() => { setFounderSessionHint() }, [])

  function inHyderabad() {
    // A Hyderabad family continues into account creation; the gate routes them on
    // to the founder Welcome once signed in.
    router.push('/auth?intent=founding')
  }

  async function submitWaitlist() {
    const msg = founderWaitlistError({ name, email, phone, city })
    if (msg) { setError(msg); return }
    setError(''); setSaveFailed(false); setBusy(true)
    const { error: e } = await submitFounderWaitlist({ name, email, phone, city })
    setBusy(false)
    if (e) {
      // Never lose the lead silently — offer the founder's WhatsApp as a fallback.
      console.error('[founder/waitlist] insert failed:', e)
      setSaveFailed(true)
      return
    }
    setMode('done')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-md items-center gap-2 px-5 pt-6">
        <LogoMark className="h-8 w-8" />
        <span className="text-body-sm font-semibold tracking-tight text-ink">Close Eye</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-green">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} /> Serving Hyderabad
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        {mode !== 'done' && <div className="mb-8"><FounderSteps step={1} /></div>}

        {mode === 'choose' && (
          <div className="ce-fade-in flex flex-1 flex-col">
            <h1 className="text-h2 text-ink">Where is your loved one currently located?</h1>
            <p className="mt-2 text-body text-muted">
              We’re opening in Hyderabad first — one city, done genuinely well. This helps us make sure we can truly be there for your family.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={inHyderabad}
                className="group flex items-center justify-between gap-3 rounded-lg border-2 border-green bg-accent-soft/40 px-5 py-4 text-left transition-colors hover:bg-accent-soft/70"
              >
                <span>
                  <span className="block text-body font-bold text-ink">In Hyderabad</span>
                  <span className="block text-caption text-muted">Continue and reserve your family’s place</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-green transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => { setMode('form'); setError('') }}
                className="flex items-center justify-between gap-3 rounded-lg border-2 border-line bg-card px-5 py-4 text-left transition-colors hover:border-ink/20"
              >
                <span>
                  <span className="block text-body font-bold text-ink">Another city</span>
                  <span className="block text-caption text-muted">Join the waitlist — we’ll tell you when we reach you</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1" />
            <p className="mt-8 text-center text-caption text-muted">Registering is free. Nothing is charged before {FOUNDER_LAUNCH_LABEL}.</p>
          </div>
        )}

        {mode === 'form' && (
          <div className="ce-fade-in flex flex-1 flex-col">
            <button type="button" onClick={() => { setMode('choose'); setError(''); setSaveFailed(false) }} className="mb-3 inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back
            </button>
            <h1 className="text-h2 text-ink">We’re not in your city yet</h1>
            <p className="mt-2 text-body text-muted">
              Leave your details and we’ll let you know the moment Close Eye reaches your loved one’s city. No payment, no commitment.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" className={inputCls} />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Which city is your loved one in?" autoComplete="address-level2" className={inputCls} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" inputMode="email" autoComplete="email" className={inputCls} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number (optional)" type="tel" inputMode="tel" autoComplete="tel" className={inputCls} />
            </div>
            {error && <p className="mt-3 text-caption text-error">{error}</p>}
            {saveFailed && (
              <div className="mt-4 rounded-sm border border-line bg-card p-4">
                <p className="text-caption text-muted">We couldn’t save that just now. Please message {FOUNDER.name} directly and we’ll add you ourselves.</p>
                <Button asChild variant="secondary" size="sm" className="mt-3">
                  <a href={whatsappLink(`Hi ${FOUNDER.name}, I’d like to join the Close Eye waitlist for ${city || 'my city'}.`)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Message {FOUNDER.name} on WhatsApp
                  </a>
                </Button>
              </div>
            )}
            <Button size="lg" className="mt-6 w-full" disabled={busy} onClick={submitWaitlist}>
              {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Adding you…</> : saveFailed ? <>Try again <ArrowRight className="h-5 w-5" strokeWidth={2} /></> : <>Join the waitlist <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
            </Button>
          </div>
        )}

        {mode === 'done' && (
          <div className="ce-fade-in grid flex-1 place-items-center">
            <div className="flex flex-col items-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-success/12 text-success"><Check className="h-8 w-8" strokeWidth={2.5} /></span>
              <h1 className="mt-6 text-h2 text-ink">You’re on the list</h1>
              <p className="mt-3 max-w-sm text-body leading-relaxed text-muted">
                Thank you. We’ll personally let you know the moment Close Eye is ready in {city.trim() || 'your city'}. In the meantime, you’re welcome to message {FOUNDER.name} any time.
              </p>
              <Button asChild variant="secondary" size="md" className="mt-7">
                <a href={whatsappLink(`Hi ${FOUNDER.name}, I just joined the Close Eye waitlist.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Message {FOUNDER.name}
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
