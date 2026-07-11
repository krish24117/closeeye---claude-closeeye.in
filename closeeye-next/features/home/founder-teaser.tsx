import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
            ratio="portrait"
            className="mx-auto max-w-sm shadow-lg lg:ml-auto"
          />
        }
      >
        <span className="eyebrow">Our story</span>
        <Quote className="mt-6" cite={`${FOUNDER.name}, Founder`}>
          {FOUNDER.excerpt}
        </Quote>
        <div className="mt-9">
          <Button asChild>
            <Link href="/founder">
              Read the founder story <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          </Button>
        </div>
      </Split>
    </Section>
  )
}
