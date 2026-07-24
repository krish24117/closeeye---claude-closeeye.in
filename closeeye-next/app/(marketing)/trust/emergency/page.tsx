import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'What happens in an emergency',
  description:
    'The exact chain of events when something happens during a Close Eye visit — emergency services first, your Presence Manager coordinating, and a real call to you, wherever you are.',
  alternates: { canonical: '/trust/emergency' },
}

/**
 * Emergency response — the Trust Center's highest-anxiety answer, stated as a
 * step-by-step promise (founder-approved mockup, 2026-07-24).
 *
 * COPY LAW: this page DESCRIBES the escalation the product already enforces — the
 * deterministic crisis floor in the Safety Engine puts emergency services first,
 * always. Never edit these steps into something the product does not do, and never
 * soften the honest boundary: Close Eye is not a medical service and never a
 * replacement for 108.
 */
const STEPS = [
  {
    alert: true,
    h: 'The Guardian is on the spot',
    p: 'Whoever is with your loved one stays with them — calm, present, never leaving them alone.',
  },
  {
    alert: true,
    h: 'Emergency services first',
    p: '108 (or your loved one’s local emergency number) is called immediately. We support alongside — never instead.',
  },
  {
    alert: false,
    h: 'Your Presence Manager is alerted',
    p: 'They coordinate on the ground: hospital, neighbours, whatever the moment needs.',
  },
  {
    alert: false,
    h: 'You are called — wherever you are',
    p: 'A real voice, not a notification. You hear what’s happening and what’s being done, as it happens.',
  },
  {
    alert: false,
    h: 'You get the full picture after',
    p: 'A written account of what happened and every step taken — nothing vague, nothing hidden.',
  },
] as const

export default function EmergencyResponsePage() {
  return (
    <Container className="section-pad pt-32 sm:pt-36">
      <Button asChild variant="text"><Link href="/trust"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Trust Center</Link></Button>
      <h1 className="mt-8 max-w-3xl text-h1">If something ever happens.</h1>
      <p className="mt-5 max-w-2xl text-lead text-muted">
        The exact chain of events — so you know it before you ever need it.
      </p>

      <ol className="mt-12 flex max-w-2xl flex-col">
        {STEPS.map((s, i) => (
          <li key={s.h} className="relative flex gap-5 pb-9 last:pb-0">
            {i < STEPS.length - 1 && (
              <span aria-hidden className="absolute start-5 top-12 bottom-2 w-0.5 -translate-x-1/2 bg-accent-soft" />
            )}
            <span
              className={
                s.alert
                  ? 'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-error/30 bg-error/[0.07] font-display text-h4 text-error'
                  : 'relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent-soft bg-card font-display text-h4 text-green'
              }
            >
              {i + 1}
            </span>
            <span className="min-w-0 pt-1.5">
              <span className="block text-h4 text-ink">{s.h}</span>
              <p className="mt-1.5 text-body leading-relaxed text-muted">{s.p}</p>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-10 max-w-2xl rounded-lg border-2 border-dashed border-accent-soft p-5 text-body-sm leading-relaxed text-muted">
        <b className="font-semibold text-ink">Being honest with you:</b> Close Eye is presence and coordination — not a medical
        service, and never a replacement for 108. That’s exactly why step 2 comes before everything we do.
      </div>
    </Container>
  )
}
