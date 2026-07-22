'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS, planById, type PlanId } from '@/lib/plans'
import { setPendingPlan } from '@/lib/membership-intent'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { cn } from '@/lib/utils'

/**
 * The public plan chooser — STATE-AWARE. The colour hierarchy is intentional and
 * preserved (Connect = outlined secondary, Care = filled primary); the page's job
 * is decision clarity + communicating where the customer already is in their
 * journey — not visual symmetry:
 *   • anonymous / no active plan → "Choose Close Eye {plan}"  (join funnel / activate)
 *   • the customer's active plan → "Your current plan" + Manage membership
 *   • Connect member · Care card → "Upgrade to Close Eye Care"
 *   • Care member · Connect card → "Included in your Close Eye Care plan"
 */
export function MembershipPlans() {
  const router = useRouter()
  const { session } = useAuth()
  const { subscription } = useFamilyData()
  const signedIn = !!session
  const active = subscription?.status === 'active'
  const currentId = active ? subscription?.plan_id : null
  const onConnect = planById(currentId)?.key === 'connect'
  const onCare = planById(currentId)?.key === 'care'

  function choose(id: PlanId) {
    setPendingPlan(id)
    // Signed-in customers activate in-app; visitors begin the join funnel.
    router.push(signedIn ? '/family/membership?activate=1' : `/auth?intent=join&plan=${id}`)
  }

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = active && plan.id === currentId
          const isUpgradeTarget = active && onConnect && plan.key === 'care'
          const isIncluded = active && onCare && plan.key === 'connect'
          return (
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
                    <span>
                      {b}
                      {b.includes('Presence Manager') && (
                        <span className="mt-0.5 block text-caption text-muted">A named team member who knows your family and handles every request personally.</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* State-aware action — colour hierarchy preserved, journey communicated. */}
              {isCurrent ? (
                <div className="mt-7 rounded-sm bg-accent-soft/50 px-4 py-3.5 text-center">
                  <p className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-green">
                    <Check className="h-4 w-4" strokeWidth={2.5} /> Your current plan
                  </p>
                  <Link href="/family/membership" className="mt-1.5 block text-caption font-semibold text-green hover:underline">
                    Manage membership →
                  </Link>
                </div>
              ) : isUpgradeTarget ? (
                <Button asChild size="lg" variant="primary" className="mt-7 w-full">
                  <Link href="/family/membership">Upgrade to Close Eye Care</Link>
                </Button>
              ) : isIncluded ? (
                <div className="mt-7 rounded-sm border border-line/70 px-4 py-3.5 text-center">
                  <p className="text-caption text-muted">Included in your Close Eye Care plan.</p>
                </div>
              ) : (
                <Button
                  size="lg"
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className="mt-7 w-full"
                  onClick={() => choose(plan.id)}
                >
                  Choose {plan.name}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-center text-body-sm text-muted">
        Prefer to try one visit first?{' '}
        <Link href="/book" className="font-semibold text-green hover:underline">Book a single visit →</Link>
      </p>
    </div>
  )
}
