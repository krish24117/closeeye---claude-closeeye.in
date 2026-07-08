import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Section, SectionHeading } from '@/components/ui/section'
import { Split } from '@/components/ui/split'
import { ImageFrame } from '@/components/ui/image-frame'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { Reveal, Stagger, StaggerItem } from '@/components/ui/reveal'
import { SERVICE_DETAILS, SERVICE_MENU } from '@/lib/services'
import { HERO_TRUST } from '@/lib/content'
import { whatsappLink } from '@/lib/site'

export const metadata: Metadata = {
  title: 'How We Help',
  description:
    'Home wellbeing visits, hospital companionship, and custom support across India — delivered by verified Guardians and a dedicated Presence Manager.',
}

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'OfferCatalog',
  name: 'Close Eye services',
  itemListElement: SERVICE_MENU.map((s) => ({
    '@type': 'Offer',
    itemOffered: { '@type': 'Service', name: s.name, description: s.note },
    priceSpecification: {
      '@type': 'PriceSpecification',
      priceCurrency: 'INR',
      price: s.price.replace(/[₹,]/g, ''),
    },
  })),
}

export default function ServicesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />

      {/* Masthead */}
      <header className="bg-ivory pt-32 sm:pt-36">
        <Container className="pb-6 text-center">
          <Reveal className="mx-auto flex max-w-2xl flex-col items-center">
            <span className="eyebrow is-centered">How we help</span>
            <h1 className="mt-6 text-h1">Ways to be there,<br />when you can&apos;t be</h1>
            <p className="mt-6 text-lead text-muted">
              Every service is delivered by a verified Guardian and coordinated by one
              dedicated Presence Manager — with you kept close on WhatsApp, wherever
              you are.
            </p>
          </Reveal>
        </Container>
      </header>

      {/* Three core services — alternating editorial splits */}
      <Section tone="ivory">
        <div className="flex flex-col gap-20 sm:gap-28">
          {SERVICE_DETAILS.map((s, i) => (
            <div key={s.id} id={s.id} className="scroll-mt-28">
              <Split
                reverse={i % 2 === 1}
                media={
                  <ImageFrame
                    ratio="landscape"
                    gradient
                    direction={s.photoDirection}
                    className="shadow-md"
                  />
                }
              >
                <FeatureIcon icon={s.icon} size="lg" />
                <span className="mt-5 block text-caption font-semibold uppercase tracking-widest text-green">
                  {s.tagline}
                </span>
                <h2 className="mt-3 text-h2">{s.name}</h2>
                <p className="mt-4 text-lead text-muted">{s.description}</p>

                <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                  {s.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-body-sm text-ink">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-wrap items-center gap-5">
                  <Button asChild>
                    <Link href="/book">Book a visit</Link>
                  </Button>
                  <span className="text-body-sm text-muted">
                    Starting at <span className="font-semibold text-ink">{s.priceFrom}</span>
                  </span>
                </div>
              </Split>
            </div>
          ))}
        </div>
      </Section>

      {/* Every visit includes — dark reassurance band */}
      <Section tone="ink">
        <SectionHeading
          tone="light"
          eyebrow="Every visit, every time"
          title="What's always included"
          intro="No tiers, no fine print. These come with every Close Eye service."
        />
        <Stagger className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {HERO_TRUST.map((t) => (
            <StaggerItem key={t.label} className="flex flex-col items-start gap-4">
              <FeatureIcon icon={t.icon} tone="onDark" />
              <p className="text-h4 text-white">{t.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      {/* On-demand menu — one unified price list */}
      <Section tone="ivory">
        <SectionHeading
          eyebrow="Simple, honest pricing"
          title="The on-demand menu"
          intro="Pay for a single visit, or ask your Presence Manager about ongoing care. No subscriptions required."
        />
        <Reveal className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          {SERVICE_MENU.map((item, i) => (
            <div
              key={item.name}
              className={
                'flex items-center justify-between gap-6 px-6 py-5 sm:px-8 ' +
                (i > 0 ? 'border-t border-line' : '')
              }
            >
              <div>
                <p className="text-body font-semibold text-ink">{item.name}</p>
                <p className="text-body-sm text-muted">{item.note}</p>
              </div>
              <span className="shrink-0 text-h4 text-green">{item.price}</span>
            </div>
          ))}
        </Reveal>
        <Reveal delay={0.1} className="mt-8 flex justify-center">
          <Badge>Prices shown are indicative and vary by city</Badge>
        </Reveal>
      </Section>

      {/* CTA */}
      <section id="contact" className="bg-ink">
        <Container className="section-pad">
          <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <h2 className="text-h2 text-white">Tell us who you&apos;d like us to check on</h2>
            <p className="mt-5 text-lead text-white/70">
              Share a few details and a Presence Manager will help you choose the right
              visit — with the care we&apos;d want for our own family.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" onDark>
                <Link href="/book">
                  Book a visit <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" onDark>
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer">
                  WhatsApp us
                </a>
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  )
}
