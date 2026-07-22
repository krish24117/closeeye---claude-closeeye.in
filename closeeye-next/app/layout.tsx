import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Manrope, Inter, Newsreader } from 'next/font/google'
import '@/styles/globals.css'
// Design System Constitution · Ch.1 Typography — Phase 1 token layer. Declarative
// custom properties only; consumed by nothing yet, so it changes zero pixels.
import '@/styles/design-tokens.css'
import { RegisterSW } from '@/components/pwa/register-sw'
import { NativeInit } from '@/components/pwa/native-init'
import { AnalyticsProvider } from '@/components/analytics/analytics-provider'
import { AuthProvider } from '@/components/auth/auth-provider'
import { AppShell } from '@/components/app/app-shell'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { SITE } from '@/lib/site'
import { APPLE_SPLASH } from '@/lib/pwa/apple-splash'
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
// Display serif — the premium editorial voice (homepage + onboarding). Exposed app-wide so
// `var(--font-newsreader)` resolves outside the (connect) scope too. Nothing else uses it, so
// this loads the face but changes no existing pixel.
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

// Brand ground colours — single source so the values aren't re-typed as raw hex across metadata.
const THEME_LIGHT = '#F6F3EC'
const THEME_DARK = '#0E2A1F'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_LIGHT },
    { media: '(prefers-color-scheme: dark)', color: THEME_DARK },
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
  // Front door: legacy India Care on closeeye.in, global Close Eye Connect everywhere else.
  const isIndia = /(^|\.)closeeye\.in$/i.test(host ?? '')
  const ogLocale = isIndia ? 'en_IN' : 'en_US'
  const identity = isIndia
    ? {
        title: `${SITE.name} — When you can’t be there, ${SITE.name} can`,
        appName: SITE.name,
        appleTitle: SITE.name,
        description: SITE.description,
        ogImage: SITE.ogImage,
        ogAlt: `${SITE.name} — trusted human presence for the people you love`,
        keywords: ['wellbeing visits', 'elder care India', 'hospital companion', 'check on parents', 'trusted presence', 'care for parents abroad', 'NRI parent care'],
      }
    : {
        title: 'Close Eye — The intelligence that knows the people you love',
        appName: 'Close Eye',
        appleTitle: 'Close Eye',
        description:
          "Your family’s private intelligence — it learns what matters, remembers it securely, and helps you understand the people you love with grounded, contextual answers.",
        ogImage: '/og-connect.png',
        ogAlt: 'Close Eye — the intelligence that knows the people you love',
        keywords: ['family intelligence', 'remember what matters', 'private family AI', 'understand your family', 'family memory', 'ask about your family'],
      }
  return {
  metadataBase: new URL(base),
  title: {
    default: identity.title,
    template: `%s · ${identity.appName}`,
  },
  description: identity.description,
  applicationName: identity.appName,
  keywords: identity.keywords,
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
    other: [{ rel: 'mask-icon', url: '/mask-icon.svg', color: THEME_DARK }],
  },
  openGraph: {
    type: 'website',
    locale: ogLocale,
    url: base,
    siteName: identity.appName,
    title: identity.title,
    description: identity.description,
    images: [
      {
        url: identity.ogImage,
        width: 1200,
        height: 630,
        alt: identity.ogAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: identity.title,
    description: identity.description,
    images: [identity.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  appleWebApp: {
    capable: true,
    // 'default' keeps a solid status bar over the light (ivory) UI — reviewed and kept;
    // 'black-translucent' would push content under the notch and needs a full safe-area pass.
    statusBarStyle: 'default',
    title: identity.appleTitle,
    startupImage: APPLE_SPLASH,
  },
  }
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={localeFor(DEFAULT_REGION_CODE)} className={`scroll-smooth ${manrope.variable} ${inter.variable} ${newsreader.variable}`}>
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
        <AnalyticsProvider />
      </body>
    </html>
  )
}
