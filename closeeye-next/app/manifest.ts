import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { localeFor, DEFAULT_REGION_CODE } from '@/lib/platform/regions'

/**
 * Host-aware PWA manifest. The same deployment serves two front doors, so the installed
 * identity adapts to the domain the manifest is fetched from — Close Eye Connect (the global
 * Family-Intelligence product) on closeeye.app / connect.closeeye.in, and the legacy India
 * Care identity on closeeye.in. Reading the host opts this route into dynamic rendering
 * (the same trade-off app/layout.tsx already makes for multi-domain metadata correctness).
 */
export const dynamic = 'force-dynamic'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get('host')?.split(':')[0] ?? ''
  const isIndia = /(^|\.)closeeye\.in$/i.test(host)

  const identity = isIndia
    ? {
        name: 'Close Eye — a trusted human presence for the people you love',
        short_name: 'Close Eye',
        description:
          'Trusted human presence for the people you love — home wellbeing visits, hospital companionship, and custom support across India.',
        categories: ['health', 'lifestyle', 'medical'],
      }
    : {
        // Installed app name is just "Close Eye" (short_name matches) so the home-screen label
        // never truncates to "Close Eye Conn…". "Connect" stays in the SEO/OG page title only.
        name: 'Close Eye',
        short_name: 'Close Eye',
        description:
          "Your family's private intelligence — it learns what matters, remembers it securely, and helps you understand the people you love with grounded, contextual answers.",
        categories: ['lifestyle', 'productivity', 'utilities'],
      }

  return {
    id: '/?source=pwa',
    name: identity.name,
    short_name: identity.short_name,
    description: identity.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#E9EDE2',
    theme_color: '#0E2A1F',
    orientation: 'portrait',
    lang: localeFor(DEFAULT_REGION_CODE),
    categories: identity.categories,
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-monochrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
    ],
    screenshots: [
      { src: '/screenshots/mobile.png', sizes: '780x1688', type: 'image/png', form_factor: 'narrow' },
      { src: '/screenshots/desktop.png', sizes: '2560x1600', type: 'image/png', form_factor: 'wide' },
    ],
    shortcuts: isIndia
      ? undefined
      : [
          {
            name: 'Ask Close Eye',
            short_name: 'Ask',
            url: '/connect',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'My Family Space',
            short_name: 'Family',
            url: '/space',
            icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
          },
        ],
  }
}
