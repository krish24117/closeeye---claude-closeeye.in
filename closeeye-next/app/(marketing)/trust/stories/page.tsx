import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Family stories',
  description:
    'Real Close Eye family stories, told in their own words and shared with their permission — never written for them.',
  alternates: { canonical: '/trust/stories' },
}

/**
 * Family stories — deliberately empty until they are real.
 *
 * THE LAW: the Trust Center's rule is "nothing appears here that Close Eye does not
 * actually do." Close Eye is with its first families now; no story appears on this
 * page until a real family tells it, in their own words, with their permission.
 * An honest empty page IS the proof of the rule — never seed it with invented
 * personas or paraphrased quotes to make it look fuller.
 */
export default function FamilyStoriesPage() {
  return (
    <Container className="section-pad pt-32 sm:pt-36">
      <Button asChild variant="text"><Link href="/trust"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Trust Center</Link></Button>
      <h1 className="mt-8 max-w-3xl text-h1">In their own words.</h1>
      <p className="mt-5 max-w-2xl text-lead text-muted">
        Family stories will live here — real ones.
      </p>

      <div className="mt-10 max-w-2xl rounded-lg border border-line/70 bg-card p-7 shadow-sm sm:p-8">
        <p className="text-body leading-relaxed text-ink">
          Close Eye is with its first families right now. As their stories become theirs to tell, they’ll appear on
          this page — in their own words, shared with their permission, never written for them.
        </p>
        <p className="mt-4 text-body leading-relaxed text-muted">
          That’s the same rule the whole Trust Center follows: nothing appears here that Close Eye does not actually
          do. A page that stays empty until it’s true is exactly the kind of page you can trust.
        </p>
        <Link href="/about" className="mt-6 inline-flex items-center gap-1 text-body-sm font-semibold text-green hover:underline">
          Until then — why Close Eye exists <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    </Container>
  )
}
