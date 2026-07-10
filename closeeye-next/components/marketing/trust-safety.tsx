import { UserCheck, GraduationCap, Navigation, Lock, Fingerprint, HeartHandshake, Siren, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { FeatureIcon } from '@/components/ui/feature-icon'

const CARDS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: UserCheck, title: 'Background-verified care team', desc: 'Every Guardian is verified before joining.' },
  { icon: GraduationCap, title: 'Professional training', desc: 'Continuous training and quality audits.' },
  { icon: Navigation, title: 'GPS-verified visits', desc: 'Every visit is securely recorded.' },
  { icon: Lock, title: 'Secure payments', desc: 'Protected payment processing.' },
  { icon: Fingerprint, title: 'Private & secure', desc: 'Family data is encrypted and protected.' },
  { icon: HeartHandshake, title: 'Human support', desc: 'A dedicated Presence Manager for every family.' },
  { icon: Siren, title: 'Emergency escalation', desc: 'An immediate escalation process when required.' },
  { icon: Sparkles, title: 'Premium experience', desc: 'Designed for families who care deeply.' },
]

/** Section 3 — "Why families trust Close Eye". Trust cards, premium spacing. */
export function TrustSafety({ id = 'trust-safety' }: { id?: string }) {
  return (
    <Section id={id} tone="ivory">
      <div className="mx-auto max-w-2xl text-center">
        <span className="eyebrow is-centered">Trust &amp; safety</span>
        <h2 className="mt-4 text-h2">Why families trust Close Eye</h2>
        <p className="mt-4 text-lead text-muted">
          Families trust people before products. Every safeguard below exists to earn
          that trust — quietly, and every single visit.
        </p>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <li key={c.title} className="rounded-lg border border-line/70 bg-card p-6 shadow-sm">
            <FeatureIcon icon={c.icon} size="sm" />
            <h3 className="mt-4 text-body font-semibold text-ink">{c.title}</h3>
            <p className="mt-1.5 text-body-sm leading-relaxed text-muted">{c.desc}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}
