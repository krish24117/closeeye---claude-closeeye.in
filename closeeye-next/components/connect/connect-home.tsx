'use client'

/**
 * The Close Eye Connect homepage — the global front door. Founder-approved narrative (2026-07-21):
 * Hero → More than AI → Living understanding → Three levels (Intelligence · Coordination · Presence)
 * → Understanding then action → Vision → Privacy → CTA. It sells the STORY: Family Intelligence that
 * becomes real-world help, tiered by where the loved one lives. Global-first; Care/Presence appear as
 * depth, never an India-first door.
 *
 * TOKENS: renders inside the `.cx` scope, which redefines --ink as a raw hex — so `bg-ink` breaks
 * (invisible) while `text-ink` harmlessly inherits the correct .cx ink. The DARK section therefore
 * uses the HSL inverse tokens (surface-inverse / content-inverse), and all custom SVG uses
 * currentColor (never raw hex) so nothing trips the design-system lint.
 */
import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Check, Lock, ShieldCheck, EyeOff } from 'lucide-react'
import { signInWithGoogle } from '@/lib/auth-actions'
import { GoogleGlyph } from '@/components/ui/google-glyph'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'


function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = React.useState(false)
  async function go() {
    if (busy) return
    setBusy(true)
    const { error } = await signInWithGoogle()
    if (error) setBusy(false)
  }
  return (
    <button onClick={go} disabled={busy}
      className="inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-full !bg-surface-inverse px-7 text-body-sm font-semibold !text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-60">
      {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Connecting to Google…</>
        : <><span className="grid h-6 w-6 place-items-center rounded-full bg-ivory"><GoogleGlyph className="h-[1.15rem] w-[1.15rem]" /></span> {label}</>}
    </button>
  )
}

/** Gentle scroll-reveal — fade + rise once, and instant for reduced-motion. No new dependency. */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={cn('transition duration-700 ease-out motion-reduce:!translate-y-0 motion-reduce:!opacity-100 motion-reduce:transition-none',
        inView ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0', className)}>
      {children}
    </div>
  )
}

const Eyebrow = ({ children, on = 'light' }: { children: React.ReactNode; on?: 'light' | 'dark' }) => (
  <p className={cn('mb-4 inline-flex items-center gap-2.5 text-caption font-bold uppercase tracking-[0.16em]', on === 'dark' ? 'text-accent-soft' : 'text-green')}>
    <span className={cn('h-px w-6', on === 'dark' ? 'bg-accent-soft' : 'bg-green')} />{children}
  </p>
)


const FACTS = [
  'Morning walk at six',
  'Blood pressure, checked every week',
  'Her doctor of fifteen years',
  'Passport expires next month',
  'Visits her grandson every Sunday',
]

export function ConnectHome() {
  return (
    <div className="bg-ivory text-ink">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-line/50 bg-ivory/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/connect" aria-label="Close Eye home"><Logo lockup="horizontal" height={26} /></Link>
          <Link href="/auth" className="text-body-sm font-semibold text-muted transition-colors hover:text-ink">Sign in</Link>
        </div>
      </header>

      <main id="main">
      {/* 1 · HERO */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 sm:pt-20">
        <Reveal className="mx-auto max-w-[42rem]">
          <h1 className="font-display max-w-[15ch] text-h1 text-ink">The intelligence that knows the people you love.</h1>
          <p className="mt-7 max-w-[44ch] text-lead text-muted">Your family’s private intelligence. It remembers, understands and helps — wherever your family lives.</p>
          <div className="mt-9 flex flex-col items-start gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <GoogleButton label="Create Family Space" />
              <a href="#how" className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full border border-line bg-card px-6 text-body-sm font-semibold text-ink transition-colors hover:bg-accent-soft/40">
                See how it works <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>
            <p className="text-caption text-muted">Private by design · Free to begin</p>
          </div>
        </Reveal>
      </section>

      <div className="mx-auto max-w-5xl border-t border-line" />

      {/* 2 · MORE THAN AI */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <Reveal className="mx-auto max-w-[42rem]">
          <Eyebrow>A new category</Eyebrow>
          <h2 className="font-display text-h2 text-ink">More than AI.<br />Family Intelligence.</h2>
          <div className="mt-9 flex flex-col gap-5 border-t border-line pt-8">
            <div className="flex items-start gap-4">
              <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full border border-line" />
              <p className="font-display text-h4 leading-snug text-muted">Traditional AI starts every conversation from zero.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-green ring-4 ring-green/15" />
              <p className="font-display text-h4 leading-snug text-ink">Close Eye builds understanding that grows with your family.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 3 · LIVING UNDERSTANDING (dark) */}
      <section className="bg-surface-inverse text-content-inverse antialiased" style={{ fontSynthesis: 'none' }}>
        <div className="mx-auto max-w-5xl px-6 py-12">
          <Reveal className="mx-auto max-w-[42rem]">
            <Eyebrow on="dark">What makes it different</Eyebrow>
            <h2 className="font-display text-h2 text-content-inverse">Every answer begins<br />with understanding.</h2>
            <div className="mt-8 grid gap-1">
              <div className="py-4">
                <p className="text-caption font-semibold uppercase tracking-[0.16em] text-content-inverse/60">Before Close Eye</p>
                <p className="font-display mt-2 text-h4 leading-snug text-content-inverse/60">Every important detail lives in a different conversation.</p>
              </div>
              <div className="h-px bg-content-inverse/10" />
              <div className="py-4">
                <p className="text-caption font-semibold uppercase tracking-[0.16em] text-content-inverse/60">With Close Eye</p>
                <p className="font-display mt-2 text-h3 leading-snug text-content-inverse">Your family shares one understanding — and it grows every day.</p>
              </div>
            </div>
          </Reveal>

          <Reveal className="mx-auto mt-12 max-w-[27rem]">
            <div className="rounded-3xl border border-content-inverse/10 bg-content-inverse/5 p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-body-sm font-bold text-surface-inverse">M</span>
                <span className="font-display text-h4 text-content-inverse">Mom</span>
              </div>
              <div className="mt-5 flex flex-col gap-3">
                {FACTS.map((f, i) => (
                  <Reveal key={f} delay={i * 90}>
                    <p className="flex items-start gap-2.5 text-body-sm text-content-inverse">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" strokeWidth={2.4} />{f}
                    </p>
                  </Reveal>
                ))}
              </div>
              <p className="mt-5 flex items-center gap-2 text-caption text-content-inverse/60">
                Still learning about her<span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-accent-soft" />
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3.5 · REAL PRESENCE — the emotional bridge from Family Intelligence to real human presence */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <Reveal className="mx-auto max-w-[42rem]">
          <Eyebrow>Real presence</Eyebrow>
          <h2 className="font-display text-h2 text-muted">When intelligence isn’t enough.</h2>
          <p className="font-display mt-2 text-h2 text-ink">Close Eye can be there.</p>
          <p className="mt-7 max-w-[42ch] text-lead text-muted">When you can’t be there, Close Eye coordinates trusted people to help with life’s important moments.</p>
          <p className="font-display mt-6 max-w-[34ch] text-h4 leading-snug text-ink">Not everything needs an emergency. Sometimes it simply needs someone you trust to be there.</p>
          <Link href="/care" className="mt-8 inline-flex items-center gap-1.5 text-body-sm font-semibold text-green transition-colors hover:text-green/80">
            Learn about Close Eye Care <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </Reveal>
      </section>

      <div className="mx-auto max-w-5xl border-t border-line" />

      {/* 4 · THREE LEVELS */}
      <section id="how" className="scroll-mt-20">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <Reveal className="mx-auto max-w-[44rem]">
            <Eyebrow>How it grows</Eyebrow>
            <h2 className="font-display max-w-[20ch] text-h2 text-ink">Close Eye grows with your family’s needs.</h2>
            <p className="font-display mt-6 max-w-[34ch] text-h4 leading-snug text-muted">
              A daughter in London. A son in Toronto. A mother in Hyderabad. Close Eye begins the same for every family — then does more, where it can.
            </p>
          </Reveal>

          <Reveal className="mt-12 grid gap-5 sm:grid-cols-3">
            {/* Intelligence */}
            <div className="flex flex-col rounded-3xl border border-line bg-card p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="text-h3 leading-none">🌍</span>
              <h3 className="font-display mt-4 text-h3 text-ink">Intelligence</h3>
              <p className="mt-1.5 text-body-sm font-semibold text-green">Available worldwide</p>
              <div className="mt-6 flex flex-col gap-3">
                <p className="font-display text-lead leading-snug text-ink">Always knows what matters.</p>
                <p className="font-display text-lead leading-snug text-ink">Understanding grows every day.</p>
              </div>
              <span className="mt-auto flex items-center gap-2 pt-7 text-caption font-bold text-ink"><span className="h-1.5 w-1.5 rounded-full bg-green" />Available worldwide</span>
            </div>
            {/* Care Coordination */}
            <div className="flex flex-col rounded-3xl border border-line bg-card p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="text-h3 leading-none">🇮🇳</span>
              <h3 className="font-display mt-4 text-h3 text-ink">Care Coordination</h3>
              <p className="mt-1.5 text-body-sm font-semibold text-green">Available across India</p>
              <p className="font-display mt-6 text-lead leading-snug text-ink">We coordinate the help your family needs.</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {['Hospital appointments', 'Insurance & medical paperwork', 'Government services', 'Dedicated Presence Manager'].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-body-sm text-muted"><span className="h-1 w-1 shrink-0 rounded-full bg-green/70" />{x}</li>
                ))}
              </ul>
              <span className="mt-auto flex items-center gap-2 pt-7 text-caption font-bold text-ink"><span className="h-1.5 w-1.5 rounded-full bg-green" />Available across India</span>
            </div>
            {/* Real Presence */}
            <div className="flex flex-col rounded-3xl border border-line bg-card p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="text-h3 leading-none">📍</span>
              <h3 className="font-display mt-4 text-h3 text-ink">Real Presence</h3>
              <p className="mt-1.5 text-body-sm font-semibold text-green">Available in Hyderabad</p>
              <p className="font-display mt-6 text-lead leading-snug text-ink">When being there matters, someone trusted is.</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {['Hospital companion', 'Wellness visits', 'Emergency support'].map((x) => (
                  <li key={x} className="flex items-center gap-2.5 text-body-sm text-muted"><span className="h-1 w-1 shrink-0 rounded-full bg-green/70" />{x}</li>
                ))}
              </ul>
              <span className="mt-auto flex flex-col pt-7 text-caption font-bold text-ink">
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-green" />Hyderabad today</span>
                <span className="ps-3.5 font-medium text-muted">More cities coming</span>
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-5xl border-t border-line" />

      {/* 5 · IN ACTION */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <Reveal>
          <Eyebrow>See it in action</Eyebrow>
          <h2 className="font-display text-h2 text-ink">Understanding, then action.</h2>
        </Reveal>
        <Reveal className="mx-auto mt-12 max-w-[25rem]">
          <div className="overflow-hidden rounded-3xl border border-line bg-ivory shadow-xl">
            {/* app header — gives the chat product context, so the bubbles need no floating avatar */}
            <div className="flex items-center gap-2.5 border-b border-line/70 bg-card px-4 py-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-inverse"><span className="h-1.5 w-1.5 rounded-full bg-accent-soft" /></span>
              <span className="text-caption font-semibold text-ink">Connect</span>
            </div>
            {/* chat */}
            <div className="flex flex-col gap-3 p-4">
              <div className="max-w-[78%] self-end rounded-2xl rounded-br-sm bg-surface-inverse px-3.5 py-2.5 text-body-sm leading-snug text-content-inverse">
                Dad has a hospital appointment tomorrow.
              </div>
              <div className="max-w-[88%] self-start rounded-2xl rounded-tl-sm border border-line bg-card px-3.5 py-3 text-body-sm leading-snug text-ink shadow-sm">
                <p>I’ve already prepared the reports he usually carries. <span className="text-muted">His insurance card is in Documents.</span></p>
                <p className="mt-2.5 text-caption text-muted">Since he lives in Hyderabad, I can also:</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {['Arrange a hospital companion', 'Coordinate transportation', 'Share updates with you during the visit'].map((x) => (
                    <p key={x} className="flex items-start gap-2 font-medium text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2.4} /><span>{x}</span></p>
                  ))}
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-inverse px-3.5 py-2 text-caption font-bold text-content-inverse">Arrange Companion</span>
                  <span className="rounded-full border border-line bg-ivory px-3.5 py-2 text-caption font-bold text-ink">View Appointment</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 6 · VISION */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <Reveal className="mx-auto max-w-[42rem]">
          <span className="mb-9 block w-[138px]" aria-hidden>
            <svg viewBox="0 0 150 88" fill="none" className="h-auto w-full text-green">
              <path d="M75 44 L22 20 M75 44 L128 18 M75 44 L38 70 M75 44 L116 66" stroke="currentColor" strokeWidth="1.4" opacity="0.28" />
              <circle cx="22" cy="20" r="4.5" fill="currentColor" opacity="0.5" />
              <circle cx="128" cy="18" r="4.5" fill="currentColor" opacity="0.5" />
              <circle cx="38" cy="70" r="4.5" fill="currentColor" opacity="0.5" />
              <circle cx="116" cy="66" r="4.5" fill="currentColor" opacity="0.5" />
              <circle cx="75" cy="44" r="15" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
              <circle cx="75" cy="44" r="8" fill="currentColor" />
            </svg>
          </span>
          <h2 className="font-display max-w-[15ch] text-h2 text-ink">Every family deserves to be understood.</h2>
          <p className="font-display mt-6 max-w-[34ch] text-h4 leading-snug text-muted">When you can’t be there, Close Eye helps you stay close.</p>
        </Reveal>
      </section>

      <div className="mx-auto max-w-5xl border-t border-line" />

      {/* 7 · PRIVACY */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <Reveal className="mx-auto max-w-[42rem]">
          <Eyebrow>Privacy</Eyebrow>
          <h2 className="font-display text-h2 text-ink">Everything belongs to your family.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-card px-5 py-3 text-body-sm font-semibold text-ink"><Lock className="h-4 w-4 text-green" strokeWidth={2} />Encrypted</span>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-card px-5 py-3 text-body-sm font-semibold text-ink"><ShieldCheck className="h-4 w-4 text-green" strokeWidth={2} />Private</span>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-card px-5 py-3 text-body-sm font-semibold text-ink"><EyeOff className="h-4 w-4 text-green" strokeWidth={2} />Never sold</span>
          </div>
        </Reveal>
      </section>

      {/* 8 · FINAL CTA */}
      <section className="border-t border-line/70">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <Reveal>
            <h2 className="font-display text-h2 text-ink">Start your Family Space.</h2>
            <p className="mt-5 max-w-[42ch] text-lead text-muted">Understanding grows over time. The earlier you begin, the more helpful Close Eye becomes.</p>
            <p className="font-display mt-5 max-w-[34ch] text-lead text-ink">Start with understanding. Add care only when you need it.</p>
            <div className="mt-9 flex flex-col items-start gap-3">
              <GoogleButton label="Create Family Space" />
              <Link href="/auth" className="inline-flex items-center gap-1 text-caption font-semibold text-muted hover:text-ink">or continue with email <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
            </div>
          </Reveal>
        </div>
      </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-line/60 bg-ivory">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-6 py-14 text-center">
          <Logo lockup="horizontal" height={24} />
          <p className="max-w-[34ch] text-body-sm text-muted">The intelligence that knows the people you love.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-caption font-semibold text-muted">
            <a href="#how" className="transition-colors hover:text-ink">See how it works</a>
            <Link href="/privacy" className="transition-colors hover:text-ink">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-ink">Terms</Link>
          </div>
          <p className="text-caption text-muted/70">Family Intelligence, worldwide · Care where available</p>
        </div>
      </footer>
    </div>
  )
}
