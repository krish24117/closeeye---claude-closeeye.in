import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'A real visit report',
  description:
    'A sample Close Eye visit report, in the exact format families receive — GPS-verified check-in, photos, the Guardian’s own note, and Presence Manager approval.',
  alternates: { canonical: '/trust/sample-report' },
}

/**
 * The specimen report — the Trust Center's strongest proof, made a permanent,
 * explorable artifact (founder-approved mockup, 2026-07-24). This is a SAMPLE in
 * the exact format the product produces; the verification callout below the card
 * explains why every line of a real report can be trusted. Names match the
 * product's example family (Lakshmi) used throughout onboarding.
 */
const CHECKLIST = ['Wellbeing', 'Meals', 'Medication reminder', 'Short walk'] as const

export default function SampleReportPage() {
  return (
    <Container className="section-pad pt-32 sm:pt-36">
      <Button asChild variant="text"><Link href="/trust"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Trust Center</Link></Button>
      <h1 className="mt-8 max-w-3xl text-h1">A real visit, exactly as you’d receive it.</h1>

      <div className="mt-12 max-w-md rounded-lg border border-line/70 bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-h4 text-green">L</span>
            <span className="min-w-0">
              <span className="block text-body font-semibold text-ink">A visit with Lakshmi</span>
              <span className="block text-caption text-muted">Banjara Hills, Hyderabad</span>
            </span>
          </div>
          <span className="mt-1 shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-semibold text-green">✓ Verified</span>
        </div>

        <p className="mt-4 flex items-center gap-2 text-caption font-semibold text-green">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green" /> Guardian checked in · Sunday 10:14 IST
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} aria-hidden className="aspect-square rounded-lg bg-gradient-to-br from-accent-soft to-green/25" />
          ))}
        </div>

        <p className="mt-4 text-body-sm text-ink">
          Mood today: <b className="font-semibold text-green">cheerful and chatty</b>
        </p>

        <ul className="mt-3 flex flex-wrap gap-2">
          {CHECKLIST.map((c) => (
            <li key={c} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ivory px-3 py-1 text-caption font-medium text-ink">
              <span aria-hidden className="font-bold text-green">✓</span> {c}
            </li>
          ))}
        </ul>

        <blockquote className="mt-4 rounded-lg bg-ivory p-4 text-body-sm leading-relaxed text-ink">
          “Lakshmi was cheerful today. We walked by the lake for about 20 minutes and she ate a good lunch. Her right
          knee ached a little on the stairs — I’ve noted it so we can keep an eye on it.”
        </blockquote>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3 text-caption font-semibold text-muted">
          <span className="whitespace-nowrap">Guardian · Priya M.</span>
          <span className="whitespace-nowrap">Presence Manager approved ✓</span>
        </div>
      </div>

      <div className="mt-5 max-w-md rounded-lg border border-accent-soft bg-accent-soft/40 p-4 text-body-sm leading-relaxed text-ink">
        <b className="font-semibold text-green">Every line is real:</b> the check-in is GPS-verified, the note is the
        Guardian’s own words, and a Presence Manager approves every report before it reaches you.
      </div>
    </Container>
  )
}
