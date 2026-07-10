'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MapPin, ShieldCheck, HeartHandshake, MessageCircle, Camera, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/ui/logo'
import { setFounderSessionHint, setFounderRef } from '@/lib/founder-funnel'
import { FOUNDER_LAUNCH_LABEL } from '@/lib/launch'
import { whatsappLink } from '@/lib/site'

const FOUNDER = 'Krishna'
const REGISTER_HREF = '/auth?intent=join'
const founderWhatsApp = () =>
  whatsappLink(`Hi ${FOUNDER}, I saw the Close Eye invitation and I'd like to ask about my family in Hyderabad.`)

/** A calm, letter-like column — a personal invitation, not a marketing page. */
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto w-full max-w-2xl px-5 ${className}`}>{children}</section>
}

const TRUST_SIGNALS = [
  { icon: MapPin, label: 'Hyderabad-based' },
  { icon: ShieldCheck, label: 'Secure online payments' },
  { icon: HeartHandshake, label: 'Human-first service' },
  { icon: MessageCircle, label: 'Personal founder support' },
]

const HOW = [
  { icon: HeartHandshake, title: 'A trusted Guardian visits your parents', body: 'A real person from Close Eye, at a time that suits your family.' },
  { icon: Clock, title: 'They spend real, unhurried time', body: 'Company, a gentle check that all is well, a little warmth in the day.' },
  { icon: Camera, title: 'You receive a warm Presence Story', body: 'A few honest words and photos, so you can breathe easier from wherever you are.' },
]

const QUESTIONS = [
  { q: 'Is Close Eye only in Hyderabad?', a: 'Yes, for now. We would rather do one city genuinely well than stretch ourselves thin.' },
  { q: 'Who visits my parents?', a: 'A trusted Close Eye Guardian — a real person we know, not a stranger from an app.' },
  { q: 'I live abroad. Can I use this?', a: 'Yes. You manage everything from wherever you are; your parents simply need to be in Hyderabad.' },
  { q: 'When am I charged?', a: `Not before ${FOUNDER_LAUNCH_LABEL}. You register now and choose a plan; billing begins only when we open.` },
  { q: 'Can I cancel?', a: 'Of course — there is no lock-in, and nothing to pay until we launch.' },
  { q: 'Is this a medical or emergency service?', a: 'No. Close Eye is about presence, companionship and coordination — not healthcare.' },
]

export default function FounderLandingPage() {
  const params = useParams<{ ref: string }>()
  const ref = params?.ref

  // Entering the founder funnel: remember this visit (session hint) + the ref for
  // attribution. This is what brings Phase 1's pre-launch gate to life for founder
  // visitors — nothing else in the app sets it.
  React.useEffect(() => {
    setFounderSessionHint()
    if (ref) setFounderRef(Array.isArray(ref) ? ref[0]! : ref)
  }, [ref])

  return (
    <div className="min-h-dvh bg-ivory pb-24 text-ink">
      {/* Minimal chrome — just the mark, so the focus stays on the invitation. */}
      <header className="mx-auto flex w-full max-w-2xl items-center gap-2 px-5 pt-7">
        <LogoMark className="h-7 w-7" />
        <span className="text-body-sm font-semibold tracking-tight">Close Eye</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-caption font-semibold text-green">
          <MapPin className="h-3.5 w-3.5" strokeWidth={2} /> Serving Hyderabad
        </span>
      </header>

      <main id="main">
      {/* 1 · HERO — the invitation */}
      <Section className="pt-12 sm:pt-16">
        <h1 className="text-h1 leading-[1.05] tracking-tight text-balance">When you can’t be there, Close Eye can.</h1>
        <p className="mt-5 text-lead leading-relaxed text-ink/90">
          A trusted Close Eye Guardian visits your parents in Hyderabad, spends real time with them, and sends you a warm update after — so you can breathe easier from anywhere.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <Image src="/founder.png" alt={`${FOUNDER}, founder of Close Eye`} width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-full object-cover shadow-sm" />
          <div>
            <p className="text-body font-semibold">Hi, I’m {FOUNDER}.</p>
            <p className="text-body-sm text-muted">Founder, Close Eye</p>
          </div>
        </div>
        <p className="mt-5 text-body leading-relaxed text-muted">
          I’m inviting a small number of families to join before we open on <strong className="font-semibold text-ink">{FOUNDER_LAUNCH_LABEL}</strong>. Registering is free — you’re not charged until then.
        </p>

        <div className="mt-8">
          <Button asChild size="lg"><Link href={REGISTER_HREF}>Register your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link></Button>
        </div>

        {/* Quiet trust signals — real, not testimonials */}
        <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2.5">
          {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-1.5 text-caption font-medium text-muted">
              <Icon className="h-4 w-4 text-green" strokeWidth={1.75} /> {label}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5 text-caption font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-green" /> Launching with our first founding families
          </li>
        </ul>
      </Section>

      <div className="mx-auto my-14 h-px w-full max-w-2xl bg-line/70" />

      {/* 2 · FOUNDER STORY — emotion before product */}
      <Section>
        <h2 className="text-h3 tracking-tight">Why I built this</h2>
        <div className="mt-5 flex flex-col gap-4 text-body leading-relaxed text-ink/90">
          <p>For years, I carried the same worry many families carry today — the quiet ache of being far from the people who raised me.</p>
          <p>Every call ended the same way: “we’re fine, don’t worry.” And every time, I worried a little more — not because anything was wrong, but because I couldn’t see for myself that all was well. I didn’t want a hospital, or an emergency line, or a stranger with a clipboard. I wanted what most of us quietly want: to know that someone kind was looking in on them, sitting with them a while, and telling me honestly how they are.</p>
          <p>So I built Close Eye — not a healthcare service, and not an app that replaces family. It’s a way to stay present in the lives of the people we love, even from far away.</p>
        </div>
      </Section>

      {/* 3 · WHY HYDERABAD — flows as a quiet thought, not a boxed module */}
      <Section className="mt-14">
        <h2 className="text-h3 tracking-tight">Why Hyderabad first?</h2>
        <p className="mt-4 text-body leading-relaxed text-ink/90">
          We’re beginning in Hyderabad because we believe trust is built locally before it can grow nationally. One city, done genuinely well, before anywhere else.
        </p>
      </Section>

      {/* 4 · HOW CLOSE EYE WORKS */}
      <Section className="mt-14">
        <h2 className="text-h3 tracking-tight">What actually happens</h2>
        <ol className="mt-6 flex flex-col gap-4">
          {HOW.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="flex items-start gap-4 rounded-xl border border-line/70 bg-card p-5 shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
              <div>
                <p className="text-body font-semibold">{i + 1}. {title}</p>
                <p className="mt-0.5 text-body-sm leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5 · CHOOSE HOW YOU'D LIKE TO BEGIN — no pricing table, no comparison grid */}
      <Section className="mt-14">
        <h2 className="text-h3 tracking-tight">Choose how you’d like to begin</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-line/70 bg-card p-6 shadow-sm">
            <p className="text-body font-semibold">Close Eye Connect</p>
            <p className="mt-1 text-body-sm font-semibold text-green">₹500 / month</p>
            <p className="mt-3 text-body-sm leading-relaxed text-muted">For families who want trusted coordination, ongoing support, and a simple way to stay connected.</p>
          </div>
          <div className="flex flex-col rounded-xl border border-green/30 bg-card p-6 shadow-sm">
            <p className="text-body font-semibold">Close Eye Care</p>
            <p className="mt-1 text-body-sm font-semibold text-green">₹1,500 / month</p>
            <p className="mt-3 text-body-sm leading-relaxed text-muted">Includes monthly Presence Visits, Presence Stories, and priority coordination.</p>
          </div>
        </div>
        <p className="mt-5 text-body-sm leading-relaxed text-muted">
          You’ll choose your preferred plan during registration. No payment is required before {FOUNDER_LAUNCH_LABEL}.
        </p>
      </Section>

      {/* 6 · REGISTER TODAY / LAUNCH TIMELINE — clean numbered list, no box */}
      <Section className="mt-14">
        <h2 className="text-h3 tracking-tight">Register today. We open on {FOUNDER_LAUNCH_LABEL}.</h2>
        <ol className="mt-6 flex flex-col gap-4">
          {[
            'Register now — create your account and choose a plan. Nothing to pay.',
            `On ${FOUNDER_LAUNCH_LABEL}, we open in Hyderabad.`,
            'We activate your membership and arrange your first Presence Visit.',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3.5 text-body leading-relaxed text-ink/90">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green text-caption font-bold text-ivory">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </Section>

      {/* 7 · QUESTIONS FAMILIES ASK ME */}
      <Section className="mt-14">
        <h2 className="text-h3 tracking-tight">Questions families ask me</h2>
        <dl className="mt-6 flex flex-col divide-y divide-line/70 overflow-hidden rounded-xl border border-line/70 bg-card shadow-sm">
          {QUESTIONS.map(({ q, a }) => (
            <div key={q} className="p-5">
              <dt className="text-body font-semibold">{q}</dt>
              <dd className="mt-1.5 text-body-sm leading-relaxed text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 8 · CLOSE — one calm action, the human fallback quietly beneath it */}
      <Section className="mt-16">
        <div className="flex flex-col items-center rounded-2xl border border-line/70 bg-card px-6 py-11 text-center shadow-sm">
          <h2 className="text-h3 tracking-tight text-balance">Be one of Close Eye’s first families</h2>
          <p className="mt-2 max-w-md text-body-sm leading-relaxed text-muted">It takes two minutes, and there’s nothing to pay today.</p>
          <Button asChild size="lg" className="mt-6"><Link href={REGISTER_HREF}>Register your family <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link></Button>
          <p className="mt-8 max-w-md text-body-sm leading-relaxed text-muted">Would you rather just talk? I read every message myself.</p>
          <Button asChild variant="text" size="md" className="mt-1.5"><a href={founderWhatsApp()} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" strokeWidth={1.75} /> Message {FOUNDER} on WhatsApp</a></Button>
        </div>
      </Section>
      </main>

      <footer className="mx-auto mt-16 w-full max-w-2xl px-5 text-center">
        <div className="border-t border-line/70 pt-6 text-caption text-muted">
          Close Eye · Serving Hyderabad · Launching {FOUNDER_LAUNCH_LABEL}
        </div>
      </footer>
    </div>
  )
}
