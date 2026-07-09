import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Section, SectionHeading } from '@/components/ui/section'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { Button } from '@/components/ui/button'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/reveal'
import { SERVICES } from '@/lib/content'

export function Services() {
  return (
    <Section id="services" tone="ivory">
      <SectionHeading
        eyebrow="How we help"
        title="Three ways to be there"
        intro="One dedicated Presence Manager. Verified Guardians on the ground. You, kept close on WhatsApp — wherever you are in the world."
      />

      {/* One unified panel divided into three — reads as a single component. */}
      <Reveal className="mt-14">
        <Stagger className="grid overflow-hidden rounded-xl border border-line bg-card shadow-sm md:grid-cols-3">
          {SERVICES.map((service) => (
            <StaggerItem
              key={service.id}
              className="group flex flex-col gap-5 border-line p-8 transition-colors hover:bg-accent-soft/40 md:border-r md:last:border-r-0 max-md:border-b max-md:last:border-b-0 sm:p-10"
            >
              <div className="flex items-center justify-between">
                <FeatureIcon icon={service.icon} />
                <span className="text-caption text-muted">
                  Starting at <span className="font-semibold text-ink">{service.priceFrom}</span>
                </span>
              </div>
              <h3 className="text-h4">{service.name}</h3>
              <p className="flex-1 text-body-sm text-muted">{service.summary}</p>
              <Link
                href="/book"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-green transition-colors group-hover:gap-2.5 hover:text-green-hover"
              >
                Book a visit <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </Reveal>

      <Reveal delay={0.1} className="mt-10 flex flex-col items-center gap-3 text-center">
        <p className="text-body-sm text-muted">
          Not sure what your family needs? See what&apos;s included and how pricing works.
        </p>
        <Button asChild variant="secondary">
          <Link href="/services">Explore all services</Link>
        </Button>
      </Reveal>
    </Section>
  )
}
