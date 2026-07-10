import { Section } from '@/components/ui/section'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/ui/reveal'

// We are a young company. Until real families share their words, we show an honest
// message here rather than fabricated testimonials — trust first (Product Bible).
export function Testimonials() {
  return (
    <Section id="testimonials" tone="card">
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="eyebrow is-centered">In their words</span>
        <h2 className="mt-6 text-balance text-h2 text-ink">Real stories, from real families</h2>
        <p className="mt-5 max-w-xl text-body leading-relaxed text-muted">
          We’re caring for our first families right now. As they share their experience — in their own words — their
          stories will appear here. Until then, we won’t put words in anyone’s mouth.
        </p>
        <div className="mt-10">
          <Badge>Real stories, coming as our first families share theirs</Badge>
        </div>
      </Reveal>
    </Section>
  )
}
