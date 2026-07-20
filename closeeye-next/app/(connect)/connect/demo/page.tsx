import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ConnectExperience } from '../experience'

/**
 * /connect/demo — the interactive "type-a-sentence" demonstration, reached from the
 * homepage's secondary CTA ("See how Connect works"). Per the founder's decision, the
 * homepage stays educational/trust-building; the live demo is an optional marketing
 * preview, and the real product experience begins only after sign-in + Family Space
 * creation. This is that optional preview — not the onboarding path.
 */
export default function ConnectDemoPage() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-6 pt-8">
        <Link
          href="/connect"
          className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} /> Back to home
        </Link>
      </div>
      <ConnectExperience />
    </>
  )
}
