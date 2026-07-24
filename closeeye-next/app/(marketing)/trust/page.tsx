import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Container } from '@/components/ui/container'

export const metadata: Metadata = {
  title: 'Trust Center',
  description:
    'The promises behind the presence — how Guardians are verified, how Presence Managers work, what a real visit report looks like, and exactly what happens in an emergency.',
  alternates: { canonical: '/trust' },
}

/**
 * The Trust Center hub (founder-approved 2026-07-24) — a permanent trust resource,
 * not marketing. One canonical home reached from the website nav, the app's Profile,
 * the Home stage slot, and onboarding consent.
 *
 * THE LAW OF THIS PAGE (and every page behind its doors): nothing appears here that
 * Close Eye does not actually do. Every door leads to something real — a real process,
 * a real report format, a real promise already kept in the product.
 */
const DOORS = [
  { em: '🌱', title: 'Why Close Eye exists', sub: 'The founder’s story', href: '/about' },
  { em: '🛡️', title: 'How Guardians are verified', sub: 'Our five promises', href: '/trust-safety#verified' },
  { em: '🧭', title: 'How Presence Managers work', sub: 'One coordinates. One is there.', href: '/how-it-works#roles' },
  { em: '📸', title: 'A real visit report', sub: 'Exactly what you receive', href: '/trust/sample-report' },
  { em: '🚨', title: 'What happens in an emergency', sub: 'The escalation, step by step', href: '/trust/emergency' },
  { em: '🔒', title: 'Privacy & your data', sub: 'Private to your family. Never sold.', href: '/privacy' },
  { em: '🌿', title: 'Membership benefits', sub: 'What every plan includes', href: '/plans#included' },
  { em: '💬', title: 'Family stories', sub: 'In their own words', href: '/trust/stories' },
] as const

export default function TrustCenterPage() {
  return (
    <Container className="section-pad pt-32 sm:pt-36">
      <span className="eyebrow block">Trust Center</span>
      <h1 className="mt-4 max-w-3xl text-h1">The promises behind the presence.</h1>
      <p className="mt-5 max-w-2xl text-lead text-muted">
        Everything we do to earn your trust — written down, permanent, and true.
      </p>

      <div className="mt-12 flex max-w-2xl flex-col gap-3">
        {DOORS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="flex items-center gap-4 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40"
          >
            <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-lg">{d.em}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-ink">{d.title}</span>
              <span className="block text-body-sm text-muted">{d.sub}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
          </Link>
        ))}
      </div>

      <div className="mt-6 max-w-2xl rounded-lg border border-accent-soft bg-accent-soft/40 p-5 text-body-sm leading-relaxed text-ink">
        <b className="font-semibold text-green">Our rule for this page:</b> nothing appears here that Close Eye does not actually do.
      </div>
    </Container>
  )
}
