'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Star } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { FounderSteps } from '@/components/founder/founder-steps'
import { useAuth } from '@/components/auth/auth-provider'
import { selectPlan } from '@/lib/db/onboarding'
import { planById, type PlanId } from '@/lib/plans'
import { FOUNDER_LAUNCH_LABEL } from '@/lib/launch'
import { cn } from '@/lib/utils'

/**
 * Care-led membership selection (Product decision, 2026-07-11): the LANDING is
 * Connect-led to lower first-touch friction, but by the time a warm family
 * reaches this step we recommend the plan that gives the best experience — Care,
 * whose monthly Presence Visit is the heart of Close Eye. Connect is offered with
 * equal dignity as the lighter way to begin, never as an inferior choice, and
 * there's no aggressive upsell — it reads as advice from the founder.
 */
const OPTIONS: {
  id: PlanId
  badge: string
  recommended: boolean
  line: string
  highlights: string[]
}[] = [
  {
    id: 'trust', // CloseEye Care
    badge: 'Recommended for most families',
    recommended: true,
    line: 'Monthly Presence Visits, Presence Stories and priority coordination.',
    highlights: ['One monthly wellbeing visit', 'Visit report with photos', 'Priority scheduling'],
  },
  {
    id: 'companion', // CloseEye Connect
    badge: 'A lighter way to begin',
    recommended: false,
    line: 'Trusted coordination and ongoing family support.',
    highlights: ['Dedicated Presence Manager', 'Phone & WhatsApp coordination', 'Family updates'],
  },
]

export default function FounderMembershipPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [busy, setBusy] = React.useState<PlanId | null>(null)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!loading && !user) router.replace('/auth?intent=founding')
  }, [loading, user, router])

  async function choose(id: PlanId) {
    if (busy || !user) return
    setError(''); setBusy(id)
    // No charge — selectPlan writes an unpaid 'created' subscription. Payment
    // happens after launch, from the Membership page.
    const { error: e } = await selectPlan(user.id, id)
    if (e) { console.error('[founder/membership] selectPlan failed:', e); setBusy(null); setError('We couldn’t save that just now. Please try again.'); return }
    router.push('/founder/done')
  }

  if (loading || !user) {
    return <div className="grid min-h-dvh place-items-center bg-ivory"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <header className="mx-auto flex w-full max-w-md items-center gap-2 px-5 pt-6">
        <LogoMark className="h-8 w-8" />
        <span className="text-body-sm font-semibold tracking-tight text-ink">Close Eye</span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <div className="mb-8"><FounderSteps step={4} /></div>

        <div className="ce-fade-in flex flex-1 flex-col">
          <h1 className="text-h2 text-ink">Choose how you’d like to begin</h1>
          <p className="mt-2 text-body leading-relaxed text-muted">
            A small recommendation from me: most families start with <strong className="font-semibold text-ink">Care</strong> — the monthly visit is the heart of Close Eye. Connect is a lighter way to begin. Either is a good place to start, and you can change anytime. Nothing is charged before {FOUNDER_LAUNCH_LABEL}.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {OPTIONS.map((opt) => {
              const plan = planById(opt.id)!
              const isBusy = busy === opt.id
              return (
                <div
                  key={opt.id}
                  className={cn(
                    'relative flex flex-col rounded-lg border bg-card p-5 shadow-sm',
                    opt.recommended ? 'border-green/50 shadow-md' : 'border-line',
                  )}
                >
                  <span className={cn(
                    'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold',
                    opt.recommended ? 'bg-accent-soft text-green' : 'bg-ink/[0.05] text-muted',
                  )}>
                    {opt.recommended && <Star className="h-3 w-3 fill-current" strokeWidth={0} />}
                    {opt.badge}
                  </span>

                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <h2 className="text-h4 text-ink">{plan.name}</h2>
                    <p className="whitespace-nowrap text-ink"><span className="text-h4 font-extrabold">{plan.price}</span><span className="text-caption font-medium text-muted">{plan.period}</span></p>
                  </div>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-muted">{opt.line}</p>

                  <ul className="mt-4 flex flex-col gap-2">
                    {opt.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2.5 text-body-sm text-ink">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/12 text-success"><Check className="h-3 w-3" strokeWidth={3} /></span>
                        {h}
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="lg"
                    variant={opt.recommended ? 'primary' : 'secondary'}
                    className="mt-5 w-full"
                    disabled={busy !== null}
                    onClick={() => choose(opt.id)}
                  >
                    {isBusy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Reserving…</> : `Choose ${plan.short}`}
                  </Button>
                </div>
              )
            })}
          </div>

          {error && <p className="mt-4 text-center text-caption text-error">{error}</p>}
          <p className="mt-6 text-center text-caption text-muted">You’re reserving your place — you won’t be charged until we open.</p>
        </div>
      </main>
    </div>
  )
}
