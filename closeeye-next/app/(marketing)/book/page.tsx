import type { Metadata } from 'next'
import { BookingProvider } from '@/features/booking/state'
import { BookingWizard } from '@/features/booking/booking-wizard'

export const metadata: Metadata = {
  title: 'Book a visit',
  description:
    'Book a trusted visit for someone you love in under two minutes. A dedicated Presence Manager and a verified Guardian, every time.',
  robots: { index: true, follow: true },
}

export default function BookPage() {
  return (
    <BookingProvider>
      <BookingWizard />
    </BookingProvider>
  )
}
