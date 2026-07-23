import type { Metadata } from 'next'
import { Check, ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Section, SectionHeading } from '@/components/ui/section'
import { ImageFrame } from '@/components/ui/image-frame'
import { Button } from '@/components/ui/button'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/reveal'
import { NriOrb } from '@/components/marketing/nri-orb'
import { whatsappLink } from '@/lib/site'

export const metadata: Metadata = {
  title: 'For Families Abroad — Trusted Presence in India',
  description:
    'Close Eye becomes your family’s trusted presence in India — a verified Guardian who truly knows them, and proof of how they’re doing after every visit. For NRIs, priced in your currency.',
}

const OUTCOMES = [
  { w: 'Presence', lead: 'Someone spends meaningful time with your loved one.', points: ['A walk, a chat, a shared cup of tea', 'Unhurried, familiar, continuous'] },
  { w: 'Observation', lead: 'Someone notices small changes before they become bigger concerns.', points: ['Mood, mobility, appetite', 'Gentle medication reminders'] },
  { w: 'Connection', lead: 'Someone helps your family stay connected across distance.', points: ['A video call home to you', 'Updates that reach you, wherever you are'] },
]

const REASONS = [
  'I know someone actually went.',
  'I don’t have to keep asking my mother if she’s okay.',
  'I can see, not imagine, how she’s doing.',
]

const STATS = [
  { n: '100%', l: 'of visits verified & approved' },
  { n: 'Same day', l: 'report after every visit' },
  { n: '24/7', l: 'emergency escalation protocol' },
  { n: 'Founding 100', l: 'families we’re onboarding first' },
]

const TRUST = [
  { h: 'Verified identity & background', p: 'Every Guardian is ID-verified and background-checked before they ever meet your family.' },
  { h: 'Human oversight', p: 'A dedicated Presence Manager schedules, reviews, and approves every visit.' },
  { h: 'Founder’s commitment', p: 'We treat every family as we’d treat our own parents. If we ever fall short, we make it right.' },
  { h: 'Privacy commitment', p: 'Your family’s information is private to you, never sold, and yours to delete anytime.' },
]

const FAQ = [
  { q: 'Who is my Guardian?', a: 'A local, vetted, background-checked person trained to spend time with and gently look after your loved one — overseen by a Presence Manager who coordinates their care.' },
  { q: 'What if there’s an emergency?', a: 'Your Guardian is briefed on your family’s contacts and local emergency numbers, and escalates to your Presence Manager — and to you — immediately.' },
  { q: 'Which cities do you cover?', a: 'Hyderabad today, with more cities opening soon. Tell us where your family lives and we’ll let you know.' },
  { q: 'How do I pay from abroad?', a: 'Securely in your own currency (USD, GBP, AED). No Indian bank account needed.' },
  { q: 'Can I cancel or change?', a: 'Anytime. Change your Guardian, reschedule, pause, or cancel from your family space.' },
  { q: 'Is our information private?', a: 'Yes — private to your family, never sold. You can withdraw or delete it whenever you like.' },
]

const CHECKLIST = ['Wellbeing', 'Meals', 'Medication reminder', 'Short walk']

export default function NriPage() {
  const cta = whatsappLink()
  return (
    <>
      {/* ── Hero ── */}
      <header className="bg-ivory pt-32 sm:pt-36">
        <Container className="pb-10 sm:pb-14">
          <Reveal className="flex max-w-measure flex-col items-start">
            <span className="eyebrow">A Trusted Presence Platform</span>
            <NriOrb size="lg" className="mt-6" />
            <h1 className="mt-6 font-display text-h1">Your family is never&nbsp;alone.</h1>
            <p className="mt-3 font-display text-h3 text-muted">Even when you’re thousands of miles away.</p>
            <p className="mt-6 max-w-prose text-lead text-muted">
              Close Eye becomes your family’s trusted presence — a Guardian who truly knows them, and
              verified proof of how they’re doing. Never a guess.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href={cta} target="_blank" rel="noopener noreferrer">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#how">How it works</a>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-muted">
              {['Verified & background-checked Guardians', 'Verified proof, every visit', 'Cancel anytime'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-green" strokeWidth={2.5} />{t}</li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-caption text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-green" /> On the ground in Hyderabad today · more cities soon
            </p>
          </Reveal>
        </Container>
      </header>

      {/* ── Presence (image-led) ── */}
      <Section tone="card">
        <Reveal className="mx-auto max-w-measure text-center">
          <ImageFrame src="/trust.png" ratio="landscape" gradient priority className="shadow-lg"
            alt="A Close Eye Guardian and an elderly woman sit close together at home, smiling as they look through an old family photo album over tea." />
          <span className="eyebrow is-centered mt-10">What presence really means</span>
          <h2 className="mt-4 font-display text-h2">Presence isn’t a checklist.</h2>
          <p className="mx-auto mt-4 max-w-prose text-lead text-muted">
            It’s someone who knows your family, notices what changes, and is there when you can’t be.
          </p>
        </Reveal>
      </Section>

      {/* ── How it works ── */}
      <Section tone="ivory" id="how">
        <SectionHeading serif eyebrow="How it works" title="Trusted presence, in three steps." />
        <Stagger className="mt-14 grid gap-5 sm:grid-cols-3">
          {[
            { n: '1', h: 'Tell us about your family', p: 'Who they are, their routine, and what to keep an eye on. It takes a minute.' },
            { n: '2', h: 'We match a Guardian', p: 'Verified and background-checked — matched to your family and overseen by a Presence Manager.' },
            { n: '3', h: 'You stay connected — with proof', p: 'Photos, notes, and check-ins after every visit. Proof of how they’re doing, not guesses.' },
          ].map((s) => (
            <StaggerItem key={s.n} className="rounded-lg border border-line bg-card p-7 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft font-display text-h4 text-green">{s.n}</span>
              <h3 className="mt-5 text-h4">{s.h}</h3>
              <p className="mt-2 text-body-sm text-muted">{s.p}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ── What trusted presence looks like ── */}
      <Section tone="card">
        <SectionHeading serif eyebrow="More than a visit" title="What trusted presence looks like." />
        <Stagger className="mt-14 grid gap-5 sm:grid-cols-3">
          {OUTCOMES.map((o) => (
            <StaggerItem key={o.w} className="rounded-lg border border-line bg-ivory p-7 shadow-sm">
              <p className="font-display text-h4 text-green">{o.w}</p>
              <p className="mt-2 text-body text-ink">{o.lead}</p>
              <ul className="mt-4 flex flex-col gap-2">
                {o.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-body-sm text-muted"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2.5} />{pt}</li>
                ))}
              </ul>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ── Why families choose ── */}
      <Section tone="ivory">
        <SectionHeading serif eyebrow="Why families choose Close Eye" title="The relief, in their words." />
        <Stagger className="mt-14 grid gap-5 sm:grid-cols-3">
          {REASONS.map((r) => (
            <StaggerItem key={r} className="rounded-lg border border-accent-soft bg-accent-soft/40 p-7">
              <span className="font-display text-h2 leading-none text-green/60">“</span>
              <p className="mt-3 font-display text-h4 text-ink">{r}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ── Trust (dark) ── */}
      <Section tone="ink">
        <SectionHeading serif tone="light" eyebrow="The part that matters most"
          title="How we make a stranger someone you trust."
          intro="You can’t be there to vet them. So we do it for you — and we never ask you to take it on faith." />
        <Stagger className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s) => (
            <StaggerItem key={s.l} className="rounded-md border border-content-inverse/10 bg-content-inverse/[0.04] p-5 text-center">
              <p className="font-display text-h3 text-accent-soft">{s.n}</p>
              <p className="mt-2 text-caption text-content-inverse/70">{s.l}</p>
            </StaggerItem>
          ))}
        </Stagger>
        <Stagger className="mt-4 grid gap-4 sm:grid-cols-2">
          {TRUST.map((t) => (
            <StaggerItem key={t.h} className="rounded-md border border-content-inverse/12 bg-content-inverse/[0.04] p-6">
              <span aria-hidden className="text-lead text-accent-soft">◉</span>
              <h3 className="mt-1 text-h4 text-content-inverse">{t.h}</h3>
              <p className="mt-2 text-body-sm text-content-inverse/70">{t.p}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ── Signature: the visit report ── */}
      <Section tone="ivory">
        <SectionHeading serif eyebrow="This is exactly what you receive" title="Proof, not guesses." />
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
      </Section>

      {/* ── Memory + connection ── */}
      <Section tone="card">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <ImageFrame src="/hero-2.png" ratio="landscape" gradient className="shadow-md"
              alt="A Close Eye Guardian sits beside an elderly man at home as he waves during a video call with his son abroad." />
          </Reveal>
          <Reveal direction="left">
            <span className="eyebrow">Continuity</span>
            <h2 className="mt-4 font-display text-h2">Close Eye remembers what matters.</h2>
            <p className="mt-4 max-w-prose text-lead text-muted">
              Every visit teaches Close Eye a little more about your family — their routine, their
              health, who’s nearby — and keeps you connected to it all. Ask anything, anytime, and it
              answers from what your family actually knows. Never a guess.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ── Bridge + pricing ── */}
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
            <span className="font-display text-h2">$79<span className="text-body text-muted">/mo</span></span>
          </div>
          <ul className="mt-6 flex flex-col gap-3">
            {['A Guardian who truly knows your family', 'A verified update after every visit', 'A Presence Manager overseeing their care', 'Close Eye remembers what matters'].map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-body-sm text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2.5} />{b}</li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-7 w-full">
            <a href={cta} target="_blank" rel="noopener noreferrer">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></a>
          </Button>
          <p className="mt-4 text-center text-caption text-muted">Priced in your currency · cancel anytime</p>
        </Reveal>
      </Section>

      {/* ── Testimonial ── */}
      <Section tone="card">
        <Reveal className="mx-auto max-w-measure text-center">
          <blockquote className="font-display text-h2 text-ink">“For the first time since I moved, I don’t feel like I’m guessing.”</blockquote>
          <p className="mt-6 text-body-sm text-muted">Arjun, London — his mother in Hyderabad</p>
        </Reveal>
      </Section>

      {/* ── FAQ ── */}
      <Section tone="ivory">
        <SectionHeading serif eyebrow="Good questions" title="Answered plainly." />
        <Stagger className="mx-auto mt-14 grid max-w-4xl gap-x-12 gap-y-8 sm:grid-cols-2">
          {FAQ.map((f) => (
            <StaggerItem key={f.q} className="border-b border-line pb-6">
              <h3 className="text-h4">{f.q}</h3>
              <p className="mt-2 text-body-sm text-muted">{f.a}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* ── Final CTA ── */}
      <Section tone="ink">
        <Reveal className="mx-auto flex max-w-measure flex-col items-center text-center">
          <NriOrb size="lg" />
          <h2 className="mt-6 font-display text-h2 text-content-inverse">Be your family’s trusted presence, from anywhere.</h2>
          <p className="mt-4 text-lead text-content-inverse/70">Start today. Their first visit can be this week.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="primary" onDark>
              <a href={cta} target="_blank" rel="noopener noreferrer">Start with your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></a>
            </Button>
            <Button asChild size="lg" variant="secondary" onDark>
              <a href="#how">How it works</a>
            </Button>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
