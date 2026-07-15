import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'
import './space.css'

/**
 * /space — the private Family Space: the living family journal after sign-in. A
 * self-contained route group sharing the Connect design language (Newsreader +
 * Inter), scoped to `.spc`. Private by design — never indexed.
 */
const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { absolute: 'Close Eye — Your Family Space' },
  description: 'Your family’s private journal — what Close Eye knows, what it’s learning, every visit written down.',
  robots: { index: false, follow: false },
}

export default function SpaceLayout({ children }: { children: React.ReactNode }) {
  return <div className={`spc ${newsreader.variable}`}>{children}</div>
}
