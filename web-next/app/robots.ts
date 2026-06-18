import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.closeeye.in'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth', '/dashboard', '/companion', '/admin'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
