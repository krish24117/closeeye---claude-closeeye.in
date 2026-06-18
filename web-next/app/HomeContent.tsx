'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  Shield, Camera, Clock, RefreshCw, AlertCircle, Banknote, ChevronRight,
  UserPlus, BadgeCheck, Smartphone, CheckCircle2, Star,
  ChevronLeft, Plus, Minus, Mail, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import { PLANS } from '@/lib/subscription-plans'
import { ON_DEMAND_SERVICES } from '@/lib/one-time-services'

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const TRUST = [
  { icon: Shield,       title: '5-Layer Background Verification',  desc: 'Police clearance, address verification, identity checks, employment history and two personal references.', tag: 'Verified before Day 1' },
  { icon: Camera,       title: 'Photo-Verified Visit Reports',      desc: 'Every visit generates a time-stamped report with photos and a wellbeing summary — sent within the hour.',   tag: 'Real-time accountability' },
  { icon: Clock,        title: 'Trained for Elder Companionship',   desc: 'Companions are trained in first-response basics, medication reminders and emotional engagement.',           tag: 'Certified & supervised' },
  { icon: RefreshCw,    title: 'Guaranteed Replacement in 24 hrs', desc: "If your companion is ever unavailable, we arrange a briefed replacement. Your parents never experience a gap.", tag: 'Zero-gap guarantee' },
  { icon: AlertCircle,  title: 'Emergency Protocol Built In',       desc: "Every companion knows your family's doctor, nearest hospital and your emergency contact.",                  tag: 'Pre-briefed always' },
  { icon: Banknote,     title: 'No Cash, No Keys — Ever',           desc: 'Companions never handle cash or hold property keys unsupervised. All payments flow through the platform.',  tag: 'Structural safeguard' },
]

const PLAN = PLANS[0]
const CHEAPEST_ON_DEMAND_PRICE = Math.min(...ON_DEMAND_SERVICES.map(s => s.paise)) / 100

const SERVICE_TEASERS = [
  { price: PLAN.priceLabel, name: PLAN.name, desc: PLAN.tagline },
  ...ON_DEMAND_SERVICES.slice(0, 3).map(s => ({ price: s.price, name: s.name, desc: s.desc })),
]

const HOW_STEPS = [
  {
    icon: UserPlus,
    n: '1',
    title: 'Tell us about your parents',
    desc: 'Share their address, preferences, health notes and emergency contacts. Takes 5 minutes.',
  },
  {
    icon: BadgeCheck,
    n: '2',
    title: 'We match a verified companion',
    desc: 'Every companion completes a 5-layer background check before they are matched to your family.',
  },
  {
    icon: Smartphone,
    n: '3',
    title: 'Receive visit reports & updates',
    desc: 'Photos, notes and a wellbeing summary land in your dashboard and WhatsApp — within the hour.',
  },
]

const VERIFICATION = [
  {
    title: 'Police verification check',
    desc: 'Every companion completes a police clearance certificate and government-issued identity verification before they\'re approved.',
  },
  {
    title: 'In-person interview',
    desc: 'We meet every companion face-to-face to assess their character, communication, and genuine care for elders.',
  },
  {
    title: 'Reference checks',
    desc: 'Two personal references are contacted and verified for every companion before they join our network.',
  },
  {
    title: 'Ongoing rating system',
    desc: 'Families rate every visit. Companions who fall below our standards are retrained or removed.',
  },
]

const TESTIMONIALS = [
  {
    initials: 'PS',
    name: 'Priya S.',
    location: 'Houston, TX',
    stars: 5,
    text: "My mother lives alone in Hyderabad, and I used to call her three times a day just to feel okay. With Close Eye, I get a real report with photos after every visit. It's the closest I've felt to actually being there.",
  },
  {
    initials: 'RM',
    name: 'Rajesh M.',
    location: 'Dubai, UAE',
    stars: 5,
    text: "Coordinating care for my father in Bengaluru from Dubai felt impossible until Close Eye. The companion checks his medications and sends a quick WhatsApp update after every visit. It's given my whole family real peace of mind.",
  },
  {
    initials: 'AK',
    name: 'Anita K.',
    location: 'London, UK',
    stars: 5,
    text: "My dad in Chennai is stubborn about asking for help, but the companion built a genuine rapport with him within two visits. I finally feel like someone is actually keeping an eye on him, not just checking a box.",
  },
]

const HOME_FAQS = [
  {
    q: 'How are companions verified?',
    a: 'Every companion completes a 5-layer verification — police clearance, identity verification, address confirmation, employment history, and two personal references — before their first visit.',
  },
  {
    q: 'What cities do you currently serve?',
    a: 'We currently serve families in Hyderabad and are actively expanding to Bengaluru, Chennai, Mumbai, and Delhi. Join the waitlist to be notified the moment we launch near your loved one.',
  },
  {
    q: 'How does a visit work step by step?',
    a: 'You tell us about your parents, we match a verified companion, and you receive a detailed visit report with photos on your dashboard and WhatsApp — usually within an hour.',
  },
  {
    q: 'Can I speak with the companion before the first visit?',
    a: 'Yes. On monthly plans, we introduce you to your dedicated companion over WhatsApp before their first visit. For one-time visits, you can request this introduction too.',
  },
  {
    q: "What if I'm not satisfied with a visit?",
    a: "Let us know within 24 hours and we'll address it directly — including a free follow-up visit or a refund, depending on the situation.",
  },
  {
    q: 'How do I pay from abroad?',
    a: "All payments are processed securely via Razorpay (UPI, cards, net banking). International card support is rolling out — WhatsApp us if you're paying from outside India.",
  },
  {
    q: "Is my parents' information kept private?",
    a: "Visit reports and your loved one's information are shared only with the family contacts you register — never with anyone else. Companions sign a strict confidentiality agreement.",
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HomeContent({ initialWaitlistCount }: { initialWaitlistCount: number }) {
  const waitlistCount = initialWaitlistCount
  const [tIdx, setTIdx] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  const [checklistEmail, setChecklistEmail] = useState('')
  const [checklistStatus, setChecklistStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [checklistError, setChecklistError] = useState('')

  const prevT = () => setTIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const nextT = () => setTIdx(i => (i + 1) % TESTIMONIALS.length)

  async function handleChecklistSubmit(e: React.FormEvent) {
    e.preventDefault()
    setChecklistStatus('submitting')
    setChecklistError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: checklistEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Something went wrong.')
      setChecklistStatus('success')
    } catch (err) {
      setChecklistStatus('error')
      setChecklistError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <main className="overflow-x-hidden">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-green-900 via-green-800 to-green-700 text-white px-4 sm:px-6 py-20 md:py-32 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(74,155,106,.18),transparent_70%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-green-200 text-xs font-medium px-4 py-1.5 rounded-full mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Trusted by NRI families across 5 countries
          </div>
          <p className="text-green-300 text-sm mb-3 font-medium tracking-wide">A Support System, Not A Replacement</p>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif leading-tight mb-5">
            Your Trusted Eyes on<br />
            <em className="text-green-200 not-italic">Aging Parents Back Home</em>
          </h1>
          <p className="text-white/75 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-8 sm:mb-10">
            Verified companion visits, real-time reports, and peace of mind — for NRI families
            across the US, UK, UAE, Canada &amp; Australia.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/waitlist"
              className="bg-white text-green-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-green-50 transition-colors text-sm sm:text-base shadow-sm"
            >
              Join Waitlist
            </Link>
            <a
              href="#how-it-works"
              className="border border-white/30 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm sm:text-base"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-6 text-white/40 text-xs tracking-widest">USA · UK · UAE · CA · AU</p>

          {/* Hero stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-10 sm:mt-14 bg-white/10 rounded-2xl overflow-hidden border border-white/10">
            {[
              [`${waitlistCount}+`, 'families on waitlist'],
              ['Hyderabad', 'live city'],
              ['Beta families', 'love it — word of mouth'],
              ['<1hr', 'report delivery'],
            ].map(([v, l]) => (
              <div key={l} className="py-4 sm:py-5 px-3 sm:px-4 bg-white/5 text-center">
                <strong className="block font-serif text-xl sm:text-2xl text-white">{v}</strong>
                <span className="text-white/50 text-xs">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 1. Waitlist counter strip ─────────────────────────────── */}
      <section className="bg-green-900 border-b border-green-800/60 py-3.5 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
            <span className="text-green-400 text-xs font-semibold uppercase tracking-widest">Live</span>
          </span>
          <p className="text-white/80 text-sm">
            <strong className="font-serif text-base text-white">{waitlistCount}+</strong>
            {' '}families from the USA, UK, UAE, Canada and Australia are waiting.
          </p>
          <Link
            href="/waitlist"
            className="text-xs font-semibold text-green-300 hover:text-green-200 underline underline-offset-2 whitespace-nowrap transition-colors"
          >
            Reserve your spot →
          </Link>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-6xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Our Services</p>
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900 mb-10 sm:mb-12">
          A trusted presence, on the days<br className="hidden md:block" /> you cannot be there.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {SERVICE_TEASERS.map(s => (
            <Link
              key={s.name}
              href="/services"
              className="group border border-gray-100 rounded-2xl p-5 sm:p-6 hover:shadow-card-hover hover:-translate-y-0.5 transition-all bg-white"
            >
              <span className="inline-block text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-4">{s.price}</span>
              <h3 className="font-serif text-lg text-green-900 mb-2">{s.name}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{s.desc}</p>
              <span className="text-green-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                Learn more <ChevronRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 2. How It Works ──────────────────────────────────────── */}
      <section id="how-it-works" className="bg-green-50 px-4 sm:px-6 py-16 sm:py-20 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">How it works</p>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900">
              Three steps to real peace of mind.
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Connector line — desktop only */}
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-green-200 z-0" />

            {HOW_STEPS.map(s => (
              <div key={s.n} className="relative z-10 flex flex-col items-center text-center">
                {/* Icon circle */}
                <div className="w-20 h-20 rounded-full bg-white shadow-card border border-green-100 flex flex-col items-center justify-center mb-5 group-hover:shadow-card-hover">
                  <s.icon size={26} className="text-green-700 mb-0.5" />
                  <span className="text-[10px] font-bold text-green-400 leading-none">STEP {s.n}</span>
                </div>
                <h3 className="font-semibold text-green-900 mb-2 text-sm sm:text-base leading-snug">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 sm:mt-12 text-center">
            <Link
              href="/waitlist"
              className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm"
            >
              Get started <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3. How We Verify Every Companion ─────────────────────── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Our vetting process</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900 mb-4">
            How We Verify Every Companion
          </h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
            Every companion earns your trust before they knock on the door.
            No shortcuts. No exceptions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {VERIFICATION.map(v => (
            <div key={v.title} className="flex items-start gap-4 rounded-2xl p-6 sm:p-7 border border-gray-100 shadow-card bg-white">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={22} className="text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 text-base mb-1.5">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400 tracking-wide">
          Companions are re-verified every 6 months and can be removed by a family at any time.
        </p>
      </section>

      {/* ── Trust signals ─────────────────────────────────────────── */}
      <section className="bg-green-50 px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Why families trust us</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900 mb-10 sm:mb-12">
            We don't just send someone.<br className="hidden md:block" />
            <em className="not-italic text-green-600">We send the right someone.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {TRUST.map(t => (
              <div key={t.title} className="bg-white rounded-2xl p-5 sm:p-6 border border-green-100 hover:shadow-card transition-shadow">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                  <t.icon size={20} className="text-green-700" />
                </div>
                <h3 className="font-semibold text-green-900 mb-2 text-sm">{t.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{t.desc}</p>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{t.tag}</span>
              </div>
            ))}
          </div>

          {/* Trust stats bar */}
          <div className="grid grid-cols-3 gap-px mt-8 sm:mt-10 bg-green-100 rounded-2xl overflow-hidden border border-green-100">
            {[
              [`${waitlistCount}+`, 'Families on waitlist'],
              ['100%', 'Background-checked'],
              ['<1hr', 'Report delivery'],
            ].map(([v, l]) => (
              <div key={l} className="py-5 sm:py-7 text-center bg-white">
                <strong className="block font-serif text-2xl sm:text-3xl text-green-800">{v}</strong>
                <span className="text-gray-400 text-xs">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Testimonials carousel ──────────────────────────────── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">What families say</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900">
            Real words from real families.
          </h2>
        </div>

        <div className="relative">
          {/* Track */}
          <div className="overflow-hidden rounded-2xl">
            <div
              ref={trackRef}
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${tIdx * 100}%)` }}
            >
              {TESTIMONIALS.map(t => (
                <div
                  key={t.name}
                  className="min-w-full px-1"
                >
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-7 sm:p-10">
                    {/* Stars */}
                    <div className="flex gap-1 mb-5">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <blockquote className="font-serif text-lg sm:text-xl text-green-900 leading-relaxed mb-7 italic">
                      &quot;{t.text}&quot;
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {t.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-green-900 text-sm">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.location}</p>
                      </div>
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-green-500 bg-green-100 px-2 py-0.5 rounded-full">Early Adopter Feedback</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={prevT}
              aria-label="Previous testimonial"
              className="w-9 h-9 rounded-full border border-green-200 hover:border-green-400 flex items-center justify-center text-green-600 hover:text-green-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTIdx(i)}
                aria-label={`Testimonial ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === tIdx ? 'w-6 bg-green-700' : 'w-2 bg-green-200 hover:bg-green-300'}`}
              />
            ))}
            <button
              onClick={nextT}
              aria-label="Next testimonial"
              className="w-9 h-9 rounded-full border border-green-200 hover:border-green-400 flex items-center justify-center text-green-600 hover:text-green-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────── */}
      <section className="bg-green-50 px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Pricing</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900 mb-3">Simple, transparent pricing.</h2>
          <p className="text-gray-500 text-sm sm:text-base">
            One monthly plan, plus on-demand help whenever you need it.
          </p>
        </div>

        <div className="max-w-sm mx-auto bg-white rounded-2xl border-2 border-green-800 p-6 sm:p-7">
          <h3 className="font-serif text-xl text-green-900 mb-1">{PLAN.name}</h3>
          <p className="text-xs text-gray-400 mb-4">{PLAN.tagline}</p>
          <p className="font-serif text-3xl text-green-900 mb-5">{PLAN.priceLabel}</p>
          <ul className="space-y-2 mb-6">
            {PLAN.features.slice(0, 4).map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-600 font-bold flex-shrink-0">✓</span> {f}
              </li>
            ))}
          </ul>
          <Link
            href="/services"
            className="block text-center bg-green-800 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            View all services →
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Plus on-demand services from ₹{CHEAPEST_ON_DEMAND_PRICE.toLocaleString('en-IN')} — no subscription needed.
        </p>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-3">Questions</p>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-green-900">
            Things families ask us first.
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {HOME_FAQS.map((f, i) => (
            <div key={f.q} className="py-1">
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                aria-expanded={faqOpen === i}
                aria-controls={`home-faq-a-${i}`}
                className="w-full min-h-[44px] flex justify-between items-center py-4 text-left gap-4 group"
              >
                <span className={clsx(
                  'font-semibold text-base transition-colors',
                  faqOpen === i ? 'text-green-700' : 'text-green-900 group-hover:text-green-700'
                )}>
                  {f.q}
                </span>
                <span className={clsx(
                  'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                  faqOpen === i ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 group-hover:bg-green-50 group-hover:text-green-600'
                )}>
                  {faqOpen === i ? <Minus size={14} /> : <Plus size={14} />}
                </span>
              </button>
              <div
                id={`home-faq-a-${i}`}
                className={clsx(
                  'overflow-hidden transition-all duration-300 ease-in-out',
                  faqOpen === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                )}
              >
                <p className="pb-4 text-base text-gray-500 leading-relaxed">{f.a}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-8">
          <Link href="/faq" className="text-sm font-semibold text-green-700 hover:text-green-900 underline underline-offset-2">
            See all FAQs →
          </Link>
        </p>
      </section>

      {/* ── Email capture ────────────────────────────────────────── */}
      <section className="bg-green-50 px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-lg mx-auto text-center">
          <Mail size={28} className="text-green-700 mx-auto mb-4" />
          <h2 className="font-serif text-2xl sm:text-3xl text-green-900 mb-3">
            Get the Free NRI Family Care Checklist
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mb-7">
            10 signs your elderly parent may need extra support — and what to do about it.
          </p>

          {checklistStatus === 'success' ? (
            <p className="bg-white border border-green-200 rounded-xl p-5 text-green-800 text-sm font-medium">
              You&apos;re in! Check your inbox for the checklist shortly.
            </p>
          ) : (
            <form onSubmit={handleChecklistSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={checklistEmail}
                onChange={e => setChecklistEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 min-h-[44px] border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-green-600 transition-colors bg-white"
              />
              <button
                type="submit"
                disabled={checklistStatus === 'submitting'}
                className="min-h-[44px] bg-green-800 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-6 rounded-xl transition-colors text-base whitespace-nowrap flex items-center justify-center gap-2"
              >
                {checklistStatus === 'submitting' ? <Loader2 size={15} className="animate-spin" /> : null}
                Send Me the Checklist
              </button>
            </form>
          )}
          {checklistStatus === 'error' && (
            <p className="text-red-600 text-xs mt-3">{checklistError}</p>
          )}
        </div>
      </section>

      {/* ── What every visit looks like ────────────────────────────── */}
      <section className="bg-green-900 text-white px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
          {/* Sample report card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs text-green-300 font-semibold uppercase tracking-widest">✓ Visit completed</span>
              <span className="ml-auto text-xs font-semibold bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full">Sample Report</span>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm flex-shrink-0">PS</div>
              <div>
                <p className="font-semibold text-sm">Priya Sharma</p>
                <p className="text-xs text-green-300">Companion · Hyderabad</p>
              </div>
            </div>
            <p className="text-white/80 italic text-sm leading-relaxed mb-6">
              &quot;Had a lovely tea with auntie today. She&apos;s looking forward to your call tonight. Medication taken on time.&quot;
            </p>
            <ul className="space-y-2">
              {[
                'Mood & general wellbeing',
                'Health & medication check',
                'Home & safety observations',
                'Photos from the visit',
                'Notes for the family',
              ].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs sm:text-sm text-white/60">
                  <span className="text-green-400 flex-shrink-0">📋</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-4">What every visit looks like</p>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl mb-5">&quot;Mom is doing great.&quot;</h2>
            <p className="text-white/65 leading-relaxed mb-8 text-sm sm:text-base">
              Every visit generates a detailed, time-stamped report delivered to your WhatsApp and dashboard
              within the hour. Real photos. Real notes. Real peace of mind from 10,000 km away.
            </p>
            <Link
              href="/waitlist"
              className="inline-block border border-white/30 text-white font-medium px-7 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Join Waitlist →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-green-800 to-green-700 text-white px-4 sm:px-6 py-16 sm:py-20 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl mb-4">
          Join the families we look after across India.
        </h2>
        <p className="text-white/65 mb-8 text-sm sm:text-base">
          {waitlistCount} families are already on the waitlist. Be first in your city.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/waitlist"
            className="bg-white text-green-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-green-50 transition-colors text-sm"
          >
            Join Waitlist
          </Link>
          <Link
            href="/contact"
            className="border border-white/30 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            Book a call
          </Link>
        </div>
      </section>

    </main>
  )
}
