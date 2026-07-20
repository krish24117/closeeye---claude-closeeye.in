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
    // Family-Intelligence positioning (global Connect) — understanding + memory, not Care/presence.
    title: { absolute: 'Close Eye Connect — The intelligence that knows the people you love' },
    description:
      'Close Eye learns about the people you love, so answers come from understanding — not guesses. It remembers what matters, privately, for years.',
    alternates: { canonical: '/connect' },
    robots: isConnectIndexable() ? { index: true, follow: true } : { index: false, follow: false },
    /**
     * Connect's own card. Without this, every share of this link inherited the marketing
     * site's openGraph — "home wellbeing visits, hospital companionship" — which promises
     * visits that don't open until 15 August. That card was the FIRST thing a family read,
     * before the page loaded, and it contradicted the product behind it. The words below
     * are the ones already written above: true today, no capability we can't deliver.
     */
    openGraph: {
      type: 'website',
      locale: 'en_US', // Connect is the global product — a neutral default, not India-specific
      url: '/connect',
      siteName: 'Close Eye',
      title: 'Close Eye Connect — The intelligence that knows the people you love',
      description:
        'Tell Close Eye about someone you love, in one sentence. It understands from there — never guesses.',
      images: [{ url: '/og-connect.png', width: 1200, height: 630, alt: 'Close Eye — the intelligence that knows the people you love' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Close Eye Connect — The intelligence that knows the people you love',
      description:
        'Tell Close Eye about someone you love, in one sentence. It understands from there — never guesses.',
      images: ['/og-connect.png'],
    },
  }
}

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`cx ${newsreader.variable}`} id="top">
      {children}
    </div>
  )
}
