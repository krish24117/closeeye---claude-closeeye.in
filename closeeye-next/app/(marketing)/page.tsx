import {
  Hero,
  Services,
  HowItWorks,
  Trust,
  Testimonials,
  Faq,
  FinalCta,
} from '@/features/home'
import { homeJsonLd } from '@/lib/schema'

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }}
      />

      {/* Trust-first conversion journey — team & verification lead; no founder story. */}
      <Hero />
      <Services />
      <HowItWorks />
      <Trust />
      <Testimonials />
      <Faq />
      <FinalCta />
    </>
  )
}
