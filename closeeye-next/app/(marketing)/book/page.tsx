import type { Metadata } from 'next'
import { BookingProvider } from '@/features/booking/state'
import { BookingWizard } from '@/features/booking/booking-wizard'
import { BOOKING_SERVICES } from '@/features/booking/schema'

export const metadata: Metadata = {
  title: 'Book a visit',
  description:
    'Book a trusted visit for someone you love in under two minutes. A dedicated Presence Manager and a verified Guardian, every time.',
  robots: { index: true, follow: true },
}

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string | string[] }> }) {
  const sp = await searchParams
  const raw = typeof sp.service === 'string' ? sp.service : undefined
  const initialServiceId = BOOKING_SERVICES.find((s) => s.id === raw)?.id

  return (
    <BookingProvider initialServiceId={initialServiceId}>
      <BookingWizard />
    </BookingProvider>
  )
}
