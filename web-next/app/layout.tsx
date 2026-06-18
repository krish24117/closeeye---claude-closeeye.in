import type { Metadata } from 'next'
import { Inter, Manrope, DM_Serif_Display } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { IOSInstallBanner } from '@/components/IOSInstallBanner'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope' })
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-dm-serif' })

const SITE_URL = 'https://www.closeeye.in'
const DEFAULT_DESCRIPTION = 'Verified wellbeing visits and trusted local support for your loved ones in India. Real visits. Real photos. Real reports.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Close Eye — When you can't be there, Close Eye can.",
  description: DEFAULT_DESCRIPTION,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Close Eye',
    locale: 'en_IN',
    url: SITE_URL,
    title: "Close Eye — When you can't be there, Close Eye can.",
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Close Eye — When you can't be there, Close Eye can.")}`,
        width: 1200,
        height: 630,
        alt: 'Close Eye — Verified wellbeing visits for your loved ones in India',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Close Eye — When you can't be there, Close Eye can.",
    description: DEFAULT_DESCRIPTION,
    images: [`/api/og?title=${encodeURIComponent("Close Eye — When you can't be there, Close Eye can.")}`],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  themeColor: '#1a3a2a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${manrope.variable} ${dmSerif.variable}`}>
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <IOSInstallBanner />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  )
}
