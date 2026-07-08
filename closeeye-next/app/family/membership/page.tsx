'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { useMembership } from '@/components/family/family-data-provider'
import { useToast } from '@/components/ui/toast'
import { PLANS, SERVICES, planById, type PlanId } from '@/lib/plans'
import { cn } from '@/lib/utils'

export default function MembershipPage() {
  const { subscription, chooseMembership } = useMembership()
  const toast = useToast()
  const [choosing, setChoosing] = useState<PlanId | null>(null)
  const currentId = subscription?.plan_id

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
    <div className="flex flex-col gap-8">
      <PageHeader title="Membership" subtitle="Trusted human presence for the people you love." />

      {/* Two plans */}
      <section className="grid gap-5 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentId
          return (
            <div
              key={plan.id}
              className={cn('relative flex flex-col rounded-lg border bg-card p-6 shadow-sm sm:p-7', plan.popular ? 'border-green/40' : 'border-line')}
            >
              {plan.popular && (
                <span className="absolute right-6 top-6 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-semibold text-green">Most Popular</span>
              )}
              <h2 className="text-h4 text-ink">{plan.name}</h2>
              <p className="mt-1 text-body-sm text-muted">{plan.description}</p>
              <p className="mt-5 text-ink">
                <span className="text-[2rem] font-extrabold leading-none tracking-tight">{plan.price}</span>
                <span className="text-body-sm font-medium text-muted">{plan.period}</span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-body-sm text-ink">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/12 text-success"><Check className="h-3 w-3" strokeWidth={3} /></span>
                    {b}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                variant={plan.popular ? 'primary' : 'secondary'}
                className="mt-7 w-full"
                disabled={isCurrent || choosing !== null}
                onClick={() => choose(plan.id)}
              >
                {choosing === plan.id ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : isCurrent ? 'Current plan' : plan.cta}
              </Button>
            </div>
          )
        })}
      </section>

      {/* Other services */}
      <section>
        <h2 className="text-h4">Other services</h2>
        <p className="mt-1 text-body-sm text-muted">One-off support, whenever your family needs it.</p>
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          {SERVICES.map((s, i) => (
            <div key={s.name} className={cn('flex items-center justify-between gap-4 px-5 py-4', i > 0 && 'border-t border-line')}>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-ink">{s.name}</p>
                <p className="text-caption text-muted">{s.note}</p>
              </div>
              <span className="shrink-0 text-body-sm font-semibold text-ink">{s.price}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-caption text-muted">Choosing a plan doesn’t charge you — you can activate payment anytime.</p>
    </div>
  )
}
