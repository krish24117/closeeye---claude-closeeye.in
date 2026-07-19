import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { SITE } from '@/lib/site'

// Host-aware, so the sitemap on closeeye.app lists closeeye.app URLs — not the India domain.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date('2026-07-06')
  const host = (await headers()).get('host')?.split(':')[0]
  const base = host ? `https://${host}` : SITE.url
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/book`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/membership`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/trust-safety`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/become-a-guardian`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/become-a-companion`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
