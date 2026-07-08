import {
  Hero,
  Services,
  HowItWorks,
  Trust,
  Testimonials,
  Faq,
  FinalCta,
  FounderTeaser,
} from '@/features/home'
import { homeJsonLd } from '@/lib/schema'

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }}
      />

      {/* Trust-first conversion journey. Founder story comes after trust is earned. */}
      <Hero />
      <Services />
      <HowItWorks />
      <Trust />
      <Testimonials />
      <Faq />
      <FinalCta />
      <FounderTeaser />
    </>
  )
}
