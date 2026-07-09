import Link from 'next/link'
import { ArrowRight, Headphones } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { Split } from '@/components/ui/split'
import { ImageFrame } from '@/components/ui/image-frame'
import { Button } from '@/components/ui/button'
import { Quote } from '@/components/ui/quote'
import { FOUNDER } from '@/lib/content'

/** Founder comes AFTER trust is earned. A teaser — the full story is its own page. */
export function FounderTeaser() {
  return (
    <Section id="founder" tone="card">
      <Split
        reverse
        media={
          <ImageFrame
            src={FOUNDER.portrait}
            alt={`${FOUNDER.name}, Founder of Close Eye`}
            ratio="square"
            className="mx-auto max-w-sm shadow-lg lg:ml-auto"
          />
        }
      >
        <span className="eyebrow">Our story</span>
        <Quote className="mt-6" cite={`${FOUNDER.name}, Founder`}>
          {FOUNDER.excerpt}
        </Quote>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/founder-story">
              Read the founder story <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/founder-story">
              <Headphones className="h-5 w-5" strokeWidth={1.5} /> Listen
            </Link>
          </Button>
        </div>
      </Split>
    </Section>
  )
}
