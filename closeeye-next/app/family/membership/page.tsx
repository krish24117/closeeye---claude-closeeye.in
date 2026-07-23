'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { FunnelSteps } from '@/components/funnel/funnel-steps'
import { Overlay } from '@/components/family/overlay'
import { Button } from '@/components/ui/button'
import { useFamilyData } from '@/components/family/family-data-provider'
import { DEFAULT_REGION_CODE, localeFor } from '@/lib/platform/regions'
import { useToast } from '@/components/ui/toast'
import { PLANS, SERVICES, planById, type PlanId } from '@/lib/plans'
import { getPendingPlan, clearPendingPlan } from '@/lib/membership-intent'
import { isFounderFunnelGated } from '@/lib/founder-funnel'
import { PRELAUNCH_MEMBERSHIP_NOTE } from '@/lib/launch'
import { MembershipPrepare } from '@/components/family/membership-prepare'
import { fetchElderProfile, type ElderProfileForm } from '@/lib/db/family'
import { cn } from '@/lib/utils'

const STEPS = [
  'Choose a membership',
  'Add your family member',
  'Your Presence Manager is assigned',
  'Start requesting support anytime',
]

function formatDate(iso: string, region: string = DEFAULT_REGION_CODE): string {
  try {
    return new Date(iso).toLocaleDateString(localeFor(region), { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

/** A loved one with no wellbeing details yet — drives the pre-payment nudge. */
function isWellbeingThin(ep: ElderProfileForm): boolean {
  return !(
    ep.medical_conditions.trim() || ep.current_medications.length || ep.allergies.trim() ||
    ep.things_to_avoid.trim() || ep.daily_routine.trim() || ep.conversation_interests.trim() || ep.food_preferences.trim()
  )
}

export default function MembershipPage() {
  const { subscription, profile, identity, lovedOnes, region } = useFamilyData()
  const toast = useToast()
  const [busy, setBusy] = useState<PlanId | null>(null)
  // Pre-payment collection gate — set to the plan being purchased while we gather the
  // loved one + wellbeing, before payForMembership.
  const [preparing, setPreparing] = useState<{ planId: PlanId; mode: 'choose' | 'upgrade' } | null>(null)
  // Activation landing — arrived from the join funnel (onboarding → Activate). Read
  // the carried plan + ?activate once on the client (in an effect, from
  // window.location) to avoid a hydration mismatch and keep the page prerenderable.
  const [joinFlow, setJoinFlow] = useState(false)
  const [pendingPlanId, setPendingPlanId] = useState<PlanId | null>(null)
  useEffect(() => {
    const activate = new URLSearchParams(window.location.search).get('activate') === '1'
    const pending = getPendingPlan()
    if (activate || pending) { setJoinFlow(true); setPendingPlanId(pending) }
  }, [])
  // Self-serve Connect → Care upgrade sheet. `upgradePaid` is a purely local UI
  // flag (the client NEVER writes subscription state) — it shows the welcome +
  // an "Activating…" card during the brief window before the webhook promotes.
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradePaid, setUpgradePaid] = useState(false)
  const currentId = subscription?.plan_id
  const active = subscription?.status === 'active'
  const activating = subscription?.status === 'authenticated'
  // "Included" benefits (e.g. the monthly visit) are earned by an ACTIVE Care
  // subscription — never by merely selecting the plan. An unpaid Care selection
  // sees the normal price + the "complete payment" nudge, not a free visit.
  const isCare = planById(currentId)?.key === 'care' && active
  const onConnect = planById(currentId)?.key === 'connect'
  // Keep the "complete your membership" framing until the plan is actually active.
  const showActivate = joinFlow && !active
  const activatePlan = planById(pendingPlanId) ?? planById(currentId)
  // The additional benefits Care adds over Connect (drop the "Everything in
  // Connect" umbrella line — the sheet is about what's NEW).
  const careDelta = (planById('trust')?.benefits ?? []).filter((b) => !b.toLowerCase().startsWith('everything'))

  // The primary loved one + whether their wellbeing is still thin — so choose()/startUpgrade()
  // can decide whether to open the collection gate before payment.
  const primaryLovedOne = lovedOnes[0] ?? null
  const [wellbeingThin, setWellbeingThin] = useState(false)
  useEffect(() => {
    if (!primaryLovedOne) return
    let alive = true
    fetchElderProfile(primaryLovedOne.id).then((ep) => { if (alive) setWellbeingThin(isWellbeingThin(ep)) }).catch(() => {})
    return () => { alive = false }
  }, [primaryLovedOne?.id])

  function gateNeeded(): boolean {
    if (!primaryLovedOne) return true
    if (!primaryLovedOne.address?.trim()) return true
    return wellbeingThin
  }

  // Select the plan, then open Razorpay to activate it. Works for a fresh choice
  // and for completing payment on an already-selected (pending) plan.
  async function choose(planId: PlanId) {
    if (busy) return
    // An already-active member cannot re-pay or self-switch plans here — that
    // would clobber the live subscription and could double-bill two Razorpay
    // subscriptions. Plan changes go through the care team for now.
    if (active) return
    // Founder Funnel (pre-launch): registrants select a plan but never pay here.
    if (isFounderFunnelGated(profile?.founder_prelaunch ?? false)) { toast(PRELAUNCH_MEMBERSHIP_NOTE); return }
    if (!planById(planId)) return
    // Collect the loved one + a wellbeing nudge before we ever open payment.
    if (gateNeeded()) { setPreparing({ planId, mode: 'choose' }); return }
    await payChoose(planId)
  }

  async function payChoose(planId: PlanId) {
    const plan = planById(planId)
    if (!plan) return
    // Online payment for the new plans is being finalised (new Razorpay plan IDs pending —
    // the old plans were the retired ₹500/₹1,500 amounts). Capture intent and hand to the
    // care team rather than charging a mismatched amount.
    clearPendingPlan()
    toast(`Close Eye ${plan.short} noted — your Presence Manager will reach out to activate it. Online payment is being set up.`)
  }

  // Self-serve upgrade Connect → Care. Opens Razorpay for a NEW Care subscription;
  // the create-subscription function leaves the live Connect row untouched, and the
  // webhook promotes the plan + cancels the old subscription only after this payment
  // activates. The client writes NO subscription state — it just opens checkout and,
  // on success, shows the welcome message while polling for the webhook to land.
  async function startUpgrade() {
    if (busy) return
    if (isFounderFunnelGated(profile?.founder_prelaunch ?? false)) { toast(PRELAUNCH_MEMBERSHIP_NOTE); return }
    // Same collection gate before an upgrade opens payment.
    if (gateNeeded()) { setUpgradeOpen(false); setPreparing({ planId: 'trust', mode: 'upgrade' }); return }
    await payUpgrade()
  }

  async function payUpgrade() {
    const plan = planById('trust')
    setUpgradeOpen(false)
    // Same as above — capture intent; live charging is re-wired when the new plans are set up.
    toast(`Close Eye ${plan?.short ?? 'Presence'} noted — your Presence Manager will reach out to activate it. Online payment is being set up.`)
  }

  // Don't let the sheet close mid-payment (Razorpay is open over it).
  function closeUpgrade() {
    if (busy) return
    setUpgradeOpen(false)
  }

  // The pre-payment collection gate takes over the page until it's satisfied (or cancelled),
  // then hands back to the exact payment path the CTA would have run.
  if (preparing) {
    const prep = preparing
    const plan = planById(prep.planId)
    if (plan) {
      return (
        <div className="flex flex-col">
          <MembershipPrepare
            plan={{ name: plan.name, short: plan.short, price: plan.price }}
            onCancel={() => setPreparing(null)}
            onReady={() => { setPreparing(null); if (prep.mode === 'choose') void payChoose(prep.planId); else void payUpgrade() }}
          />
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col">
      {showActivate && <div className="mb-6"><FunnelSteps step={4} /></div>}
      <PageHeader
        title={showActivate ? `Complete your ${activatePlan?.name ?? 'Close Eye'} membership` : 'Membership'}
        subtitle={showActivate ? 'One last step — activate your membership and your Presence Manager gets to work.' : 'Trusted human presence for the people you love.'}
      />

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
                showActivate && plan.id === pendingPlanId && 'ring-2 ring-green ring-offset-2 ring-offset-ivory',
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
                    ) : activating ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-caption font-semibold text-success"><Check className="h-3 w-3" strokeWidth={3} /> Selected</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-semibold text-green"><Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} /> Activating…</span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-caption font-semibold text-success"><Check className="h-3 w-3" strokeWidth={3} /> Selected</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/12 px-2.5 py-1 text-caption font-semibold text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Payment pending</span>
                      </>
                    )}
                  </div>
                  {active && subscription?.current_end && (
                    <p className="mt-2 text-caption text-muted">Renews on {formatDate(subscription.current_end, region)}</p>
                  )}
                  {!active && !activating && (
                    <Button size="sm" className="mt-3 w-full" disabled={busy !== null} onClick={() => choose(plan.id)}>
                      {busy === plan.id ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Opening…</> : showActivate ? `Activate Close Eye ${plan.short} · ${plan.price}/mo` : 'Complete payment'}
                    </Button>
                  )}
                </div>
              ) : active ? (
                plan.key === 'care' && onConnect ? (
                  // Connect member looking at Care → self-serve upgrade.
                  upgradePaid ? (
                    <div className="mt-7 flex items-center justify-center gap-2 rounded-sm bg-accent-soft/60 px-4 py-3.5 text-center">
                      <Loader2 className="h-4 w-4 animate-spin text-green" strokeWidth={2.5} />
                      <p className="text-caption font-semibold text-green">Activating your Close Eye Presence membership…</p>
                    </div>
                  ) : (
                    <Button size="lg" variant="primary" className="mt-7 w-full" disabled={busy !== null} onClick={() => setUpgradeOpen(true)}>
                      <Sparkles className="h-5 w-5" strokeWidth={2} /> Upgrade to Close Eye Presence
                    </Button>
                  )
                ) : (
                  // Care member looking at Connect → Connect is already included; no downgrade offered.
                  <div className="mt-7 rounded-sm border border-line/70 px-4 py-3.5 text-center">
                    <p className="text-caption text-muted">Included in your Close Eye Presence plan.</p>
                  </div>
                )
              ) : (
                <Button
                  size="lg"
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className="mt-7 w-full"
                  disabled={busy !== null}
                  onClick={() => choose(plan.id)}
                >
                  {busy === plan.id ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Opening…</> : (showActivate && plan.id === pendingPlanId) ? `Activate Close Eye ${plan.short} · ${plan.price}/mo` : plan.cta}
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
        <ol className="mt-4 overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
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
        <div className="mt-4 overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
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
                        <Link href={`/family/book?service=${s.serviceId}&included=1`}>Schedule Monthly Visit</Link>
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

      {/* Self-serve Connect → Care upgrade sheet */}
      <Overlay open={upgradeOpen} onClose={closeUpgrade}>
        {upgradePaid ? (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                <Check className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <h2 className="text-h4 text-ink">You’re now on Close Eye Presence</h2>
            </div>
            <p className="text-body-sm leading-relaxed text-ink">
              Welcome to Close Eye Presence. Your Presence Manager will contact you within 24 hours to schedule your first monthly Presence Visit.
            </p>
            <Button className="w-full" onClick={() => setUpgradeOpen(false)}>Done</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
                <Sparkles className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-h4 text-ink">Upgrade to Close Eye Presence</h2>
                <p className="mt-0.5 text-caption text-muted">Everything in Membership, plus an ongoing trusted local presence.</p>
              </div>
            </div>

            <div className="rounded-sm bg-accent-soft/40 p-4">
              <p className="text-caption font-semibold uppercase tracking-widest text-muted">What you’re adding</p>
              <ul className="mt-3 flex flex-col gap-2.5">
                {careDelta.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-body-sm text-ink">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/12 text-success"><Check className="h-3 w-3" strokeWidth={3} /></span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-baseline justify-between border-t border-line/70 pt-4">
              <span className="text-body-sm text-muted">New monthly membership</span>
              <span className="text-ink"><span className="text-h4 font-extrabold">{planById('trust')?.price}</span><span className="text-body-sm font-medium text-muted">/month</span></span>
            </div>
            <p className="-mt-2 text-caption text-muted">
              This replaces your Close Eye Membership plan — you’re only ever billed for one membership.
            </p>

            <div className="flex gap-2.5">
              <Button variant="secondary" className="flex-1" disabled={busy !== null} onClick={closeUpgrade}>Not now</Button>
              <Button className="flex-1" disabled={busy !== null} onClick={startUpgrade}>
                {busy === 'trust' ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Opening…</> : `Confirm · ${planById('trust')?.price}/mo`}
              </Button>
            </div>
          </div>
        )}
      </Overlay>
    </div>
  )
}
