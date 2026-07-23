import type { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Home, Users, FileText, ShoppingBag } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Section } from '@/components/ui/section'
import { Button } from '@/components/ui/button'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/reveal'

export const metadata: Metadata = {
  title: 'Services — Everything Close Eye can do',
  description:
    'The full catalogue of Close Eye services — health & wellbeing, home & property, family support, administration, and concierge. Book any one on demand, or include them in a Presence plan.',
}

const CATEGORIES = [
  { icon: Heart, name: 'Health & Wellbeing', items: ['Wellness Visit', 'Hospital Companion', 'Doctor Appointment Assistance', 'Medication Pickup', 'Recovery Support', 'Health Observation'] },
  { icon: Home, name: 'Home & Property', items: ['Home Check', 'Property Inspection', 'Utility Verification', 'Maintenance Coordination', 'Housekeeping Coordination'] },
  { icon: Users, name: 'Family Support', items: ['Guardian Visit', 'Companion Visit', 'Festival Visit', 'Emergency Response', 'Video Check-ins', 'Family Updates'] },
  { icon: FileText, name: 'Administration', items: ['Banking Assistance', 'Documentation Support', 'Government Office Visits', 'Insurance Coordination', 'Legal Coordination'] },
  { icon: ShoppingBag, name: 'Concierge', items: ['Grocery Shopping', 'Airport Pickup', 'Local Errands', 'Travel Assistance', 'Personal Requests'] },
]

export default function ServicesPage() {
  return (
    <>
      {/* ── Hero ── */}
      <header className="bg-ivory pt-32 sm:pt-36">
        <Container className="pb-4 text-center">
          <Reveal className="mx-auto flex max-w-measure flex-col items-center">
            <span className="eyebrow is-centered">Services</span>
            <h1 className="mt-6 text-h1">Everything Close Eye can do.</h1>
            <p className="mx-auto mt-6 max-w-prose text-lead text-muted">
              The full catalogue, organised so you can find exactly what your family needs. Book any
              one on its own with <Link href="/pricing" className="font-semibold text-green hover:underline">Pay as You Go</Link>, or include them in a Presence plan.
            </p>
          </Reveal>
        </Container>
      </header>

      {/* ── Categories ── */}
      <Section tone="ivory">
        <Stagger className="grid gap-5 sm:grid-cols-2">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon
            return (
              <StaggerItem key={cat.name} className={i === CATEGORIES.length - 1 && CATEGORIES.length % 2 === 1 ? 'rounded-lg border border-line bg-card p-7 shadow-sm sm:col-span-2' : 'rounded-lg border border-line bg-card p-7 shadow-sm'}>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-md bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden /></span>
                  <h2 className="text-h4">{cat.name}</h2>
                </div>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {cat.items.map((s) => (
                    <li key={s} className="rounded-full border border-line bg-ivory px-3.5 py-1.5 text-body-sm text-ink">{s}</li>
                  ))}
                </ul>
              </StaggerItem>
            )
          })}
        </Stagger>
        <Reveal className="mt-10 text-center">
          <p className="text-body-sm text-muted">Services answer “what can Close Eye do?” — <Link href="/pricing" className="font-semibold text-green hover:underline">Pricing</Link> answers “how do I engage?”</p>
        </Reveal>
      </Section>

      {/* ── Close ── */}
      <Section tone="ink">
        <Reveal className="mx-auto flex max-w-measure flex-col items-center text-center">
          <h2 className="text-h2 text-content-inverse">Find the right way to begin.</h2>
          <p className="mt-4 text-lead text-content-inverse/70">See how each service fits Pay as You Go, Membership, or Presence.</p>
          <div className="mt-9">
            <Button asChild size="lg" variant="primary" onDark><Link href="/pricing">View pricing</Link></Button>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
