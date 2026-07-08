import { NextResponse } from 'next/server'
import { bookingSchema } from '@/features/booking/schema'

/**
 * Booking intake — backend swap-boundary.
 *
 * Integration point: persist to the bookings table, assign a Presence Manager,
 * and trigger the WhatsApp confirmation flow (see sendWhatsAppConfirmation).
 * Today it validates the payload and returns a booking reference so the
 * front-end success flow is fully wired and ready for the real endpoint.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }

  const parsed = bookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Some details need another look', issues: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // Integration point: insert into DB, assign Presence Manager, enqueue WhatsApp.
  const ref = `CE-${Date.now().toString(36).toUpperCase().slice(-6)}`

  return NextResponse.json({ ok: true, ref, receivedAt: new Date().toISOString() })
}
