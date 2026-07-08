import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Cookies', description: 'The few cookies we use, in plain language.' }

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      intro="We keep it minimal — only what’s needed to run Close Eye well."
      sections={[
        { h: 'Essential', p: 'A few cookies keep you signed in and remember your device so you don’t have to log in every time. The app can’t work without these.' },
        { h: 'Preferences', p: 'We remember small choices — like your last-used view — to make the experience smoother. Nothing sensitive is stored.' },
        { h: 'No ad tracking', p: 'We do not use advertising or cross-site tracking cookies, and we never sell your data. Ever.' },
        { h: 'Your control', p: 'You can clear cookies from your browser any time. Doing so will simply sign you out.' },
      ]}
    />
  )
}
