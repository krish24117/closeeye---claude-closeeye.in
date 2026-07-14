import type { Metadata } from 'next'
import './connect.css'
import { getLaunchMode, MODE_CONFIG } from '@/components/connect/config'

/**
 * /connect — the Close Eye Connect launch experience. A self-contained route
 * group with its OWN layout: it does not use the marketing chrome and imports
 * nothing from the existing site. Not indexed until the public launch mode.
 */
export function generateMetadata(): Metadata {
  const cfg = MODE_CONFIG[getLaunchMode()]
  return {
    title: { absolute: 'Close Eye Connect — Stay close to the people you can’t be near' },
    description:
      'A calm, always-there presence for the people you love — so distance never means being out of touch. Join the first 1,000 Founding Families.',
    alternates: { canonical: '/connect' },
    robots: cfg.indexable ? { index: true, follow: true } : { index: false, follow: false },
  }
}

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cx" id="top">
      <noscript>
        <style>{`.cx-reveal{opacity:1 !important;transform:none !important}`}</style>
      </noscript>
      {children}
    </div>
  )
}
