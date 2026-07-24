import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, ArrowRight, ClipboardList, ShieldCheck, HeartHandshake, FileText } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Section, SectionHeading } from '@/components/ui/section'
import { ImageFrame } from '@/components/ui/image-frame'
import { Button } from '@/components/ui/button'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/reveal'
import { NriOrb } from '@/components/marketing/nri-orb'

/**
 * /how-it-works — redesigned into the current Trusted-Presence design system (founder 2026-07-24).
 * Replaces the old Connect ".verify" paper page: now a full marketing page (navbar + footer chrome)
 * built entirely from the existing primitives — Section/SectionHeading, serif display headings,
 * ivory/sage tokens, Reveal/Stagger — matching the homepage and /plans. Terminology follows the
 * LOCKED naming: the Guardian visits; the Presence Manager coordinates.
 */

export const metadata: Metadata = {
  title: { absolute: 'How it Works — Close Eye' },
  description:
    'How Close Eye works: tell us about your family, we match a verified Guardian overseen by a Presence Manager, the visit happens, and proof reaches you the same day — wherever you are.',
  alternates: { canonical: '/how-it-works' },
}

const STEPS = [
  { icon: ClipboardList, n: '1', h: 'Tell us about your family', p: 'Who they are, their routine, and what to keep an eye on. It takes a minute — and everything stays private to your family.' },
  { icon: ShieldCheck, n: '2', h: 'We match a verified Guardian', p: 'ID-verified, background-checked, and trained — matched to your family and overseen by your dedicated Presence Manager.' },
  { icon: HeartHandshake, n: '3', h: 'The visit happens', p: 'Unhurried, familiar time — a chat over tea, a short walk, a good meal, gentle medication reminders. Presence, not a checklist.' },
  { icon: FileText, n: '4', h: 'Proof reaches you, same day', p: 'Photos, a warm note, and how they truly are — reviewed and approved by your Presence Manager, delivered wherever you live.' },
]

const ROLES = [
  { h: 'Your Presence Manager', tag: 'Coordinates', p: 'One dedicated human who knows your family by name — schedules every visit, reviews every report, and is who you talk to.' },
  { h: 'Your Guardian', tag: 'Visits', p: 'The trusted, verified person who actually goes — spends real time with your loved one and notices what changes.' },
]

const PROOF = ['A verified update after every single visit', 'Photos and a warm, human note', 'Early awareness when something changes']

export default function HowItWorksPage() {
  return (
    <>
      {/* ── Hero ── */}
      <header className="bg-ivory pt-32 sm:pt-36">
        <Container className="pb-4 text-center">
          <Reveal className="mx-auto flex max-w-measure flex-col items-center">
            <span className="eyebrow is-centered">How it Works</span>
            <h1 className="mt-6 font-display text-h1">From far away, to truly there.</h1>
            <p className="mx-auto mt-6 max-w-prose text-lead text-muted">
              Four simple steps between you and the calm of knowing — <span className="text-ink">someone you trust is with the people you love.</span>
            </p>
          </Reveal>
        </Container>
      </header>

      {/* ── The four steps ── */}
      <Section tone="ivory">
        <Stagger className="grid gap-5 sm:grid-cols-2">
          {STEPS.map((s) => {
            const Icon = s.icon
            return (
              <StaggerItem key={s.n} className="rounded-lg border border-line bg-card p-7 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft font-display text-h4 text-green">{s.n}</span>
                  <Icon className="h-5 w-5 text-green" strokeWidth={1.75} aria-hidden />
                </div>
                <h2 className="mt-5 text-h4">{s.h}</h2>
                <p className="mt-2 text-body-sm leading-relaxed text-muted">{s.p}</p>
              </StaggerItem>
            )
          })}
        </Stagger>
      </Section>

      {/* ── The two roles, never blurred ── (#roles: deep-linked from the Trust Center hub) */}
      <Section tone="card" id="roles" className="scroll-mt-28">
        <SectionHeading serif eyebrow="Two people, one promise" title="One coordinates. One is there."
          intro="You always know who does what — and who to talk to." />
        <Stagger className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {ROLES.map((r) => (
            <StaggerItem key={r.h} className="rounded-lg border border-line bg-ivory p-7 shadow-sm">
              <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold uppercase tracking-wider text-green">{r.tag}</span>
              <h3 className="mt-4 text-h4">{r.h}</h3>
              <p className="mt-2 text-body-sm leading-relaxed text-muted">{r.p}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-10 text-center">
          <Link href="/trust-safety" className="inline-flex items-center gap-1 text-body-sm font-semibold text-green hover:underline">
            How every Guardian is verified <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </Reveal>
      </Section>

      {/* ── You stay connected — with proof ── */}
      <Section tone="ivory">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <ImageFrame src="/hero-2.png" ratio="landscape" gradient className="shadow-md"
              alt="A Close Eye Guardian sits beside an elderly man at home as he waves during a video call with his son abroad." />
          </Reveal>
          <Reveal direction="left">
            <span className="eyebrow">Never a guess</span>
            <h2 className="mt-4 font-display text-h2">You stay connected — with proof.</h2>
            <p className="mt-4 max-w-prose text-lead text-muted">
              Every visit ends with something you can see and keep, not a vague reassurance.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {PROOF.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-body-sm text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2.5} />{b}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* ── One decisive close ── */}
      <Section tone="ink">
        <Reveal className="mx-auto flex max-w-measure flex-col items-center text-center">
          <NriOrb size="lg" />
          <h2 className="mt-6 font-display text-h2 text-content-inverse">Ready when you are.</h2>
          <p className="mt-4 text-lead text-content-inverse/70">Tell us about your family — their first visit can be this week.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="primary" onDark>
              <Link href="/auth?intent=join">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
            </Button>
            <Button asChild size="lg" variant="secondary" onDark><Link href="/plans">See plans</Link></Button>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
