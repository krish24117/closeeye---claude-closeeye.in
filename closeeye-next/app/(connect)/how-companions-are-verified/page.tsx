import type { Metadata } from 'next'
import Link from 'next/link'
import { isConnectIndexable } from '@/components/connect/config'

/**
 * /how-companions-are-verified — the trust page.
 *
 * A family reads this while deciding whether to let a stranger into their mother's home,
 * so every line here is a promise, not a description. The copy is the founder's, exactly
 * and only: two claims from the first draft (a background check, and training under the
 * Chief of Care) were STRUCK because we could not stand behind them today. Nothing may be
 * added here that Close Eye does not actually do — a shorter true page beats a fuller one
 * carrying a claim we'd have to walk back.
 *
 * It lives in the (connect) route group, so it inherits `.cx` — the paper world, Newsreader
 * for the human voice — and never throws the reader onto a differently-dressed site.
 */
export function generateMetadata(): Metadata {
  return {
    title: { absolute: 'How companions are verified — Close Eye' },
    description: 'How Close Eye verifies the companions who visit the people you love.',
    alternates: { canonical: '/how-companions-are-verified' },
    robots: isConnectIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  }
}

// The founder's exact lines, in the founder's order. Do not add, reword, or reorder.
// Each one is a promise a family will hold us to — never extend this list without a
// founder decision that Close Eye genuinely does the thing.
const STEPS = [
  'We check who they are.',
  'We check their background before they ever visit.',
  'We meet them in person.',
  'We match them to your family.',
  'We stay with them — and with you.',
]

export default function HowCompanionsAreVerifiedPage() {
  return (
    <main className="verify">
      {/* A quiet way back — a trust page must never be a dead end, and it stays inside
          the paper world rather than handing the reader off somewhere else. */}
      <Link className="verify-back" href="/connect">← Close Eye Connect</Link>

      <h1 className="verify-h">How companions are verified</h1>

      <ol className="verify-steps">
        {STEPS.map((s) => (
          <li key={s}><p>{s}</p></li>
        ))}
      </ol>

      {/* The measure lives on the text, not the element — the element carries the rule,
          and a short element meant a short rule that missed the ones above it. */}
      <p className="verify-close"><span>If someone isn’t right, we’ll send someone else.</span></p>
    </main>
  )
}
