'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS, type PlanId } from '@/lib/plans'
import { setPendingPlan } from '@/lib/membership-intent'
import { cn } from '@/lib/utils'

/**
 * Membership in the Services space — so every family (including a brand-new account
 * with no loved one yet) can discover the ongoing plans, not just the one-off visits
 * above. Teases the two locked plans; choosing hands off to /space/billing/plan (the
 * single selection + payment surface), with the plan pre-selected via membership-intent.
 */
export function ServicesMembership() {
  const router = useRouter()
  const choose = (id: PlanId) => {
    setPendingPlan(id)
    router.push('/space/billing/plan?activate=1')
  }

  const plans = PLANS.filter((p) => p.key === 'connect' || p.key === 'care')

  return (
    <section className="flex flex-col gap-5">
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-green">Be there every month</p>
        <h2 className="mt-1.5 text-h4 text-ink">Membership</h2>
        <p className="mt-2 text-body-sm text-muted">
          For families who want us there every month, not just once — a dedicated Presence Manager who knows your
          family, and with Care, a wellbeing visit every month with photos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn('flex flex-col gap-4 rounded-lg border-2 bg-card p-6 shadow-sm', p.popular ? 'border-green' : 'border-line/70')}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-body font-semibold text-ink">{p.name}</p>
                <p className="mt-0.5">
                  <span className="text-h4 text-ink">{p.price}</span>
                  <span className="text-body-sm text-muted">{p.period}</span>
                </p>
              </div>
              {p.popular && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-semibold text-green">
                  <Star className="h-3 w-3" strokeWidth={2} /> Popular
                </span>
              )}
            </div>

            <ul className="flex flex-col gap-2">
              {p.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-body-sm text-ink">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <Button className="mt-auto w-full" variant={p.popular ? 'primary' : 'secondary'} onClick={() => choose(p.id)}>
              {p.cta} <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
