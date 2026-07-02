import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, Calendar, MapPin, MessageCircle, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatIsoTime } from '@/lib/formatTime'

interface BookingRequest {
  id: string
  service_name: string
  recipient_name: string
  recipient_address: string
  scheduled_at: string | null
  amount_paise: number | null
  status: string
  created_at: string
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }) + ' at ' + formatIsoTime(iso)
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

export function BookingReceived() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const id = params.get('id')

  const [booking, setBooking] = useState<BookingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    supabase
      .from('booking_requests')
      .select('id,service_name,recipient_name,recipient_address,scheduled_at,amount_paise,status,created_at')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true) }
        else { setBooking(data as BookingRequest) }
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="ce-spinner" />
      </div>
    )
  }

  if (notFound || !booking) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: 'var(--gray-mid)' }}>Booking not found.</p>
        <Link to="/dashboard/bookings" style={{ color: 'var(--forest)', fontWeight: 600, fontSize: 14 }}>
          View all bookings →
        </Link>
      </div>
    )
  }

  const dateStr = fmtDate(booking.scheduled_at)
  const amountStr = booking.amount_paise
    ? `₹${Math.round(booking.amount_paise / 100).toLocaleString('en-IN')}`
    : null

  return (
    <div className="ce-slide-up" style={{ padding: '24px 20px 100px', maxWidth: 480, margin: '0 auto' }}>
      {/* Success icon */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, paddingBottom: 28 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--forest)', color: '#FAF7F2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <CheckCircle size={36} strokeWidth={2} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--forest)', margin: 0, textAlign: 'center', letterSpacing: '-0.02em' }}>
          Booking received
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '8px 0 0', textAlign: 'center', lineHeight: 1.5 }}>
          We're confirming a companion. You'll get a WhatsApp with a payment link shortly.
        </p>
      </div>

      {/* Booking summary card */}
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-card)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {/* Reference */}
        <div style={{
          padding: '12px 18px',
          background: 'rgba(14,42,31,0.05)',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Booking reference
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--forest)', letterSpacing: '0.08em' }}>
            CE-{shortId(booking.id)}
          </span>
        </div>

        {/* Details */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Row label="Service" value={booking.service_name} />
          <Row label="For" value={booking.recipient_name} />
          {dateStr && <Row label="Requested time" value={dateStr} icon={<Calendar size={13} />} />}
          {booking.recipient_address && <Row label="Address" value={booking.recipient_address} icon={<MapPin size={13} />} />}
          {amountStr && <Row label="Estimated amount" value={amountStr} />}
        </div>
      </div>

      {/* What happens next */}
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-card)',
        border: '1px solid #e5e7eb',
        padding: '16px 18px',
        marginBottom: 24,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          What happens next
        </p>
        <Step n={1} text="We confirm a companion is available — usually within 2 hours." />
        <Step n={2} text="You receive a WhatsApp message with a secure payment link." />
        <Step n={3} text="Pay to lock in your visit. No charge until then." />
      </div>

      {/* No charge note */}
      <div style={{
        background: 'rgba(14,42,31,0.06)',
        borderRadius: 14,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 28,
      }}>
        <MessageCircle size={15} style={{ color: 'var(--forest)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: 'var(--forest)', margin: 0, lineHeight: 1.5 }}>
          <strong>No charge now.</strong> You won't be charged until you pay the link we send. You can cancel before payment at no cost.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate('/dashboard/bookings')}
        style={{
          width: '100%',
          padding: '15px 24px',
          background: 'var(--forest)',
          color: '#FAF7F2',
          borderRadius: 'var(--radius-btn)',
          fontSize: 15,
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        View my bookings <ChevronRight size={16} />
      </button>
    </div>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--gray-mid)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: 'var(--black)', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
        {icon && <span style={{ marginTop: 2, color: 'var(--gray-mid)' }}>{icon}</span>}
        {value}
      </span>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'var(--forest)', color: '#FAF7F2',
        fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
      }}>
        {n}
      </div>
      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, margin: 0 }}>{text}</p>
    </div>
  )
}
