import type { Metadata } from 'next'
import { FileText, ShieldCheck, MessageCircle, GraduationCap, BadgeCheck, CalendarCheck, HeartHandshake } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CompanionApplication } from '@/components/marketing/companion-application'

export const metadata: Metadata = {
  title: 'Become a Close Eye Companion',
  description: 'Spend meaningful time with elders in your city. Conversation, walks, reading and warm company — no medical training needed.',
}

const STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: FileText, title: 'Apply', desc: 'Tell us a little about you and how you’d love to help.' },
  { icon: ShieldCheck, title: 'Background verification', desc: 'A careful check — because families trust us with their parents.' },
  { icon: MessageCircle, title: 'Interview', desc: 'A warm conversation to get to know you.' },
  { icon: GraduationCap, title: 'Training', desc: 'Gentle guidance on presence, safety and dignity.' },
  { icon: BadgeCheck, title: 'Certification', desc: 'You become a certified Close Eye Companion.' },
  { icon: CalendarCheck, title: 'Available for assignments', desc: 'Choose the hours and the families that fit your life.' },
  { icon: HeartHandshake, title: 'Start supporting families', desc: 'Bring warmth, company and calm to someone’s day.' },
]

export default function BecomeCompanionPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="section-pad">
        <div className="mx-auto max-w-content px-6">
          <p className="eyebrow">Join Close Eye</p>
          <h1 className="mt-3 max-w-3xl text-h1 text-ink">Become a Close Eye Companion</h1>
          <p className="mt-5 max-w-2xl text-lead leading-relaxed text-muted">
            Some of the kindest work is simply being there — a cup of tea, a walk in the garden, a story shared.
            Spend meaningful time with elders in your city. No medical training needed; just warmth and reliability.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Conversation', 'Walks together', 'Reading', 'Hospital company', 'Shopping help'].map((s) => (
              <span key={s} className="rounded-full border border-line/70 bg-card px-3.5 py-1.5 text-caption font-medium text-muted">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="section-pad bg-card">
        <div className="mx-auto max-w-content px-6">
          <h2 className="text-h2 text-ink">Your journey</h2>
          <p className="mt-2 max-w-xl text-body leading-relaxed text-muted">From application to your first visit — supported at every step.</p>
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

      {/* Application */}
      <section className="section-pad">
        <div className="mx-auto grid max-w-content gap-10 px-6 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-h2 text-ink">A role with real meaning</h2>
            <p className="mt-4 text-body leading-relaxed text-muted">
              Close Eye Companions bring presence, not procedures. You&apos;ll be matched with families near you,
              choose hours that suit your life, and be paid fairly for the time you give. Every visit is
              supported by a Presence Manager — you&apos;re never on your own.
            </p>
            <p className="mt-4 text-body leading-relaxed text-muted">
              <span className="font-semibold text-ink">Who can become a Companion?</span> Students, homemakers,
              retirees and caregivers between roles — anyone with warmth, patience and a few free hours. No
              medical background needed. It&apos;s flexible, meaningful work that helps families stay connected
              to the people they love.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {['Flexible hours, chosen by you', 'Fair, on-time pay', 'Full training and a dedicated Presence Manager', 'Work close to home'].map((b) => (
                <li key={b} className="flex gap-2.5 text-body text-ink"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {b}</li>
              ))}
            </ul>
          </div>
          <CompanionApplication />
        </div>
      </section>
    </div>
  )
}
