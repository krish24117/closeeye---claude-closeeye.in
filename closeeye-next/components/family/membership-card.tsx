'use client'

import Link from 'next/link'
import { ArrowUpRight, BadgeCheck, ShieldPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMembership } from '@/components/family/family-data-provider'
import { planById } from '@/lib/plans'
import { cn } from '@/lib/utils'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

/** Account-level membership status for the dashboard — or an invite to choose one. */
export function MembershipCard() {
  const { subscription } = useMembership()
  const plan = planById(subscription?.plan_id)

  // Empty state — no membership chosen yet.
  if (!subscription || !plan) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-lg border border-line bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><ShieldPlus className="h-5 w-5" strokeWidth={1.5} /></span>
          <div>
            <p className="text-body font-semibold text-ink">Protect your loved one with ongoing care.</p>
            <p className="mt-0.5 text-body-sm text-muted">Choose a membership to unlock dedicated coordination and monthly wellbeing support.</p>
          </div>
        </div>
        <Button asChild size="md" className="shrink-0"><Link href="/family/membership">Explore Membership</Link></Button>
      </section>
    )
  }

  const active = subscription.status === 'active'
  const isConnect = plan.key === 'connect'

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-accent"><BadgeCheck className="h-5 w-5" strokeWidth={1.5} /></span>
          <div>
            <p className="text-caption text-white/60">Current plan</p>
            <p className="text-body font-semibold text-white">{plan.name}</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold', active ? 'bg-success/20 text-accent' : 'bg-white/10 text-white/70')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-success' : 'bg-white/50')} /> {active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-caption text-muted">Next renewal</p>
          <p className="text-body-sm font-semibold text-ink">{subscription.current_end ? formatDate(subscription.current_end) : '—'}</p>
        </div>
        {isConnect ? (
          <Button asChild size="sm"><Link href="/family/membership"><ArrowUpRight className="h-4 w-4" strokeWidth={2} /> Upgrade to Care</Link></Button>
        ) : (
          <Button asChild variant="secondary" size="sm"><Link href="/family/membership">Manage plan</Link></Button>
        )}
      </div>
    </section>
  )
}
