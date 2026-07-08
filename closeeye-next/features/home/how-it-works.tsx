import { Section, SectionHeading } from '@/components/ui/section'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { Stagger, StaggerItem } from '@/components/ui/reveal'
import { JOURNEY } from '@/lib/content'

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="ink">
      <SectionHeading
        eyebrow="How it works"
        tone="light"
        title="From worry to peace of mind"
        intro="No apps to install. No call centres. Five human steps from the moment you reach out."
      />

      <Stagger className="mt-16 grid gap-10 sm:gap-6 md:grid-cols-5">
        {JOURNEY.map((step, i) => (
          <StaggerItem key={step.index} className="relative flex flex-col items-start gap-5 md:items-center md:text-center">
            {/* connecting line (desktop) */}
            {i < JOURNEY.length - 1 && (
              <span className="absolute left-7 top-7 hidden h-px w-full bg-white/15 md:block" aria-hidden />
            )}
            <div className="relative z-10 flex items-center gap-4 md:flex-col">
              <FeatureIcon icon={step.icon} tone="onDark" size="lg" className="ring-4 ring-ink" />
              <span className="text-caption font-semibold uppercase tracking-widest text-accent md:mt-1">
                Step {step.index}
              </span>
            </div>
            <div className="md:px-2">
              <h3 className="text-h4 text-white">{step.title}</h3>
              <p className="mt-2 text-body-sm text-white/55">{step.description}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  )
}
