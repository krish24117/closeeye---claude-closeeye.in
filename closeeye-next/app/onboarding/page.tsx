'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { saveProfileBasics, selectPlan } from '@/lib/db/onboarding'
import { PROTECT_OPTIONS, type PlanId } from '@/lib/plans'
import { getPendingPlan, setPendingPlan } from '@/lib/membership-intent'
import { markFirstPerson } from '@/lib/first-run'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'

type StepId = 'name' | 'who'
const STEPS: StepId[] = ['name', 'who']

/**
 * Production onboarding — optimised for FIRST SUCCESS, not data collection.
 *
 * Two mandatory steps only: the user's name and their first loved one. That is the
 * minimum needed to deliver a first grounded Connect answer, so we land the user in
 * their new person's Space within a minute. Everything else is PROGRESSIVE — phone +
 * emergency contact + city are collected at the Care/booking gate (when a human service
 * makes them necessary); membership is chosen at Membership (when they choose to pay).
 *
 * The one exception: a visitor who chose a plan on /membership BEFORE signing up carries
 * that intent through — we confirm it silently and route to Activate, so the purchase
 * funnel is never broken.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshOnboarding } = useAuth()
  const { addLovedOne, refresh } = useFamilyData()

  const metaName = ((user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || '').trim()
  const [step, setStep] = React.useState(0)
  const [name, setName] = React.useState(metaName)
  const [protect, setProtect] = React.useState<string | null>(null)
  const [lovedName, setLovedName] = React.useState('')
  // Carried membership intent only — no plan STEP; the visitor picked it on /membership.
  const [plan, setPlan] = React.useState<PlanId | null>(null)
  const [hasIntent, setHasIntent] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (metaName && !name) setName(metaName)
  }, [metaName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carried membership intent — the visitor chose a plan on /membership before signing
  // up. We hold it (no plan step) and route to Activate at the end so the purchase
  // funnel completes; a direct sign-up has no intent and simply lands in the Workspace.
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
      case 'who': return Boolean(protect) && (isSelf || lovedName.trim().length >= 2)
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
      // 1. Profile name only, and mark onboarding complete. Phone is DEFERRED to the
      //    Care/booking gate (progressive disclosure) — not needed for a first answer.
      const p = await saveProfileBasics(user.id, { fullName: name })
      if (p.error) throw new Error(p.error)
      // 2. Create the first loved one (provisions the family space). City is DEFERRED
      //    too — addLovedOne defaults it to '' and the Space prompts for it later.
      const created = await addLovedOne({ full_name: nameOfLovedOne, relationship: protect ?? 'Family' })
      // 3. Membership funnel ONLY: honour a plan chosen before sign-up. A direct sign-up
      //    has no plan here — membership is chosen later, when the user chooses to pay.
      if (hasIntent && plan) {
        const s = await selectPlan(user.id, plan)
        if (s.error) throw new Error(s.error)
      }
      await refreshOnboarding()
      await refresh()
      haptic('success')
      if (hasIntent && plan) {
        // Purchase intent → continue to Activate (payment).
        setPendingPlan(plan)
        router.replace('/family/membership?activate=1')
      } else {
        // First success: hand off to the new person's Space (the guided first task). AuthGate
        // sends a freshly-onboarded family user to /space; the marker lets the Workspace home
        // open the person page from inside its own context — no redirect race.
        markFirstPerson(created.id)
        router.replace('/space')
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
              <p className="mt-2 text-body text-muted">So Close Eye can greet you personally.</p>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="Your full name" autoComplete="name" className={cn(inputCls, 'mt-6')} />
            </>
          )}

          {id === 'who' && (
            <>
              <h1 className="text-h2 text-ink">Who would you like Close Eye to know first?</h1>
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
