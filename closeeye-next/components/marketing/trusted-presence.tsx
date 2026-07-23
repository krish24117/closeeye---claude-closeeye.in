import { Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Section, SectionHeading } from '@/components/ui/section'
import { ImageFrame } from '@/components/ui/image-frame'
import { Button } from '@/components/ui/button'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/reveal'
import { NriOrb } from '@/components/marketing/nri-orb'

/**
 * The Trusted-Presence landing — Close Eye's single front door.
 *
 * Editorial cut (founder 2026-07-23): one idea per screen, ~7 screens along a film arc —
 * Promise → Meaning → Process → Proof → Trust → Pricing → Action. The Visit Report is the
 * centerpiece (Close Eye's strongest proof). Deeper content lives on dedicated pages: detailed
 * Guardian verification → /trust-safety, "remembers what matters" → the Connect product, extra
 * testimonials → /about, full FAQs → Help/Contact. This is sequencing and restraint — the
 * typography, palette, components, spacing and photography are unchanged.
 *
 * `presencePrice` is the region-detected price of the Presence plan (₹8,000 / $100), passed from
 * the page so the homepage always mirrors the app's real pricing — never a hardcoded number.
 */

const FACETS = [
  { w: 'Presence', p: 'Someone who spends real, unhurried time with them.' },
  { w: 'Observation', p: 'Someone who notices small changes early.' },
  { w: 'Connection', p: 'Someone who keeps you close, across the distance.' },
]

const STEPS = [
  { n: '1', h: 'Tell us about your family', p: 'Who they are, their routine, and what to keep an eye on. It takes a minute.' },
  { n: '2', h: 'We match a Guardian', p: 'Verified and background-checked — matched to your family and overseen by a Presence Manager.' },
  { n: '3', h: 'You stay connected — with proof', p: 'Photos, notes, and check-ins after every visit. Proof of how they’re doing, not guesses.' },
]

const TRUST = [
  { h: 'Verified & background-checked', p: 'Every Guardian is ID-verified and background-checked before they ever meet your family.' },
  { h: 'Human oversight', p: 'A dedicated Presence Manager schedules, reviews, and approves every single visit.' },
  { h: '24/7 escalation', p: 'A clear emergency protocol — your Guardian escalates to your Presence Manager, and to you, at once.' },
  { h: 'Private, always', p: 'Your family’s information is private to you, never sold, and yours to delete anytime.' },
]

const CHECKLIST = ['Wellbeing', 'Meals', 'Medication reminder', 'Short walk']

export function TrustedPresenceLanding({ presencePrice }: { presencePrice: string }) {
  return (
    <>
      {/* 1 · PROMISE — the hero */}
      <header className="bg-ivory pt-32 sm:pt-36">
        <Container className="pb-10 sm:pb-14">
          <Reveal className="mx-auto flex max-w-measure flex-col items-center text-center">
            <span className="eyebrow is-centered">A Trusted Presence Platform</span>
            <NriOrb size="lg" className="mt-6" />
            <h1 className="mt-6 font-display text-h1">Your family is never&nbsp;alone.</h1>
            <p className="mt-3 font-display text-h3 text-muted">Even when you’re thousands of miles away.</p>
            <p className="mt-6 max-w-prose text-lead text-muted">
              Close Eye becomes your family’s trusted presence — a Guardian who truly knows them, and
              verified proof of how they’re doing. Never a guess.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth?intent=join">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/how-it-works">How it works</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-body-sm text-muted">
              {['Verified & background-checked Guardians', 'Verified proof, every visit', 'Cancel anytime'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-green" strokeWidth={2.5} />{t}</li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-caption text-muted">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-green" />
                On the ground in Hyderabad · more cities soon
              </span>
            </div>
          </Reveal>
        </Container>
      </header>

      {/* 2 · MEANING — show what presence really is */}
      <Section tone="card">
        <Reveal className="mx-auto max-w-measure text-center">
          <ImageFrame src="/trust.png" ratio="landscape" gradient priority className="shadow-lg"
            alt="A Close Eye Guardian and an elderly woman sit close together at home, smiling as they look through an old family photo album over tea." />
          <span className="eyebrow is-centered mt-10">What presence really means</span>
          <h2 className="mt-4 font-display text-h2">Presence isn’t a checklist.</h2>
          <p className="mx-auto mt-4 max-w-prose text-lead text-muted">
            It’s someone who knows your family, notices what changes, and is there when you can’t be.
          </p>
          <div className="mx-auto mt-10 grid max-w-2xl gap-6 sm:grid-cols-3">
            {FACETS.map((f) => (
              <div key={f.w}>
                <p className="font-display text-h4 text-green">{f.w}</p>
                <p className="mt-1.5 text-body-sm text-muted">{f.p}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* 3 · PROCESS — three steps */}
      <Section tone="ivory">
        <SectionHeading serif eyebrow="How it works" title="Trusted presence, in three steps." />
        <Stagger className="mt-14 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <StaggerItem key={s.n} className="rounded-lg border border-line bg-card p-7 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft font-display text-h4 text-green">{s.n}</span>
              <h3 className="mt-5 text-h4">{s.h}</h3>
              <p className="mt-2 text-body-sm text-muted">{s.p}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* 4 · PROOF — the centerpiece: exactly what you receive after every visit */}
      <Section tone="ivory">
        <SectionHeading serif eyebrow="This is exactly what you receive" title="Proof, not guesses."
          intro="Every visit ends with a report like this — the heart of Close Eye." />
        <Stagger className="mx-auto mt-14 flex max-w-md flex-col gap-4 rounded-lg border border-line bg-card p-6 shadow-lg sm:p-8">
          <StaggerItem className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft font-semibold text-green">L</span>
              <span>
                <span className="block font-semibold text-ink">A visit with Lakshmi</span>
                <span className="block text-caption text-muted">Banjara Hills, Hyderabad</span>
              </span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-semibold text-green"><Check className="h-3.5 w-3.5" strokeWidth={3} />Verified</span>
          </StaggerItem>
          <StaggerItem className="flex items-center gap-2 text-caption font-semibold text-green">
            <span className="h-1.5 w-1.5 rounded-full bg-green" /> Guardian checked in · Sunday, 10:14 IST
          </StaggerItem>
          <StaggerItem className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => <span key={i} className="aspect-square rounded-md bg-accent-soft" />)}
          </StaggerItem>
          <StaggerItem className="text-body-sm text-ink">Mood today: <span className="font-semibold text-green">cheerful and chatty</span></StaggerItem>
          <StaggerItem className="flex flex-wrap gap-2">
            {CHECKLIST.map((c) => (
              <span key={c} className="flex items-center gap-1 rounded-full border border-line bg-ivory px-3 py-1 text-caption text-ink"><Check className="h-3.5 w-3.5 text-green" strokeWidth={2.5} />{c}</span>
            ))}
          </StaggerItem>
          <StaggerItem className="rounded-md bg-ivory p-4 text-body-sm text-ink">
            “Lakshmi was cheerful today. We walked by the lake for about 20 minutes and she ate a good lunch. Her right knee ached a little on the stairs — I’ve noted it so we can keep an eye on it.”
          </StaggerItem>
          <StaggerItem className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-caption text-muted">
            <span>Close Eye Guardian · Priya M.</span>
            <span>Presence Manager approved ✓</span>
          </StaggerItem>
          <StaggerItem className="flex items-center gap-2 rounded-md border border-accent-soft bg-accent-soft/40 px-4 py-3 text-caption font-semibold text-green">
            <Check className="h-4 w-4" strokeWidth={2.5} /> Report delivered to you — wherever you are.
          </StaggerItem>
        </Stagger>
        {/* the one testimonial the homepage keeps */}
        <Reveal className="mx-auto mt-14 max-w-measure text-center">
          <blockquote className="font-display text-h3 text-ink">“For the first time since I moved, I don’t feel like I’m guessing.”</blockquote>
          <p className="mt-4 text-body-sm text-muted">Arjun, London — his mother in Hyderabad</p>
        </Reveal>
      </Section>

      {/* 5 · TRUST — one concise reason-to-believe (detail lives on /trust-safety) */}
      <Section tone="ink">
        <SectionHeading serif tone="light" eyebrow="The part that matters most"
          title="Why families trust Close Eye."
          intro="You can’t be there to vet them. So we do — and we never ask you to take it on faith." />
        <Stagger className="mt-12 grid gap-4 sm:grid-cols-2">
          {TRUST.map((t) => (
            <StaggerItem key={t.h} className="rounded-md border border-content-inverse/12 bg-content-inverse/[0.04] p-6">
              <span aria-hidden className="text-lead text-accent-soft">◉</span>
              <h3 className="mt-1 text-h4 text-content-inverse">{t.h}</h3>
              <p className="mt-2 text-body-sm text-content-inverse/70">{t.p}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-10 text-center">
          <Button asChild variant="secondary" onDark>
            <Link href="/trust-safety">How we verify every Guardian <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
          </Button>
        </Reveal>
      </Section>

      {/* 6 · PRICING — the real app price, region-detected */}
      <Section tone="ivory">
        <Reveal className="mx-auto max-w-measure text-center">
          <h2 className="font-display text-h2">Peace of mind shouldn’t depend on distance.</h2>
          <p className="mx-auto mt-4 max-w-prose text-lead text-muted">
            One membership. A trusted presence for your family, and proof for you — from wherever you are.
          </p>
        </Reveal>
        <Reveal className="mx-auto mt-12 w-full max-w-md rounded-lg border border-accent-soft bg-card p-8 shadow-lg">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-h4 font-semibold text-ink">Trusted Presence</span>
            <span className="font-display text-h2">{presencePrice}<span className="text-body text-muted">/mo</span></span>
          </div>
          <ul className="mt-6 flex flex-col gap-3">
            {['A Guardian who truly knows your family', 'A verified update after every visit', 'A Presence Manager overseeing their care', 'Cancel anytime'].map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-body-sm text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2.5} />{b}</li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-7 w-full">
            <Link href="/auth?intent=join">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
          </Button>
          <p className="mt-4 text-center text-caption text-muted">
            Priced in your currency · cancel anytime · <Link href="/plans" className="font-semibold text-green hover:underline">see all plans</Link>
          </p>
        </Reveal>
      </Section>

      {/* 7 · ACTION — one decisive call to action */}
      <Section tone="ink">
        <Reveal className="mx-auto flex max-w-measure flex-col items-center text-center">
          <NriOrb size="lg" />
          <h2 className="mt-6 font-display text-h2 text-content-inverse">Be your family’s trusted presence, from anywhere.</h2>
          <p className="mt-4 text-lead text-content-inverse/70">Start today. Their first visit can be this week.</p>
          <div className="mt-9">
            <Button asChild size="lg" variant="primary" onDark>
              <Link href="/auth?intent=join">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
            </Button>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
