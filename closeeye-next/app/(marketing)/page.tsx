import type { Metadata } from 'next'
import { TrustedPresenceLanding } from '@/components/marketing/trusted-presence'
import { homeJsonLd } from '@/lib/schema'

export const metadata: Metadata = {
  title: { absolute: 'Close Eye — Your family is never alone, even from afar' },
  description:
    'Close Eye becomes your family’s trusted presence in India — a verified Guardian who truly knows them, and proof of how they’re doing after every visit. For families abroad, priced in your currency.',
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }}
      />
      <TrustedPresenceLanding />
    </>
  )
}
