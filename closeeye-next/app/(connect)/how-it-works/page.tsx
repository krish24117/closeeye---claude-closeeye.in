import type { Metadata } from 'next'
import Link from 'next/link'
import { isConnectIndexable } from '@/components/connect/config'

/**
 * /how-it-works — the four human steps.
 *
 * These used to render inline on /connect, directly above a footer link labelled "How it
 * works" that scrolled up ten pixels to the card you were already reading: the same thing
 * twice, side by side. The card is gone from the page scroll and lives here, so the footer
 * link is one entry point rather than a second copy.
 *
 * Same words, same order, same voice — the two roles stay apart (the Presence Manager
 * coordinates and is who the family talks to; the companion is the one who goes), and no
 * date: "visits open 15 August" belongs to the footer's pricing line alone.
 *
 * It lives in the (connect) group, so it inherits `.cx` — the paper world — and reuses the
 * page shell of /how-companions-are-verified. Nothing new was designed for it.
 */
export function generateMetadata(): Metadata {
  return {
    title: { absolute: 'How it works — Close Eye' },
    description: 'How Close Eye works: tell us about the person you love, and a trusted companion visits.',
    alternates: { canonical: '/how-it-works' },
    robots: isConnectIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  }
}

// The human steps, in the family's order. Verbs lead; nothing over 12 words.
// Never "Guardian" — the word is banned in our voice.
const STEPS = [
  'Tell Close Eye about the person you love.',
  'Your Presence Manager confirms the details with you.',
  'A companion visits, and takes care of what’s needed.',
  'You get a written update after every visit.',
]

export default function HowItWorksPage() {
  return (
    <main className="verify" id="main">
      <Link className="verify-back" href="/connect">← Close Eye Connect</Link>

      <h1 className="verify-h">How it works</h1>

      <ol className="howit-steps">
        {STEPS.map((s, i) => (
          <li key={s}><span className="howit-n" aria-hidden="true">{i + 1}</span><p>{s}</p></li>
        ))}
      </ol>

      {/* The two roles, never blurred: one coordinates, one goes. */}
      <p className="howit-roles">Your Presence Manager coordinates, and is who you talk to. Your companion is who goes.</p>
    </main>
  )
}
