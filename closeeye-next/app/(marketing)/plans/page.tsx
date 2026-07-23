import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Check, ArrowRight, ChevronDown, Heart, Home, Users, FileText, ShoppingBag } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/reveal'
import { NriOrb } from '@/components/marketing/nri-orb'
import { pricingRegion, price } from '@/lib/pricing'

/**
 * /plans — the ONE commerce destination (IA consolidation, founder-approved).
 * Merges the former /pricing (how do I engage?) + /services (what can Close Eye do?)
 * + /membership into a single page: offer → plans & pricing → Presence tiers →
 * what's included → one decisive CTA. /pricing, /services and /membership 308 here.
 * Pricing is the locked, region-detected model from lib/pricing.ts — never hardcoded.
 */

export const metadata: Metadata = {
  title: 'Plans — One simple way to be there',
  description:
    'Everything Close Eye offers, in one place: what’s included, plans, pricing and comparison. Pay as You Go for occasional support, Membership to stay prepared, or Presence for an ongoing trusted local presence — priced in your local currency.',
}

const JOURNEY = [
  { n: '1', q: 'Do I only need help occasionally?', a: 'Pay as You Go' },
  { n: '2', q: 'Do I want my family to be prepared?', a: 'Membership' },
  { n: '3', q: 'Do I want someone consistently looking after them?', a: 'Presence' },
]

const CATEGORIES = [
  { icon: Heart, name: 'Health & Wellbeing', items: ['Wellness Visit', 'Hospital Companion', 'Doctor Appointment Assistance', 'Medication Pickup', 'Recovery Support', 'Health Observation'] },
  { icon: Home, name: 'Home & Property', items: ['Home Check', 'Property Inspection', 'Utility Verification', 'Maintenance Coordination', 'Housekeeping Coordination'] },
  { icon: Users, name: 'Family Support', items: ['Guardian Visit', 'Companion Visit', 'Festival Visit', 'Emergency Response', 'Video Check-ins', 'Family Updates'] },
  { icon: FileText, name: 'Administration', items: ['Banking Assistance', 'Documentation Support', 'Government Office Visits', 'Insurance Coordination', 'Legal Coordination'] },
  { icon: ShoppingBag, name: 'Concierge', items: ['Grocery Shopping', 'Airport Pickup', 'Local Errands', 'Travel Assistance', 'Personal Requests'] },
]

function Tick() {
  return <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2.5} aria-hidden />
}

export default async function PlansPage() {
  // Region-detected currency: India → INR, everywhere else → USD. Same plans, only the price changes.
  const country = (await headers()).get('x-vercel-ip-country')
  const region = pricingRegion(country)
  const inr = region === 'IN'

  const PRESENCE_TIERS = [
    { name: 'Essential', amount: price('presence', region), note: 'Regular trusted visits.', ev: null as string | null,
      lines: ['A trusted local presence your family can rely on', 'Regular, familiar time with your loved one', 'Proof of every visit — never a guess', 'You stay informed, wherever you are', 'Early awareness of what’s changing'] },
    { name: 'Plus', amount: price('presencePlus', region), note: 'Coordinated care, managed for you.', ev: 'Everything in Essential, plus', emph: true,
      lines: ['One trusted point of coordination for your family’s needs', 'Support during important medical moments', 'Your family’s care, organised for you', 'Appointments handled, so you don’t have to', 'A regular check-in on how things are going', 'First priority whenever you need us'] },
    { name: 'Family Office', amount: price('familyOffice', region), note: 'Everything, handled — a dedicated team.', ev: 'Everything in Plus, plus',
      lines: ['A dedicated team who know your family', 'Your family home, watched over', 'Help navigating important decisions and paperwork', 'Documents and records, handled', 'Whatever your family needs, arranged', 'Calm, coordinated help in a crisis', 'Support at the level of a family office'] },
  ]

  return (
    <>
      {/* ── Hero ── */}
      <header className="bg-ivory pt-32 sm:pt-36">
        <Container className="pb-4 text-center">
          <Reveal className="mx-auto flex max-w-measure flex-col items-center">
            <span className="eyebrow is-centered">Plans</span>
            <h1 className="mt-6 text-h1">One simple way to be there.</h1>
            <p className="mx-auto mt-6 max-w-prose text-lead text-muted">
              Everything Close Eye offers, in one place — one calm question: <span className="text-ink">how would you like Close Eye to be there for your family?</span>
            </p>
          </Reveal>
        </Container>
      </header>

      <Section tone="ivory">
        {/* ── Which plan am I? ── */}
        <Stagger className="grid gap-4 sm:grid-cols-3">
          {JOURNEY.map((j) => (
            <StaggerItem key={j.n} className="flex flex-col gap-2 rounded-lg border border-line bg-card p-6">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-caption font-semibold text-green">{j.n}</span>
              <p className="text-h4">{j.q}</p>
              <p className="text-body-sm font-semibold text-green">→ {j.a}</p>
            </StaggerItem>
          ))}
        </Stagger>

        {/* ── Three plans ── */}
        <div className="mx-auto mt-12 grid max-w-md gap-5 lg:max-w-none lg:grid-cols-3 lg:items-stretch">
          {/* Pay as You Go */}
          <Reveal className="flex flex-col rounded-lg border border-line bg-card p-8 shadow-sm">
            <p className="text-h4">Pay as You Go</p>
            <p className="mt-1 text-body-sm text-muted">Best for occasional support — help from time to time.</p>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-body-sm font-semibold text-muted">From</span>
              <span className="font-display text-h2 text-ink">{price('payg', region)}</span>
              <span className="text-body-sm text-muted">/ service</span>
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {['Wellness Visits', 'Hospital Companion', 'Doctor Appointment Assistance', 'Medicine Pickup & Home Visits', 'Property Verification', 'Emergency Support'].map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-body-sm text-ink"><Tick />{s}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Button asChild size="lg" className="w-full"><Link href="/auth?intent=join">Start with your family</Link></Button>
              <a href="#included" className="text-body-sm font-semibold text-green hover:underline">See everything included →</a>
            </div>
          </Reveal>

          {/* Membership — emphasized */}
          <Reveal delay={0.06} className="relative flex flex-col rounded-lg border-2 border-accent-soft bg-card p-8 shadow-lg lg:-translate-y-4">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-inverse px-3 py-1 text-caption font-semibold uppercase tracking-wider text-content-inverse shadow-md">Most Popular</span>
            <p className="text-h4">Close Eye Membership</p>
            <p className="mt-1 text-body-sm text-muted">Stay prepared, before you ever need help.</p>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="font-display text-h2 text-ink">{price('membership', region)}</span>
              <span className="text-body-sm text-muted">/ month</span>
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              {['Priority booking when you need it', 'Your family’s details, ready in advance', 'Emergency information on hand', 'Support a message away, on WhatsApp', 'Member pricing on every service', 'Faster response when it matters', 'Family records, safe and private'].map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-body-sm text-ink"><Tick />{s}</li>
              ))}
            </ul>
            <div className="mt-8">
              <Button asChild size="lg" className="w-full"><Link href="/auth?intent=join">Start with your family</Link></Button>
            </div>
          </Reveal>

          {/* Presence — flagship */}
          <Reveal delay={0.12} className="flex flex-col rounded-lg border border-line bg-card p-8 shadow-sm">
            <p className="text-h4">Close Eye Presence</p>
            <p className="mt-1 text-body-sm text-muted">An ongoing, trusted local presence for your family. Our flagship.</p>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="text-body-sm font-semibold text-muted">From</span>
              <span className="font-display text-h2 text-ink">{price('presence', region)}</span>
              <span className="text-body-sm text-muted">/ month</span>
            </p>
            <p className="mt-4 flex-1 text-body-sm text-ink">
              A dedicated Guardian who truly knows your family, coordinated by a Presence Manager — tailored to how much support you want.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="w-full"><a href="#presence">Explore Presence Plans</a></Button>
            </div>
          </Reveal>
        </div>

        {/* ── Presence tiers — revealed on demand (comparison) ── */}
        <details id="presence" className="group mt-14 scroll-mt-28 overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <NriOrb size="sm" />
              <span>
                <span className="block text-h4">Presence plans</span>
                <span className="block text-caption text-muted">Essential · Plus · Family Office — choose after you’ve chosen Presence</span>
              </span>
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" strokeWidth={2} aria-hidden />
          </summary>
          <div className="grid gap-4 p-6 pt-0 sm:grid-cols-3">
            {PRESENCE_TIERS.map((pl) => (
              <div key={pl.name} className={pl.emph ? 'flex flex-col rounded-md border-2 border-accent-soft bg-card p-6' : 'flex flex-col rounded-md border border-line bg-ivory p-6'}>
                <p className="text-h4">{pl.name}</p>
                <p className="mt-1 flex items-baseline gap-1"><span className="font-display text-h3 text-ink">{pl.amount}</span><span className="text-body-sm text-muted">/ month</span></p>
                <p className="mt-1 text-body-sm text-muted">{pl.note}</p>
                {pl.name === 'Family Office' && inr && <p className="mt-1 text-caption text-muted">Custom scope? Contact us.</p>}
                {pl.ev && <p className="mt-4 text-caption font-semibold uppercase tracking-wider text-green">{pl.ev}</p>}
                <ul className="mt-3 flex flex-col gap-2">
                  {pl.lines.map((l) => (<li key={l} className="flex items-start gap-2 text-body-sm text-ink"><Tick />{l}</li>))}
                </ul>
              </div>
            ))}
          </div>
          <p className="px-6 pb-6 text-center text-caption text-muted">Kept off the main view on purpose — you only choose a tier once Presence is right for you.</p>
        </details>

        <Reveal className="mt-10 text-center">
          <p className="text-caption text-muted">Prices shown in {inr ? 'Indian Rupees (₹)' : 'US Dollars ($)'}, based on your region. Same plans and care everywhere — only the currency changes.</p>
        </Reveal>
      </Section>

      {/* ── What's included — the full catalogue (formerly /services) ── */}
      <Section tone="card" id="included" className="scroll-mt-28">
        <Reveal className="mx-auto max-w-measure text-center">
          <span className="eyebrow is-centered">What’s included</span>
          <h2 className="mt-4 font-display text-h2">Everything Close Eye can do.</h2>
          <p className="mx-auto mt-4 max-w-prose text-lead text-muted">
            The full catalogue — available on demand with Pay as You Go, or woven into a Presence plan.
          </p>
        </Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon
            return (
              <StaggerItem key={cat.name} className={i === CATEGORIES.length - 1 && CATEGORIES.length % 2 === 1 ? 'rounded-lg border border-line bg-ivory p-7 shadow-sm sm:col-span-2' : 'rounded-lg border border-line bg-ivory p-7 shadow-sm'}>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden /></span>
                  <h3 className="text-h4">{cat.name}</h3>
                </div>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {cat.items.map((s) => (
                    <li key={s} className="rounded-full border border-line bg-card px-3.5 py-1.5 text-body-sm text-ink">{s}</li>
                  ))}
                </ul>
              </StaggerItem>
            )
          })}
        </Stagger>
      </Section>

      {/* ── One decisive close ── */}
      <Section tone="ink">
        <Reveal className="mx-auto flex max-w-measure flex-col items-center text-center">
          <NriOrb size="lg" />
          <h2 className="mt-6 font-display text-h2 text-content-inverse">Not sure which fits? We’ll help you choose.</h2>
          <p className="mt-4 text-lead text-content-inverse/70">Start with your family, or talk to a real person first.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="primary" onDark>
              <Link href="/auth?intent=join">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
            </Button>
            <Button asChild size="lg" variant="secondary" onDark><Link href="/contact">Talk to an advisor</Link></Button>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
