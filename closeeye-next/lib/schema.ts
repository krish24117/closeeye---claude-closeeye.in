import { SITE } from './site'
import { FAQS, SERVICES } from './content'

/** schema.org JSON-LD graph for the homepage. Improves rich results + SEO. */
export function homeJsonLd() {
  const org = {
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.legalName,
    alternateName: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icons/android-chrome-512x512.png`,
    description: SITE.description,
    email: SITE.email,
    areaServed: 'IN',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE.email,
      availableLanguage: ['en', 'hi', 'te'],
    },
  }

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    publisher: { '@id': `${SITE.url}/#organization` },
    inLanguage: 'en-IN',
  }

  const service = {
    '@type': 'Service',
    '@id': `${SITE.url}/#service`,
    serviceType: 'Wellbeing visits and companionship',
    provider: { '@id': `${SITE.url}/#organization` },
    areaServed: 'IN',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Close Eye services',
      itemListElement: SERVICES.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, description: s.summary },
        priceSpecification: {
          '@type': 'PriceSpecification',
          priceCurrency: 'INR',
          price: s.priceFrom.replace(/[₹,]/g, ''),
        },
      })),
    },
  }

  const faq = {
    '@type': 'FAQPage',
    '@id': `${SITE.url}/#faq`,
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [org, website, service, faq],
  }
}
