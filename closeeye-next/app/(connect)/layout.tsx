import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'
import './connect.css'
import { isConnectIndexable } from '@/components/connect/config'

/**
 * /connect — the Close Eye Connect experience. A self-contained route group with
 * its OWN layout and a NEW design language (Newsreader serif = the human voice,
 * Inter = interface chrome). It imports nothing from the marketing/family app and
 * scopes its fonts + palette to `.cx` so nothing else on the site is affected.
 */
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

export function generateMetadata(): Metadata {
  return {
    // Tagline "Your Trusted Presence" rides in the title/description (once, placed well).
    title: { absolute: 'Close Eye Connect — Your Trusted Presence' },
    description:
      'Close Eye learns about the people you love, so answers come from understanding — not guesses. When needed, trusted local people step in to help.',
    alternates: { canonical: '/connect' },
    robots: isConnectIndexable() ? { index: true, follow: true } : { index: false, follow: false },
  }
}

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`cx ${newsreader.variable}`} id="top">
      {children}
    </div>
  )
}
