import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, ShieldCheck, MessageCircle, GraduationCap, BadgeCheck, Navigation, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SITE, whatsappLink } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Become a Close Eye Guardian',
  description:
    'Join the Close Eye care team. A background-verified, trained and rated role caring for elders in your city — with a dedicated Presence Manager beside you on every visit.',
}

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: FileText, title: 'Apply', desc: 'Tell us about you and the care you’d love to give.' },
  { icon: ShieldCheck, title: 'Background verification', desc: 'A thorough check — families trust us with their parents.' },
  { icon: MessageCircle, title: 'Interview', desc: 'A warm conversation about your experience and values.' },
  { icon: GraduationCap, title: 'Training', desc: 'Care standards, safety, dignity and the Close Eye way.' },
  { icon: BadgeCheck, title: 'Certification', desc: 'You become a certified Close Eye Guardian.' },
  { icon: Navigation, title: 'Live assignment', desc: 'GPS-verified visits, supported by a Presence Manager.' },
]

const LOOK_FOR = [
  'Genuine warmth and patience with elders',
  'Reliability — you show up, on time, every time',
  'Care experience is a plus, not a must',
  'A smartphone and the ability to travel locally',
]

export default function BecomeGuardianPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="section-pad pt-32 sm:pt-36">
        <div className="mx-auto max-w-content px-6">
          <p className="eyebrow">Join the care team</p>
          <h1 className="mt-3 max-w-3xl text-h1 text-ink">Become a Close Eye Guardian</h1>
          <p className="mt-5 max-w-2xl text-lead leading-relaxed text-muted">
            Guardians are the trusted, background-verified people who care for elders in their
            city — wellbeing visits, hospital support and warm company. You’re never on your own:
            a dedicated Presence Manager guides every visit.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Verified & trained', 'GPS-verified visits', 'Fair, on-time pay', 'Flexible hours', 'Work close to home'].map((s) => (
              <span key={s} className="rounded-full border border-line/70 bg-card px-3.5 py-1.5 text-caption font-medium text-muted">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="section-pad bg-card">
        <div className="mx-auto max-w-content px-6">
          <h2 className="text-h2 text-ink">Your journey</h2>
          <p className="mt-2 max-w-xl text-body leading-relaxed text-muted">From application to your first assignment — verified and supported at every step.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <li key={s.title} className="rounded-lg border border-line bg-ivory p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.5} /></span>
                    <span className="text-caption font-semibold uppercase tracking-widest text-muted">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-3 text-h4 text-ink">{s.title}</h3>
                  <p className="mt-1 text-body-sm leading-relaxed text-muted">{s.desc}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Who we look for + apply */}
      <section className="section-pad">
        <div className="mx-auto grid max-w-content gap-10 px-6 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-h2 text-ink">Who we look for</h2>
            <p className="mt-4 text-body leading-relaxed text-muted">
              Being a Guardian is meaningful work with real responsibility. We invest in you with
              training and a Presence Manager, and pay you fairly for the care you give.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {LOOK_FOR.map((b) => (
                <li key={b} className="flex gap-2.5 text-body text-ink"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {b}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-line/70 bg-card p-8 shadow-sm">
            <h3 className="text-h3 text-ink">Ready to apply?</h3>
            <p className="mt-3 text-body leading-relaxed text-muted">
              Start with a quick message and our team will guide you through verification and the
              next steps. We reply within a couple of days.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <a href={whatsappLink('Hi Close Eye — I’d like to apply to become a Guardian.')} target="_blank" rel="noopener noreferrer">
                  Apply on WhatsApp <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a href={`mailto:${SITE.email}?subject=${encodeURIComponent('Guardian application')}`}>Email us</a>
              </Button>
            </div>
            <p className="mt-4 text-caption text-muted">
              Prefer to explore the calmer, no-medical role?{' '}
              <Link href="/become-a-companion" className="font-medium text-green underline-offset-2 hover:underline">Become a Companion</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
