import { Section } from '@/components/ui/section'
import { Split } from '@/components/ui/split'
import { ImageFrame } from '@/components/ui/image-frame'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { TRUST_PILLARS } from '@/lib/content'

export function Trust() {
  return (
    <Section id="trust" tone="ivory">
      <Split
        media={
          <ImageFrame
            ratio="portrait"
            gradient
            direction="A Close Eye Guardian sharing tea with an elderly parent at home — unhurried, genuine, warm afternoon light."
            className="mx-auto max-w-md lg:mx-0"
          />
        }
      >
        <span className="eyebrow">Why families trust us</span>
        <h2 className="mt-5 text-h2">Trust, built by people —<br className="hidden sm:block" /> not software</h2>
        <p className="mt-5 max-w-md text-lead text-muted">
          Technology keeps you informed. People earn your trust. Every part of
          Close Eye is designed around that difference.
        </p>

        <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {TRUST_PILLARS.map((pillar) => (
            <li key={pillar.title} className="flex gap-4">
              <FeatureIcon icon={pillar.icon} size="sm" />
              <div>
                <h3 className="text-body font-semibold text-ink">{pillar.title}</h3>
                <p className="mt-1 text-body-sm text-muted">{pillar.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Split>
    </Section>
  )
}
