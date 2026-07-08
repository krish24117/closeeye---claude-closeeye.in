import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Consent', description: 'What you consent to, and stay in control of.' }

export default function ConsentPage() {
  return (
    <LegalPage
      title="Consent"
      intro="You’re always in control of what’s shared, and with whom."
      sections={[
        { h: 'Visit reports & photos', p: 'With your permission, Guardians record a warm report and may add photos or a voice note. These are shared only with your family — never publicly, never for marketing.' },
        { h: 'The loved one’s comfort', p: 'We ask your loved one’s comfort at every step. If they’d rather not be photographed, we simply don’t. Dignity comes first.' },
        { h: 'Health information', p: 'Any health notes (like a blood-pressure reading) are captured only when your family requests them, and shared only with you and the people caring for your loved one.' },
        { h: 'Withdrawing consent', p: 'Change your mind any time. Turn off photos, voice notes or specific sharing from your settings, or ask your Presence Manager.' },
      ]}
    />
  )
}
