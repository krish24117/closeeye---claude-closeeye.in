import type { Metadata } from 'next'
import { WaitlistContent } from './WaitlistContent'

const TITLE = 'Join Waitlist — Close Eye'
const DESCRIPTION = 'Join the Close Eye waitlist to be notified the moment we launch verified companion visits in your city.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/waitlist' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/waitlist', images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`/api/og?title=${encodeURIComponent(TITLE)}`] },
}

export default function WaitlistPage() {
  return <WaitlistContent />
}
