import { SITE } from './site'

/** schema.org JSON-LD graph for the homepage. Improves rich results + SEO.
 *  Deliberately LEAN (IA consolidation 2026-07-24): the homepage no longer renders an FAQ or a
 *  service/price catalogue (FAQs live on /help, plans on /plans), and Google requires rich-result
 *  content to be VISIBLE on the page — so no FAQPage and no per-item OfferCatalog here. The old
 *  catalogue also leaked the retired ₹500 Custom Request price into structured data. */
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
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [org, website, service],
  }
}
