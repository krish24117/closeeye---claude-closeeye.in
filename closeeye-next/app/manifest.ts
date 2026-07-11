import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Close Eye — a trusted human presence for the people you love',
    short_name: 'Close Eye',
    description:
      'Trusted human presence for the people you love — home wellbeing visits, hospital companionship, and custom support across India.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F3EC',
    theme_color: '#0E2A1F',
    orientation: 'portrait',
    lang: 'en-IN',
    categories: ['health', 'lifestyle', 'medical'],
    icons: [
      { src: '/favicon-32.png', sizes: '32x32', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
