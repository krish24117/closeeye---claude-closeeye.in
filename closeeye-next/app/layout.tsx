import type { Metadata, Viewport } from 'next'
import { Manrope, Inter } from 'next/font/google'
import '@/styles/globals.css'
import { RegisterSW } from '@/components/pwa/register-sw'
import { NativeInit } from '@/components/pwa/native-init'
import { AuthProvider } from '@/components/auth/auth-provider'
import { AuthGate } from '@/components/auth/auth-gate'
import { FamilyDataProvider } from '@/components/family/family-data-provider'
import { ToastProvider } from '@/components/ui/toast'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { SITE } from '@/lib/site'

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
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
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE.url,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`scroll-smooth ${manrope.variable} ${inter.variable}`}>
      <body className="min-h-dvh bg-ivory text-body">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ivory focus:shadow-md"
        >
          Skip to content
        </a>
        <AuthProvider>
          <FamilyDataProvider>
            <AuthGate />
            <ToastProvider>{children}</ToastProvider>
          </FamilyDataProvider>
        </AuthProvider>
        <OfflineBanner />
        <RegisterSW />
        <NativeInit />
      </body>
    </html>
  )
}
