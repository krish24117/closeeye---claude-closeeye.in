import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Refund Policy', description: 'How refunds work at Close Eye.' }

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="Fair, prompt and human. If we didn’t deliver, you don’t pay."
      sections={[
        { h: 'When you’re eligible', p: 'If a paid visit isn’t delivered — for a reason on our side — you’re due a full refund or a free reschedule, your choice.' },
        { h: 'Membership', p: 'Cancel a monthly membership any time; you keep access until the end of the paid period. Annual plans are refundable pro-rata for unused whole months.' },
        { h: 'How long it takes', p: 'Approved refunds are returned to your original payment method within 5–7 working days via Razorpay.' },
        { h: 'Duplicate or failed charges', p: 'Charged twice, or a payment failed but money left your account? Tell your Presence Manager and we’ll resolve it quickly — usually the same day.' },
      ]}
    />
  )
}
