import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Cancellation Policy', description: 'How to reschedule or cancel a visit.' }

export default function CancellationPolicyPage() {
  return (
    <LegalPage
      title="Cancellation Policy"
      intro="Life happens. Rescheduling and cancelling should be effortless."
      sections={[
        { h: 'Reschedule any time', p: 'Move a visit to another time or day from your Family Space, or just message your Presence Manager. There’s no charge to reschedule.' },
        { h: 'Cancelling a visit', p: 'Cancel free of charge up to 2 hours before a scheduled visit. Within 2 hours, the visit may count towards your monthly allowance, since a Guardian was reserved for you.' },
        { h: 'If we cancel', p: 'If we ever have to cancel — a Guardian falls ill, or weather makes travel unsafe — we’ll offer the earliest alternative and it never counts against you.' },
        { h: 'Emergencies', p: 'Medical emergencies always take priority. Cancel freely; we’ll help coordinate hospital support if you need it.' },
      ]}
    />
  )
}
