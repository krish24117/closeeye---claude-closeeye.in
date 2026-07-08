import { Section } from '@/components/ui/section'
import { Quote } from '@/components/ui/quote'
import { Badge } from '@/components/ui/badge'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/reveal'
import { TESTIMONIALS } from '@/lib/content'

export function Testimonials() {
  const [featured, ...rest] = TESTIMONIALS

  return (
    <Section id="testimonials" tone="card">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="eyebrow is-centered">In their words</span>
        {featured && (
          <div className="mt-8">
            <Quote size="hero" className="items-center text-center">
              {featured.quote}
            </Quote>
            <p className="mt-6 text-body-sm text-muted">
              {featured.author} · {featured.relation} · {featured.location}
            </p>
          </div>
        )}
      </Reveal>

      <Stagger className="mx-auto mt-16 grid max-w-4xl gap-8 border-t border-line pt-14 sm:grid-cols-2">
        {rest.map((t) => (
          <StaggerItem key={t.id} className="flex flex-col gap-4">
            <p className="text-body text-ink/85">“{t.quote}”</p>
            <p className="text-caption text-muted">
              {t.author} · {t.relation} · {t.location}
            </p>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal delay={0.1} className="mt-12 flex justify-center">
        <Badge>Real stories, coming as our first families share theirs</Badge>
      </Reveal>
    </Section>
  )
}
