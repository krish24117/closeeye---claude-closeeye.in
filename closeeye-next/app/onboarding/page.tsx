'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { saveProfileBasics, selectPlan } from '@/lib/db/onboarding'
import { PLANS, PROTECT_OPTIONS, type PlanId } from '@/lib/plans'
import { getPendingPlan, setPendingPlan } from '@/lib/membership-intent'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'

type StepId = 'name' | 'phone' | 'city' | 'who' | 'plan'
const STEPS: StepId[] = ['name', 'phone', 'city', 'who', 'plan']

/**
 * Production onboarding — the guided setup a signed-in user completes once.
 * Collects name + mobile (profiles), city + who they're protecting (creates the
 * first loved_ones row), and a membership plan (subscriptions). On finish it
 * provisions the family space and opens the populated dashboard.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshOnboarding } = useAuth()
  const { addLovedOne, refresh } = useFamilyData()

  const metaName = ((user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || '').trim()
  const [step, setStep] = React.useState(0)
  const [name, setName] = React.useState(metaName)
  const [phone, setPhone] = React.useState('')
  const [city, setCity] = React.useState('')
  const [protect, setProtect] = React.useState<string | null>(null)
  const [lovedName, setLovedName] = React.useState('')
  const [plan, setPlan] = React.useState<PlanId | null>(null)
  const [hasIntent, setHasIntent] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (metaName && !name) setName(metaName)
  }, [metaName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carried membership intent — the visitor chose a plan on /membership before
  // signing up. Pre-select it so onboarding CONFIRMS the choice rather than
  // re-asking, and route to Activate (not the dashboard) at the end.
  React.useEffect(() => {
    const pending = getPendingPlan()
    if (pending) { setPlan(pending); setHasIntent(true) }
  }, [])

  const id = STEPS[step]!
  const isSelf = protect === 'Self'
  const back = () => { setError(''); setStep((s) => Math.max(0, s - 1)) }

  const canAdvance = (() => {
    switch (id) {
      case 'name': return name.trim().length >= 2
      case 'phone': return phone.replace(/\D/g, '').length >= 8
      case 'city': return city.trim().length >= 2
      case 'who': return Boolean(protect) && (isSelf || lovedName.trim().length >= 2)
      case 'plan': return Boolean(plan)
    }
  })()

  async function next() {
    setError('')
    if (!canAdvance) return
    haptic('light')
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }
    await finish()
  }

  async function finish() {
    if (!user) return setError('You’re not signed in. Please sign in again.')
    setBusy(true)
    setError('')
    try {
      const nameOfLovedOne = isSelf ? name.trim() : lovedName.trim()
      // 1. Profile basics (name + mobile) and mark onboarding complete.
      const p = await saveProfileBasics(user.id, { fullName: name, phone })
      if (p.error) throw new Error(p.error)
      // 2. Create the first loved one (provisions the family space).
      await addLovedOne({ full_name: nameOfLovedOne, relationship: protect ?? 'Family', city })
      // 3. Store the chosen plan (no charge; pay later via Razorpay).
      if (plan) {
        const s = await selectPlan(user.id, plan)
        if (s.error) throw new Error(s.error)
      }
      await refreshOnboarding()
      await refresh()
      haptic('success')
      // Arrived via the membership funnel → continue to Activate (payment), keeping
      // the pending plan in sync with the final choice. Otherwise, open the dashboard.
      if (hasIntent && plan) {
        setPendingPlan(plan)
        router.replace('/family/membership?activate=1')
      } else {
        router.replace('/family')
      }
    } catch (e) {
      // Keep raw Postgres/Supabase errors out of the UI; log for debugging.
      console.error('[onboarding] setup failed:', e)
      setBusy(false)
      setError('We couldn’t finish setting up your family space. Please try again.')
    }
  }

  const inputCls =
    'w-full rounded-sm border border-line bg-ivory px-3.5 py-3 text-body text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      {/* Header + progress */}
      <header className="mx-auto w-full max-w-md px-5 pt-6">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button type="button" onClick={back} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-ink/[0.05]"><ArrowLeft className="h-5 w-5" strokeWidth={1.75} /></button>
          ) : (
            <LogoMark variant="mobile" />
          )}
          <div className="flex flex-1 items-center gap-1.5">
            {STEPS.map((_, n) => (
              <span key={n} className={cn('h-1.5 flex-1 rounded-full transition-colors', n <= step ? 'bg-green' : 'bg-line')} />
            ))}
          </div>
          <span className="text-caption font-semibold text-muted">{step + 1}/{STEPS.length}</span>
        </div>
      </header>

      {/* Step body */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <div key={id} className="ce-fade-in flex flex-1 flex-col">
          {id === 'name' && (
            <>
              <h1 className="text-h2 text-ink">What should we call you?</h1>
              <p className="mt-2 text-body text-muted">This is how your Presence Manager and Guardians will greet you.</p>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="Your full name" autoComplete="name" className={cn(inputCls, 'mt-6')} />
            </>
          )}

          {id === 'phone' && (
            <>
              <h1 className="text-h2 text-ink">Add your mobile number</h1>
              <p className="mt-2 text-body text-muted">So we can reach you quickly about your family’s care.</p>
              <input autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="+91 90000 00000" type="tel" inputMode="tel" autoComplete="tel" className={cn(inputCls, 'mt-6')} />
            </>
          )}

          {id === 'city' && (
            <>
              <h1 className="text-h2 text-ink">Which city is your family in?</h1>
              <p className="mt-2 text-body text-muted">Where care is needed — so we can match a trusted Guardian nearby.</p>
              <input autoFocus value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="e.g. Hyderabad" autoComplete="address-level2" className={cn(inputCls, 'mt-6')} />
            </>
          )}

          {id === 'who' && (
            <>
              <h1 className="text-h2 text-ink">Who are you protecting?</h1>
              <p className="mt-2 text-body text-muted">We’ll set up their space first — you can add more later.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {PROTECT_OPTIONS.map((o) => (
                  <button key={o.key} type="button" onClick={() => { setProtect(o.key); setError('') }} className={cn('flex flex-col items-center gap-2 rounded-lg border-2 bg-card px-4 py-5 text-center transition-colors', protect === o.key ? 'border-green bg-accent-soft/40' : 'border-line hover:border-ink/20')}>
                    <span className="text-2xl" aria-hidden>{o.emoji}</span>
                    <span className="text-body-sm font-semibold text-ink">{o.label}</span>
                  </button>
                ))}
              </div>
              {protect && !isSelf && (
                <label className="ce-fade-in mt-5 block">
                  <span className="mb-1.5 block text-body-sm font-medium text-ink">Their name</span>
                  <input autoFocus value={lovedName} onChange={(e) => setLovedName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="e.g. Ramesh Rao" className={inputCls} />
                </label>
              )}
            </>
          )}

          {id === 'plan' && (
            <>
              <h1 className="text-h2 text-ink">{hasIntent ? 'Confirm your membership' : 'Choose your membership'}</h1>
              <p className="mt-2 text-body text-muted">
                {hasIntent
                  ? 'You chose this on the last step — confirm it or change your mind. You won’t be charged yet; you’ll activate payment next.'
                  : 'Pick what fits — you won’t be charged now. You can activate and pay anytime from Membership.'}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                {PLANS.map((pl) => (
                  <button key={pl.id} type="button" onClick={() => { setPlan(pl.id); if (hasIntent) setPendingPlan(pl.id); setError('') }} className={cn('rounded-lg border-2 bg-card p-4 text-left transition-colors', plan === pl.id ? 'border-green bg-accent-soft/30' : 'border-line hover:border-ink/20')}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="text-body font-bold text-ink">{pl.name}</span>
                        {pl.popular && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-green">Popular</span>}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-body font-semibold text-ink">{pl.price}<span className="text-caption font-medium text-muted">{pl.period}</span></span>
                        <span className={cn('grid h-5 w-5 place-items-center rounded-full border', plan === pl.id ? 'border-green bg-green text-white' : 'border-line')}>{plan === pl.id && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-caption text-muted">{pl.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex-1" />
          {error && <p className="mt-4 text-caption text-error">{error}</p>}
          <Button size="lg" className="mt-6 w-full" disabled={!canAdvance || busy} onClick={next}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Setting up your family space…</>
              : step === STEPS.length - 1 ? <>Finish setup <ArrowRight className="h-5 w-5" strokeWidth={2} /></>
              : <>Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
          </Button>
        </div>
      </main>
    </div>
  )
}
