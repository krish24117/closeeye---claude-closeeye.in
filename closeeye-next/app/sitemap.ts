import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { SITE } from '@/lib/site'
import { isConnectHost } from '@/lib/platform/front-door'

/**
 * Host-aware sitemap. The global Connect door (closeeye.app) and the India door (closeeye.in)
 * share one deployment but present different products, so each lists only the pages it actually
 * serves — the India-commercial routes are gated off closeeye.app (see middleware), so listing
 * them there would point crawlers at redirects.
 */
type Entry = { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }

// closeeye.app — the Connect experience + the legal pages that serve there.
const CONNECT_PAGES: Entry[] = [
  { path: '/connect', priority: 1, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/how-companions-are-verified', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/cancellation-policy', priority: 0.3, changeFrequency: 'yearly' },
]

// closeeye.in — the India marketing site.
const INDIA_PAGES: Entry[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/plans', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/trust-safety', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/become-a-guardian', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/become-a-companion', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/help', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date('2026-07-06')
  const host = (await headers()).get('host')?.split(':')[0]
  const base = host ? `https://${host}` : SITE.url
  const pages = isConnectHost(host) ? CONNECT_PAGES : INDIA_PAGES
  return pages.map((p) => ({ url: `${base}${p.path}`, lastModified: now, changeFrequency: p.changeFrequency, priority: p.priority }))
}
