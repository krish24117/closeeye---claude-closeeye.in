'use client'

/**
 * Onboarding — premium first run (founder-approved 2026-07-21), matched to the homepage's editorial
 * language (Newsreader serif, calm, ivory/forest). Still optimised for FIRST SUCCESS: two mandatory
 * fields (your name, your first loved one), everything else progressive. What's new is the emotional
 * arc — a warm welcome, one SKIPPABLE "first understanding" moment where Close Eye visibly begins to
 * understand, and a "space is ready — and alive" close — so a family FEELS the product in the first
 * minute instead of landing on an empty screen. Membership-intent funnel is preserved untouched.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { CountryField } from '@/components/family/country-field'
import { relationshipWord, objectPronoun } from '@/lib/family/relationship-words'
import { saveProfileBasics, selectPlan } from '@/lib/db/onboarding'
import { recordConsent } from '@/lib/db/consent'
import { appendLearning } from '@/lib/db/space'
import { planById, type PlanId } from '@/lib/plans'
import { getPendingPlan, setPendingPlan } from '@/lib/membership-intent'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'


type StepId = 'welcome' | 'name' | 'who' | 'fact' | 'ready'
const DATA_STEPS: StepId[] = ['name', 'who', 'fact'] // the three progress-dotted steps

const WHO = [
  { key: 'Parent', title: 'A parent', sub: 'Mother or father' },
  { key: 'Spouse', title: 'Partner', sub: 'Spouse or partner' },
  { key: 'Child', title: 'A child', sub: 'Son or daughter' },
  { key: 'Self', title: 'Myself', sub: 'Your own space' },
] as const

const inputCls =
  'w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-body text-ink placeholder:text-muted/70 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshOnboarding, onboardingComplete } = useAuth()
  const { addLovedOne, refresh } = useFamilyData()

  const metaName = ((user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || '').trim()
  const [step, setStep] = React.useState<StepId>('welcome')
  const [name, setName] = React.useState(metaName)
  const [protect, setProtect] = React.useState<string | null>(null)
  const [lovedName, setLovedName] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [fact, setFact] = React.useState('')
  const [plan, setPlan] = React.useState<PlanId | null>(null)
  const [hasIntent, setHasIntent] = React.useState(false)
  const [createdId, setCreatedId] = React.useState<string | null>(null)
  const [consented, setConsented] = React.useState(false) // DPDP consent, captured here so Connect's first answer isn't gated
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => { if (metaName && !name) setName(metaName) }, [metaName]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { const p = getPendingPlan(); if (p) { setPlan(p); setHasIntent(true) } }, [])
  // A returning, already-onboarded user who lands on /onboarding is sent home. The AuthGate no longer
  // auto-redirects /onboarding (so it can't race the fresh "ready" close), so the page owns this. It
  // only fires at the entry step — a fresh run keeps onboardingComplete=false until the close, so this
  // never triggers mid-flow.
  React.useEffect(() => {
    if (onboardingComplete === true && step === 'welcome') router.replace('/space')
  }, [onboardingComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  const isSelf = protect === 'Self'
  const subject = isSelf ? 'you' : (lovedName.trim().split(/\s+/)[0] || 'them')
  const factSubject = isSelf ? 'yourself' : subject

  const dataIndex = DATA_STEPS.indexOf(step as StepId) // -1 for welcome/ready
  const canAdvance = (() => {
    switch (step) {
      case 'name': return name.trim().length >= 2
      case 'who': return Boolean(protect) && (isSelf || lovedName.trim().length >= 2)
      default: return true
    }
  })()

  function back() {
    setError('')
    setStep((s) => (s === 'who' ? 'name' : s === 'fact' ? 'who' : s === 'name' ? 'welcome' : s))
  }

  async function next() {
    setError('')
    if (!canAdvance) return
    haptic('light')
    if (step === 'welcome') return setStep('name')
    if (step === 'name') return setStep('who')
    if (step === 'who') return setStep('fact')
    if (step === 'fact') return createSpace() // Continue or Skip both land here
  }

  async function createSpace() {
    if (!user) return setError('You’re not signed in. Please sign in again.')
    if (!consented) return setError('Please agree so Close Eye can hold your family’s information.')
    setBusy(true); setError('')
    try {
      // Record DPDP consent up front — this is the moment Close Eye first stores family data. It's the
      // durable record of the checkbox the user ticked; best-effort, and Connect re-checks as a backstop.
      try { await recordConsent({ granted: true }) } catch { /* non-fatal — Connect's gate catches a miss */ }
      const nameOfLovedOne = isSelf ? name.trim() : lovedName.trim()
      const p = await saveProfileBasics(user.id, { fullName: name })
      if (p.error) throw new Error(p.error)
      const created = await addLovedOne({ full_name: nameOfLovedOne, relationship: protect ?? 'Family', region_code: country || null })
      // The first understanding — the family's own first words about this person. Best-effort:
      // a failed note must never block landing in the space (the fact is a bonus, not a gate).
      if (fact.trim()) { try { await appendLearning(created.id, 'note', fact.trim()) } catch {} }
      if (hasIntent && plan) {
        const s = await selectPlan(user.id, plan)
        if (s.error) throw new Error(s.error)
        // Persist the selection either way — the 'ready' close now offers "Activate now" OR
        // "Explore first", and a deferred activation resumes from this pending plan.
        setPendingPlan(plan)
      }
      // NB: do NOT mark onboarding complete here — that flips the AuthGate and would race the
      // "ready" close away. Completion is marked in enterSpace()/goActivate(), after the close.
      await refresh()
      haptic('success')
      track('onboarding_completed')
      setCreatedId(created.id)
      setBusy(false)
      // Everyone — plan-picker or not — earns the warm, alive close. A family who chose a plan
      // gets an activation recap + CTA on it, instead of being dumped cold into the billing grid.
      setStep('ready')
    } catch (e) {
      console.error('[onboarding] setup failed:', e)
      setBusy(false)
      setError('We couldn’t finish setting up your family space. Please try again.')
    }
  }

  async function enterSpace() {
    // Mark onboarding complete only NOW — after the "ready" close — then hand off to the just-created
    // person's Space. Deferring completion to here is what lets the close screen show at all; setting
    // it before navigating means the workspace opens without a bounce back to /onboarding.
    await refreshOnboarding()
    router.replace(createdId ? `/space/people/${createdId}` : '/space')
  }

  async function goActivate() {
    // Same — mark complete before entering the (auth-gated) activation surface, else it bounces back
    // to /onboarding. The plan is already selected + pending.
    await refreshOnboarding()
    router.replace('/space/billing/plan?activate=1')
  }

  /* ── READY — a dark, alive close (its own full-screen layout) ── */
  if (step === 'ready') {
    const Subject = subject.charAt(0).toUpperCase() + subject.slice(1)
    // A family who chose a plan gets an activation recap on the close (Option A) rather than a cold
    // billing grid. Lines are the plan's own benefits, minus the "Everything in…" umbrella.
    const activatePlan = hasIntent && plan ? planById(plan) : null
    const planLines = activatePlan ? activatePlan.benefits.filter((b) => !b.toLowerCase().startsWith('everything')).slice(0, 2) : []
    return (
      <div className="flex min-h-dvh flex-col bg-surface-inverse px-6 pb-10 pt-14 text-content-inverse">
        <div className="ce-fade-in mx-auto flex w-full max-w-md flex-1 flex-col">
          <div className="rounded-3xl border border-content-inverse/10 bg-content-inverse/5 p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-body-sm font-bold text-surface-inverse">{Subject.charAt(0)}</span>
              <span className="font-display text-h4 text-content-inverse">{Subject}</span>
            </div>
            {fact.trim() && (
              <p className="mt-4 flex items-start gap-2.5 text-body-sm text-content-inverse"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" strokeWidth={2.4} />{fact.trim()}</p>
            )}
            <p className="mt-4 flex items-center gap-2 text-caption text-content-inverse/60">{isSelf ? 'Your space is live' : `${Subject}’s space is live`}<span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-accent-soft" /></p>
          </div>
          <h1 className="font-display mt-8 text-h2 text-content-inverse">{isSelf ? 'Your' : `${Subject}’s`} space is ready.</h1>
          <p className="mt-3 text-body text-content-inverse/70">It only grows from here. Everything stays private to your family.</p>

          {activatePlan && (
            <div className="mt-6 rounded-3xl border border-accent-soft/35 bg-content-inverse/5 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-caption font-semibold uppercase tracking-widest text-accent-soft">{activatePlan.name}</p>
                <p className="shrink-0 text-content-inverse"><span className="text-h4 font-bold">{activatePlan.price}</span><span className="text-body-sm text-content-inverse/60">{activatePlan.period}</span></p>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {planLines.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-body-sm text-content-inverse"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" strokeWidth={2.4} />{b}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1" />
          {activatePlan ? (
            <>
              <button onClick={goActivate} className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent-soft text-body-sm font-semibold text-surface-inverse transition-opacity hover:opacity-90">
                Activate {activatePlan.name} <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </button>
              <button onClick={enterSpace} className="mt-2 min-h-[2.75rem] w-full rounded-full text-body-sm font-semibold text-content-inverse/70 transition-colors hover:text-content-inverse">Explore your space first</button>
            </>
          ) : (
            <button onClick={enterSpace} className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent-soft text-body-sm font-semibold text-surface-inverse transition-opacity hover:opacity-90">
              Enter your Family Space <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ── WELCOME + the three data steps (light) ── */
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="mx-auto w-full max-w-md px-6 pt-6">
        {step === 'welcome' ? (
          <Logo lockup="horizontal" height={26} />
        ) : (
          <div className="flex items-center gap-3">
            <button type="button" onClick={back} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.05]"><ArrowLeft className="h-5 w-5" strokeWidth={1.75} /></button>
            <div className="flex flex-1 items-center gap-1.5">
              {DATA_STEPS.map((_, n) => (
                <span key={n} className={cn('h-1.5 flex-1 rounded-full transition-colors', n <= dataIndex ? 'bg-green' : 'bg-line')} />
              ))}
            </div>
            <span className="text-caption font-semibold text-muted">{dataIndex + 1}/{DATA_STEPS.length}</span>
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-8">
        <div key={step} className="ce-fade-in flex flex-1 flex-col">
          {step === 'welcome' && (
            <>
              <div className="mb-7 grid h-14 w-14 place-items-center rounded-full bg-surface-inverse">
                <span className="h-4 w-4 animate-pulse rounded-full" style={{ background: 'hsl(103 58% 54%)', boxShadow: '0 0 16px 3px hsl(103 62% 54% / 0.6)' }} />
              </div>
              <h1 className="font-display text-h1 leading-tight text-ink">Let’s create your family’s private space.</h1>
              <p className="mt-4 text-lead text-muted">It takes about a minute. Everything you add stays private to your family.</p>
            </>
          )}

          {step === 'name' && (
            <>
              <h1 className="font-display text-h2 text-ink">What should we call you?</h1>
              <p className="mt-3 text-body text-muted">So the people you love are known by name, from the very first word.</p>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="Your full name" autoComplete="name" className={cn(inputCls, 'mt-7')} />
            </>
          )}

          {step === 'who' && (
            <>
              <h1 className="font-display text-h2 text-ink">Who should Close Eye know first?</h1>
              <p className="mt-3 text-body text-muted">We’ll set up their space first — you can add more anytime.</p>
              <div className="mt-7 grid grid-cols-2 gap-3">
                {WHO.map((o) => (
                  <button key={o.key} type="button" onClick={() => { setProtect(o.key); setError('') }}
                    className={cn('rounded-2xl border bg-card px-4 py-4 text-start transition-colors', protect === o.key ? 'border-green bg-accent-soft/50' : 'border-line hover:border-ink/20')}>
                    <span className="block text-body-sm font-semibold text-ink">{o.title}</span>
                    <span className="mt-0.5 block text-caption text-muted">{o.sub}</span>
                  </button>
                ))}
              </div>
              {protect && !isSelf && (
                <label className="ce-fade-in mt-5 block">
                  <span className="mb-2 block text-body-sm font-semibold text-ink">Their name</span>
                  <input autoFocus value={lovedName} onChange={(e) => setLovedName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="e.g. Mom, or a name like Lakshmi" className={inputCls} />
                  {relationshipWord(lovedName) && (
                    <span className="mt-2.5 block rounded-xl bg-accent-soft/50 px-3.5 py-2.5 text-caption leading-relaxed text-green">
                      That’s a relationship — what do you <b>call</b> {objectPronoun(relationshipWord(lovedName)!.gender)}? A name lets Close Eye speak about {objectPronoun(relationshipWord(lovedName)!.gender)} personally.
                    </span>
                  )}
                </label>
              )}
              {protect && (
                <div className="ce-fade-in mt-5">
                  <span className="mb-2 block text-body-sm font-semibold text-ink">Country <span className="font-normal text-muted">(optional)</span></span>
                  <CountryField value={country} onChange={setCountry} />
                  <p className="mt-1.5 text-caption text-muted">Sets the right local emergency number, if it’s ever needed.</p>
                </div>
              )}
            </>
          )}

          {step === 'fact' && (
            <>
              <h1 className="font-display text-h2 text-ink">Tell Close Eye one thing about {factSubject}.</h1>
              <p className="mt-3 text-body text-muted">Anything at all — a routine, a worry, something {isSelf ? 'you love' : `${subject} loves`}.</p>
              <input autoFocus value={fact} onChange={(e) => setFact(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && consented && next()} placeholder={isSelf ? 'e.g. I love my morning walks' : `e.g. ${Cap(subject)} loves her morning walks`} className={cn(inputCls, 'mt-7')} />
              {fact.trim().length > 1 && (
                <div className="ce-fade-in mt-4 flex items-start gap-2.5 rounded-2xl border border-line bg-card p-3.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-inverse"><span className="h-1.5 w-1.5 rounded-full bg-green" /></span>
                  <p className="text-body-sm leading-relaxed text-muted">Remembered. The more you share, the more Close Eye understands {factSubject === 'yourself' ? 'you' : subject}.</p>
                </div>
              )}
            </>
          )}

          {/* Consent — captured here, at the moment Close Eye first holds family data, so the first
              Connect answer isn't interrupted later. Explicit, informed, and durably recorded. */}
          {step === 'fact' && (
            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-card p-3.5">
              <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-green" />
              <span className="text-caption leading-relaxed text-muted">
                I understand Close Eye stores only what I share to help me care for my family — <b className="text-ink">private to me, never sold</b> — and I can withdraw or delete anytime. <Link href="/privacy" className="font-semibold text-green hover:text-green/80">Learn more</Link> · <Link href="/trust" className="font-semibold text-green hover:text-green/80">Trust Center</Link>
              </span>
            </label>
          )}

          {error && <p className="mt-4 text-caption text-error">{error}</p>}

          <button onClick={next} disabled={!canAdvance || busy || (step === 'fact' && !consented)}
            className="mt-4 inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-surface-inverse text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-50">
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Creating {isSelf ? 'your' : `${subject}’s`} space…</>
              : step === 'welcome' ? <>Begin <ArrowRight className="h-5 w-5" strokeWidth={2} /></>
              : step === 'fact' ? <>Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></>
              : <>Continue <ArrowRight className="h-5 w-5" strokeWidth={2} /></>}
          </button>
          {step === 'fact' && !busy && (
            <button onClick={createSpace} disabled={!consented} className="mt-2 min-h-[2.75rem] w-full rounded-full text-body-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-40">Skip for now</button>
          )}
        </div>
      </main>
    </div>
  )
}

function Cap(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }
