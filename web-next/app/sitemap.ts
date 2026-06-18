import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.closeeye.in'

const ROUTES = [
  { path: '', priority: 1.0 },
  { path: '/services', priority: 0.9 },
  { path: '/about', priority: 0.7 },
  { path: '/faq', priority: 0.7 },
  { path: '/contact', priority: 0.6 },
  { path: '/waitlist', priority: 0.8 },
  { path: '/privacy-policy', priority: 0.3 },
  { path: '/terms', priority: 0.3 },
  { path: '/refund-policy', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    priority,
  }))
}
