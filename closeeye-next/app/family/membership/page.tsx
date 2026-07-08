'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { useMembership } from '@/components/family/family-data-provider'
import { useToast } from '@/components/ui/toast'
import { PLANS, SERVICES, planById, type PlanId } from '@/lib/plans'
import { cn } from '@/lib/utils'

const STEPS = [
  'Choose a membership',
  'Add your family member',
  'Your Presence Manager is assigned',
  'Start requesting support anytime',
]

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function MembershipPage() {
  const { subscription, chooseMembership } = useMembership()
  const toast = useToast()
  const [choosing, setChoosing] = useState<PlanId | null>(null)
  const currentId = subscription?.plan_id
  const active = subscription?.status === 'active'
  const isCare = planById(currentId)?.key === 'care'

  async function choose(planId: PlanId) {
    if (choosing) return
    setChoosing(planId)
    try {
      await chooseMembership(planId)
      toast(`You’re on CloseEye ${planById(planId)?.short ?? ''}.`)
    } catch (e) {
      console.error('[membership] choose failed:', e)
      toast('We couldn’t update your plan. Please try again.')
    } finally {
      setChoosing(null)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Membership" subtitle="Trusted human presence for the people you love." />

      {/* Two plans — tightened gap below the heading */}
      <section className="mt-4 grid gap-5 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentId
          return (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-lg border bg-card p-6 sm:p-7',
                plan.popular ? 'border-green/40 shadow-md' : 'border-line shadow-sm',
              )}
            >
              {plan.popular && (
                <span className="absolute right-6 top-6 rounded-full bg-accent-soft/70 px-2.5 py-1 text-caption font-medium text-green">Most Popular</span>
              )}
              <h2 className="text-h4 text-ink">{plan.name}</h2>
              <p className="mt-1 text-body-sm text-muted">{plan.description}</p>
              <p className="mt-5 whitespace-nowrap text-ink">
                <span className="text-[2rem] font-extrabold leading-none tracking-tight">{plan.price}</span>
                <span className="text-body-sm font-medium text-muted">{plan.period}</span>
              </p>

              <p className="mt-6 text-caption font-semibold uppercase tracking-widest text-muted">Includes</p>
              <ul className="mt-3 flex flex-1 flex-col gap-3">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-body-sm text-ink">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/12 text-success"><Check className="h-3 w-3" strokeWidth={3} /></span>
                    {b}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="mt-7 rounded-sm bg-accent-soft/50 px-4 py-3.5">
                  <p className="text-caption font-semibold uppercase tracking-widest text-muted">Current plan</p>
                  <p className="mt-1 text-body font-semibold text-ink">{plan.name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-caption font-semibold text-success"><Check className="h-3 w-3" strokeWidth={3} /> Active</span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-caption font-semibold text-success"><Check className="h-3 w-3" strokeWidth={3} /> Selected</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/12 px-2.5 py-1 text-caption font-semibold text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Payment pending</span>
                      </>
                    )}
                  </div>
                  {active && subscription?.current_end && (
                    <p className="mt-2 text-caption text-muted">Renews on {formatDate(subscription.current_end)}</p>
                  )}
                </div>
              ) : (
                <Button
                  size="lg"
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className="mt-7 w-full"
                  disabled={choosing !== null}
                  onClick={() => choose(plan.id)}
                >
                  {choosing === plan.id ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : plan.cta}
                </Button>
              )}
            </div>
          )
        })}
      </section>

      {/* How it works */}
      <section className="mt-8">
        <h2 className="text-h4">How it works</h2>
        <p className="mt-1 text-body-sm text-muted">Four simple steps.</p>
        <ol className="mt-4 overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          {STEPS.map((s, i) => (
            <li key={s} className={cn('flex items-center gap-3 px-5 py-3.5', i > 0 && 'border-t border-line')}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-bold text-green">{i + 1}</span>
              <span className="text-body-sm text-ink">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Other services */}
      <section className="mt-8">
        <h2 className="text-h4">Other services</h2>
        <p className="mt-1 text-body-sm text-muted">One-off support, whenever your family needs it.</p>
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          {SERVICES.map((s, i) => {
            const careVisit = isCare && s.serviceId === 'home-wellbeing-visit'
            return (
              <div key={s.name} className={cn('px-5 py-4', i > 0 && 'border-t border-line')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-ink">{s.name}</p>
                    <p className="text-caption text-muted">{s.note}</p>
                  </div>
                  {careVisit ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-success/12 px-2.5 py-1 text-caption font-semibold text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Included in your membership
                    </span>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap text-body-sm font-semibold text-ink">{s.price}</span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {careVisit ? (
                    <>
                      <Button asChild size="sm">
                        <Link href={`/family/book?service=${s.serviceId}`}>Schedule Monthly Visit</Link>
                      </Button>
                      <Link href={`/family/book?service=${s.serviceId}`} className="text-caption font-semibold text-green hover:underline">
                        Book Extra Visit · ₹1,000
                      </Link>
                    </>
                  ) : (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/family/book?service=${s.serviceId}`}>{s.cta}</Link>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <p className="mt-8 text-center text-caption text-muted">You can choose a plan today and activate payment whenever you’re ready.</p>
    </div>
  )
}
