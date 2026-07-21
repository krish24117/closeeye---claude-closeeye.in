/**
 * Close Eye Care — the dedicated Real Presence page the homepage's "Real presence" section links to.
 * The homepage creates curiosity; THIS page gives the complete explanation. It lives in the (connect)
 * group so it inherits the same .cx editorial language (Newsreader serif, Inter chrome).
 *
 * COLOR RULE (founder 2026-07-21): each pillar owns a colour. Care = human presence = SOFT SAGE GREEN
 * (accent-soft), distinct from the cream of the Intelligence homepage. So sage carries the identity
 * here — the hero band and the availability card — with dark green for emphasis. Cohesive, understated.
 * TOKENS: inside .cx, `bg-ink` is broken (raw hex) — the dark button uses surface-inverse (HSL).
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: { absolute: 'Close Eye Care — real presence, when it matters' },
  description: 'When intelligence isn’t enough, Close Eye coordinates trusted people to help your family in the real world — hospital companions, wellness visits, documentation and more.',
  alternates: { canonical: '/care' },
}

const serif = { fontFamily: 'var(--font-newsreader), Georgia, "Times New Roman", serif' } as const

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 inline-flex items-center gap-2.5 text-caption font-bold uppercase tracking-[0.16em] text-green">
    <span className="h-px w-6 bg-green" />{children}
  </p>
)

const SERVICES: { name: string; desc: string }[] = [
  { name: 'Hospital companions', desc: 'Someone trusted by their side for appointments, admissions and procedures.' },
  { name: 'Family wellness visits', desc: 'A caring check-in on how they’re really doing — with a report for you.' },
  { name: 'Government documentation', desc: 'The paperwork and queues that shouldn’t fall on family who live far away.' },
  { name: 'Insurance coordination', desc: 'Claims, approvals and the follow-ups, handled on your family’s behalf.' },
  { name: 'Court attendance support', desc: 'A trusted presence for hearings and legal formalities.' },
  { name: 'Property visits', desc: 'Eyes on a home, land or asset when no one can be there in person.' },
  { name: 'Appointment coordination', desc: 'Scheduling, reminders, and someone to see it through.' },
  { name: 'And more, over time', desc: 'New forms of presence, added as families need them.' },
]

export default function CarePage() {
  return (
    <div className="bg-ivory text-ink">
      <header className="sticky top-0 z-50 border-b border-line/50 bg-ivory/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/connect" aria-label="Close Eye home"><Logo lockup="horizontal" height={26} /></Link>
          <Link href="/auth" className="text-body-sm font-semibold text-muted transition-colors hover:text-ink">Sign in</Link>
        </div>
      </header>

      <main id="main">
        {/* HERO — sage: the colour of presence & care */}
        <section className="bg-accent-soft/40">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <div className="mx-auto max-w-[42rem]">
              <Eyebrow>Close Eye Care</Eyebrow>
              <h1 style={serif} className="max-w-[16ch] text-h1 text-ink">When being there matters, someone trusted is.</h1>
              <p className="mt-7 max-w-[46ch] text-lead text-muted">Close Eye coordinates trusted people to help your family in the real world. Where you can’t be, we can.</p>
            </div>
          </div>
        </section>

        {/* SERVICES — the complete explanation the homepage withholds */}
        <section className="mx-auto max-w-5xl px-6 py-14">
          <div className="mx-auto max-w-[42rem]">
            <Eyebrow>How Care helps</Eyebrow>
            <h2 style={serif} className="text-h2 text-ink">Ways we can be there.</h2>
            <div className="mt-10 divide-y divide-line border-t border-line">
              {SERVICES.map((s) => (
                <div key={s.name} className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:gap-6">
                  <h3 style={serif} className="shrink-0 text-h4 text-ink sm:w-56">{s.name}</h3>
                  <p className="text-body leading-relaxed text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AVAILABILITY — honest, and sage */}
        <section className="mx-auto max-w-5xl px-6 pb-14">
          <div className="mx-auto max-w-[42rem] rounded-3xl bg-accent-soft/40 p-7 sm:p-8">
            <p className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.16em] text-green"><span className="h-1.5 w-1.5 rounded-full bg-green" />Available in Hyderabad today</p>
            <p style={serif} className="mt-3 text-h4 leading-snug text-ink">More cities, as trust grows.</p>
            <p className="mt-2 max-w-[48ch] text-body-sm leading-relaxed text-muted">Your Family Space works everywhere from day one. Care activates city by city, wherever Close Eye is present.</p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-line/70">
          <div className="mx-auto max-w-3xl px-6 py-14 text-center">
            <h2 style={serif} className="text-h2 text-ink">Start with understanding.</h2>
            <p style={serif} className="mx-auto mt-5 max-w-[34ch] text-lead text-ink">Add care only when you need it.</p>
            <div className="mt-8 flex items-center justify-center">
              <Link href="/connect" className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-full bg-surface-inverse px-7 text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90">
                Back to Close Eye <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60 bg-ivory">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-6 py-14 text-center">
          <Logo lockup="horizontal" height={24} />
          <p className="max-w-[34ch] text-body-sm text-muted">The intelligence that knows the people you love.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-caption font-semibold text-muted">
            <Link href="/connect" className="transition-colors hover:text-ink">Home</Link>
            <Link href="/privacy" className="transition-colors hover:text-ink">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
