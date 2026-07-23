import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { TrustedPresenceLanding } from '@/components/marketing/trusted-presence'
import { pricingRegion, price } from '@/lib/pricing'
import { homeJsonLd } from '@/lib/schema'

export const metadata: Metadata = {
  title: { absolute: 'Close Eye — Your family is never alone, even from afar' },
  description:
    'Close Eye becomes your family’s trusted presence in India — a verified Guardian who truly knows them, and proof of how they’re doing after every visit. For families abroad, priced in your currency.',
}

export default async function HomePage() {
  // Region-detected pricing — the homepage mirrors the app's real Presence price (₹8,000 / $100),
  // never a hardcoded number. India → INR; everywhere else → the USD international baseline.
  const country = (await headers()).get('x-vercel-ip-country')
  const presencePrice = price('presence', pricingRegion(country))
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }}
      />
      <TrustedPresenceLanding presencePrice={presencePrice} />
    </>
  )
}
