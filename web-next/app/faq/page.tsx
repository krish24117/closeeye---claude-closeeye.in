import type { Metadata } from 'next'
import { FAQContent } from './FAQContent'

const TITLE = 'FAQ — Close Eye'
const DESCRIPTION = 'Answers to common questions about Close Eye visits, companion verification, pricing, cancellations, and coverage areas.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/faq' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/faq', images: [{ url: `/api/og?title=${encodeURIComponent(TITLE)}`, width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`/api/og?title=${encodeURIComponent(TITLE)}`] },
}

export default function FAQPage() {
  return <FAQContent />
}
