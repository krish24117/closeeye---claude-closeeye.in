'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS, type PlanId } from '@/lib/plans'
import { setPendingPlan } from '@/lib/membership-intent'
import { cn } from '@/lib/utils'

/**
 * The public plan chooser. Tapping a plan begins the membership purchase: we
 * remember the choice (so it survives the sign-up round-trip) and continue into
 * account creation — the visitor stays in ONE membership journey, never dumped
 * onto the homepage or the one-off booking funnel.
 */
export function MembershipPlans() {
  const router = useRouter()

  function choose(id: PlanId) {
    setPendingPlan(id)
    router.push(`/auth?intent=join&plan=${id}`)
  }

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-xl border bg-card p-7 shadow-sm',
              plan.popular ? 'border-green/40 shadow-md' : 'border-line/70',
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
              onClick={() => choose(plan.id)}
            >
              Choose {plan.name}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-body-sm text-muted">
        Prefer to try one visit first?{' '}
        <Link href="/book" className="font-semibold text-green hover:underline">Book a single visit →</Link>
      </p>
    </div>
  )
}
