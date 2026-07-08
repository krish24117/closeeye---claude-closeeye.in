import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Terms of Service', description: 'The simple terms of using Close Eye.' }

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="The plain-language version of what you can expect from us, and what we ask of you."
      sections={[
        { h: 'Our promise', p: 'Close Eye provides a trusted human presence — wellbeing visits, companionship, hospital assistance and coordination — for your loved ones. We are a care and support service, not a medical provider.' },
        { h: 'Your account', p: 'You’re responsible for keeping your login secure and your family’s details accurate. Let us know if anything changes so we can care for your family well.' },
        { h: 'Membership & visits', p: 'Visits are delivered under your chosen membership. Availability depends on your city and zone; we’ll always tell you honestly what we can and can’t do.' },
        { h: 'Fair use', p: 'Please use Close Eye for its intended purpose — caring for your family. Emergencies should always go to 108 or your physician first; we support alongside, not instead of, emergency services.' },
        { h: 'Changes', p: 'We may update these terms as the service grows. We’ll tell you about anything important in advance, in language you can actually read.' },
      ]}
    />
  )
}
