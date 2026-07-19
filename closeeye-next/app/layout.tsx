import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Manrope, Inter } from 'next/font/google'
import '@/styles/globals.css'
import { RegisterSW } from '@/components/pwa/register-sw'
import { NativeInit } from '@/components/pwa/native-init'
import { AuthProvider } from '@/components/auth/auth-provider'
import { AppShell } from '@/components/app/app-shell'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { SITE } from '@/lib/site'
import { localeFor, DEFAULT_REGION_CODE } from '@/lib/platform/regions'

// Design Authority: Manrope primary, Inter fallback.
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F3EC' },
    { media: '(prefers-color-scheme: dark)', color: '#0E2A1F' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/**
 * Host-aware metadata. One deployment serves multiple front doors (closeeye.app = global,
 * closeeye.in = India, connect.closeeye.in = UAT), so a STATIC metadataBase would stamp every
 * page's canonical / og:url / og:image with a single domain — which is why closeeye.app pages
 * were referencing closeeye.in. Reading the request host makes each page reference the domain it
 * is actually served on. (This opts the tree into dynamic rendering — an intentional trade for
 * multi-domain correctness.)
 */
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host')?.split(':')[0]
  const base = host ? `https://${host}` : SITE.url
  return {
  metadataBase: new URL(base),
  title: {
    default: `${SITE.name} — When you can’t be there, ${SITE.name} can`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'wellbeing visits',
    'elder care India',
    'hospital companion',
    'check on parents',
    'trusted presence',
    'care for parents abroad',
    'NRI parent care',
  ],
  authors: [{ name: SITE.legalName }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  alternates: { canonical: '/' },
  category: 'health',
  formatDetection: { telephone: true, email: true, address: false },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: base,
    siteName: SITE.name,
    title: `${SITE.name} — When you can’t be there, ${SITE.name} can`,
    description: SITE.description,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE.name} — trusted human presence for the people you love`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — When you can’t be there, ${SITE.name} can`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE.name,
  },
  }
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={localeFor(DEFAULT_REGION_CODE)} className={`scroll-smooth ${manrope.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-ivory text-body">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ivory focus:shadow-md"
        >
          Skip to content
        </a>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <OfflineBanner />
        <RegisterSW />
        <NativeInit />
      </body>
    </html>
  )
}
