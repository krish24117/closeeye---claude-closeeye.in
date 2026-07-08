import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Medical Disclaimer', description: 'What Close Eye is, and isn’t.' }

export default function MedicalDisclaimerPage() {
  return (
    <LegalPage
      title="Medical Disclaimer"
      intro="Close Eye brings presence and support — not medical diagnosis or treatment."
      sections={[
        { h: 'A care and support service', p: 'Our Guardians and Companions provide companionship, wellbeing check-ins, reminders and hospital assistance. They are not doctors, and Close Eye does not provide diagnosis, treatment or medical advice.' },
        { h: 'Observations, not assessments', p: 'The wellbeing notes a Guardian records are gentle, human observations to keep your family informed. They are not a clinical assessment and should not replace your physician’s advice.' },
        { h: 'In an emergency', p: 'In any medical emergency, call 108 (ambulance) and your physician first. We’ll support alongside — coordinating, staying with your loved one, and keeping you updated.' },
        { h: 'Medication', p: 'We can offer reminders and note whether medicines were taken, but administering or changing medication is always the responsibility of your loved one and their doctor.' },
      ]}
    />
  )
}
