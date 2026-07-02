import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { Calendar, CheckCircle, Clock, AlertCircle, XCircle, ChevronRight, Plus, Car, UserCheck, AlertTriangle } from 'lucide-react'
import { loadRazorpayScript } from '@/lib/razorpay'
import { formatIsoTime } from '@/lib/formatTime'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ActiveVisit {
  id: string
  service_type: string
  status: string
  scheduled_at: string | null
  reschedule_time: string | null
  attention_needed: boolean
  loved_ones: { full_name: string | null } | null
  companions: { full_name: string | null } | null
  booking_status_history: { status: string; changed_at: string; note: string | null }[]
}

interface BookingRequest {
  id: string
  service_id: string
  service_name: string
  amount_paise: number | null
  scheduled_at: string | null
  recipient_name: string
  recipient_address: string
  requester_whatsapp: string
  notes: string | null
  status: string
  payment_status: string | null
  companion_name: string | null
  confirmed_at: string | null
  paid_at: string | null
  razorpay_order_id: string | null
  created_at: string
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; sub: string; pill: string; icon: React.ReactNode }> = {
  pending_confirmation: {
    label: 'Pending confirmation',
    sub:   'We\'re confirming a companion. You\'ll get a WhatsApp payment link shortly.',
    pill:  'bg-amber-100 text-amber-700',
    icon:  <Clock size={13} />,
  },
  requested: {
    label: 'Request received',
    sub:   'Confirming a companion — usually within 2 hours.',
    pill:  'bg-amber-100 text-amber-700',
    icon:  <Clock size={13} />,
  },
  needs_details: {
    label: 'Details needed',
    sub:   'We need your address or WhatsApp to proceed.',
    pill:  'bg-orange-100 text-orange-700',
    icon:  <AlertCircle size={13} />,
  },
  confirmed: {
    label: 'Confirmed',
    sub:   'Your visit has been confirmed.',
    pill:  'bg-blue-100 text-blue-700',
    icon:  <CheckCircle size={13} />,
  },
  companion_confirmed: {
    label: 'Payment link sent',
    sub:   'Check your WhatsApp — your secure payment link is there.',
    pill:  'bg-blue-100 text-blue-700',
    icon:  <CheckCircle size={13} />,
  },
  paid: {
    label: 'Visit confirmed ✓',
    sub:   "Your visit is locked. We'll be there.",
    pill:  'bg-green-100 text-green-700',
    icon:  <CheckCircle size={13} />,
  },
  cancelled: {
    label: 'Cancelled',
    sub:   'This booking was cancelled.',
    pill:  'bg-red-100 text-red-600',
    icon:  <XCircle size={13} />,
  },
}

function cfg(status: string) {
  return STATUS_CFG[status] ?? {
    label: status.replace(/_/g, ' '),
    sub: '',
    pill: 'bg-gray-100 text-gray-500',
    icon: <Clock size={13} />,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return null
  const date = new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'Asia/Kolkata',
  })
  return `${date} at ${formatIsoTime(iso)}`
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function BookingsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" style={{ padding: '0 0 80px' }}>
      <div style={{ height: 32, width: 140, background: '#f3f4f6', borderRadius: 12 }} />
      {[1, 2].map(i => (
        <div key={i} style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0f0f0', padding: 20 }}>
          <div style={{ height: 16, width: 160, background: '#f3f4f6', borderRadius: 8, marginBottom: 12 }} />
          <div style={{ height: 12, width: 200, background: '#f3f4f6', borderRadius: 8, marginBottom: 8 }} />
          <div style={{ height: 12, width: 120, background: '#f3f4f6', borderRadius: 8 }} />
        </div>
      ))}
    </div>
  )
}

// ── Visit status timeline ─────────────────────────────────────────────────────

const TIMELINE_STEPS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'confirmed',          label: 'Confirmed',         icon: <CheckCircle size={14} /> },
  { key: 'companion_assigned', label: 'Companion assigned',icon: <UserCheck size={14} /> },
  { key: 'on_the_way',         label: 'On the way',        icon: <Car size={14} /> },
  { key: 'in_progress',        label: 'Visit in progress', icon: <Clock size={14} /> },
  { key: 'completed',          label: 'Visit done',        icon: <CheckCircle size={14} /> },
]

const STATUS_ORDER = ['confirmed','companion_assigned','on_the_way','in_progress','completed']

function visitStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:            'Pending',
    confirmed:          'Confirmed',
    companion_assigned: 'Companion assigned',
    on_the_way:         'Companion on the way',
    in_progress:        'Visit in progress',
    completed:          'Visit complete',
    delayed:            'Delayed',
    rescheduled:        'Rescheduled',
    cancelled:          'Cancelled',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

function StatusTimeline({ visit }: { visit: ActiveVisit }) {
  const currentIdx = STATUS_ORDER.indexOf(visit.status)
  const isException = ['delayed', 'rescheduled', 'cancelled'].includes(visit.status)
  const latestNote = [...visit.booking_status_history]
    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0]
  const scheduledAt = visit.reschedule_time || visit.scheduled_at
  const timeStr = scheduledAt ? formatIsoTime(scheduledAt) : null

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${visit.attention_needed ? '#FECACA' : '#E8F4EC'}`,
      borderLeft: `4px solid ${visit.attention_needed ? '#EF4444' : visit.status === 'completed' ? '#22c55e' : '#0E2A1F'}`,
      borderRadius: 16,
      padding: '14px 16px',
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--forest)', margin: 0 }}>
            {visit.loved_ones?.full_name || 'Visit'}
            {timeStr && <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 13 }}> · {timeStr}</span>}
          </p>
          {visit.companions?.full_name && (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
              👤 {visit.companions.full_name}
            </p>
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
          background: visit.status === 'completed' ? '#dcfce7' :
                      isException ? '#fef3c7' :
                      visit.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
          color: visit.status === 'completed' ? '#15803d' :
                 isException ? '#92400e' :
                 visit.status === 'in_progress' ? '#1d4ed8' : '#374151',
        }}>
          {visitStatusLabel(visit.status)}
        </span>
      </div>

      {/* Exception state */}
      {isException && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 10, padding: '8px 12px', marginBottom: 12,
          display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#78350f',
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {visit.status === 'delayed' && 'Your visit has been delayed.'}
            {visit.status === 'rescheduled' && `Visit rescheduled${scheduledAt ? ` to ${new Date(scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })} at ${formatIsoTime(scheduledAt)}` : ''}.`}
            {visit.status === 'cancelled' && 'This visit has been cancelled.'}
            {latestNote?.note && ` ${latestNote.note}`}
          </span>
        </div>
      )}

      {/* Timeline steps */}
      {!isException && visit.status !== 'cancelled' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {TIMELINE_STEPS.map((step, i) => {
            const stepIdx  = STATUS_ORDER.indexOf(step.key)
            const isDone   = currentIdx > stepIdx || visit.status === 'completed'
            const isActive = visit.status === step.key || (visit.status === 'delayed' && stepIdx === currentIdx)
            const isFuture = stepIdx > currentIdx

            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < TIMELINE_STEPS.length - 1 ? 1 : undefined }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? '#0E2A1F' : isActive ? '#A8D5B5' : '#f3f4f6',
                    color: isDone ? '#A8D5B5' : isActive ? '#0E2A1F' : '#9ca3af',
                    flexShrink: 0,
                    boxShadow: isActive ? '0 0 0 3px rgba(168,213,181,0.35)' : undefined,
                  }}>
                    {step.icon}
                  </div>
                  <p style={{
                    fontSize: 9, fontWeight: isActive ? 700 : 500, textAlign: 'center',
                    color: isDone ? '#0E2A1F' : isActive ? '#0E2A1F' : '#9ca3af',
                    lineHeight: 1.3, maxWidth: 48, margin: 0,
                  }}>
                    {step.label}
                  </p>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: 16,
                    background: isDone ? '#0E2A1F' : '#e5e7eb',
                    transition: 'background 0.3s',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Pay button ─────────────────────────────────────────────────────────────────

function PayButton({
  booking,
  profile,
  onPaid,
}: {
  booking: BookingRequest
  profile: { full_name?: string | null; whatsapp_number?: string | null } | null
  onPaid: (id: string) => void
}) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    if (!booking.amount_paise) { showToast('Amount not set — contact support', 'error'); return }
    setLoading(true)
    try {
      const rzLoaded = await loadRazorpayScript()
      if (!rzLoaded) { showToast('Could not load payment gateway — please try again', 'error'); return }

      const { data, error } = await supabase.functions.invoke('create-booking-payment-order', {
        body: { booking_request_id: booking.id },
      })
      if (error || !data?.order_id) {
        showToast(data?.error || 'Could not start payment — try again', 'error')
        return
      }

      const { order_id, key_id, amount_paise } = data as { order_id: string; key_id: string; amount_paise: number }

      const options = {
        key: key_id,
        amount: amount_paise,
        currency: 'INR',
        order_id,
        name: 'Close Eye',
        description: `${booking.service_name} for ${booking.recipient_name}`,
        prefill: {
          name: profile?.full_name || '',
          contact: booking.requester_whatsapp || profile?.whatsapp_number || '',
        },
        theme: { color: '#0E2A1F' },
        handler: () => {
          showToast('Payment received — confirming your visit…', 'success')
          onPaid(booking.id)
        },
      }

      const rzp = new window.Razorpay(options) as { open(): void; on(event: string, cb: () => void): void }
      rzp.on('payment.failed', () => {
        showToast('Payment did not complete — please try again', 'error')
      })
      rzp.open()
    } catch (err) {
      console.error('Payment error:', err)
      showToast('Something went wrong — please try again', 'error')
    } finally {
      setLoading(false)
    }
  }

  const amountStr = booking.amount_paise
    ? `₹${Math.round(booking.amount_paise / 100).toLocaleString('en-IN')}`
    : ''

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      style={{
        background: 'var(--forest)',
        color: '#FAF7F2',
        borderRadius: 100,
        padding: '13px 28px',
        fontSize: 15,
        fontWeight: 700,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        width: '100%',
        marginTop: 16,
      }}
    >
      {loading ? 'Opening payment…' : `Pay ${amountStr} to confirm →`}
    </button>
  )
}

// ── Booking card ───────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  profile,
  optimisticPaid,
  onPaid,
}: {
  booking: BookingRequest
  profile: { full_name?: string | null; whatsapp_number?: string | null } | null
  optimisticPaid: boolean
  onPaid: (id: string) => void
}) {
  const status = optimisticPaid ? 'paid' : booking.status
  const { label, sub, pill, icon } = cfg(status)
  const isPaid = status === 'paid'
  const isComp = status === 'companion_confirmed'
  const isNeedsDetails = status === 'needs_details'
  const dateStr = fmtDate(booking.scheduled_at)

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      border: `1px solid ${isPaid ? '#bbf7d0' : isComp ? '#bfdbfe' : '#f0f0f0'}`,
      borderLeft: isPaid ? '4px solid #22c55e' : isComp ? '4px solid #3b82f6' : undefined,
      overflow: 'hidden',
    }}>
      {/* Status strip */}
      <div style={{
        padding: '10px 16px',
        background: isPaid ? '#f0fdf4' : isComp ? '#eff6ff' : '#f9f9f9',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 100 }}
          className={pill}
        >
          {icon}{label}
        </span>
        {optimisticPaid && !booking.paid_at && (
          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 2 }}>Confirming…</span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--forest)', margin: 0 }}>
              {booking.service_name}
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
              For {booking.recipient_name}
            </p>
          </div>
          {booking.amount_paise ? (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>
                ₹{Math.round(booking.amount_paise / 100).toLocaleString('en-IN')}
              </p>
              <p style={{ fontSize: 11, color: isPaid ? '#16a34a' : '#9ca3af', margin: '1px 0 0', fontWeight: 600 }}>
                {isPaid ? '✓ Paid' : isComp ? 'Due now' : 'Pending'}
              </p>
            </div>
          ) : null}
        </div>

        {booking.companion_name && (
          <p style={{ fontSize: 13, color: '#374151', marginTop: 10, fontWeight: 500 }}>
            👤 <span style={{ fontWeight: 700 }}>{booking.companion_name}</span>
          </p>
        )}

        {dateStr && (
          <p style={{ fontSize: 13, color: '#4b5563', marginTop: 6 }}>📅 {dateStr}</p>
        )}

        {/* Status sub-copy */}
        {!isPaid && sub && (
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>{sub}</p>
        )}
        {isPaid && (
          <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 8 }}>
            Your visit is confirmed. We'll be there.
          </p>
        )}

        {/* Payment link notice — companion confirmed, link sent via WhatsApp */}
        {isComp && !optimisticPaid && (
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: '#eff6ff', borderRadius: 12,
            border: '1px solid #bfdbfe',
            fontSize: 13, color: '#1d4ed8', lineHeight: 1.5,
          }}>
            💳 A secure payment link has been sent to your WhatsApp. Pay there to lock in your visit.
          </div>
        )}

        {booking.recipient_address && (
          <p style={{ fontSize: 12, color: '#d1d5db', marginTop: 10 }}>
            📍 {booking.recipient_address}
          </p>
        )}

        {booking.notes && (
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>
            "{booking.notes}"
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #f3f4f6', padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ fontSize: 11, color: '#d1d5db', margin: 0 }}>
          Requested {fmtShort(booking.created_at)}
        </p>
        {isNeedsDetails && (
          <Link
            to="/dashboard/profile"
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
          >
            Update profile <ChevronRight size={12} />
          </Link>
        )}
        {!['paid', 'cancelled', 'needs_details'].includes(status) && (
          <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
            Live tracking
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} className="ce-pulse-dot" />
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function DashboardBookings() {
  const { user, profile } = useAuth()
  const [bookings, setBookings]               = useState<BookingRequest[]>([])
  const [activeVisits, setActiveVisits]       = useState<ActiveVisit[]>([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState<string | null>(null)
  const [optimisticPaid, setOptimisticPaid]   = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!user) return

    // Build OR filter: match by user_id OR by requester_whatsapp (handles guest bookings
    // that didn't have user_id set at submission time but were later linked by admin confirm).
    const phone10 = profile?.whatsapp_number?.replace(/\D/g, '').slice(-10) ?? ''
    const orFilter = phone10
      ? `user_id.eq.${user.id},requester_whatsapp.ilike.%${phone10}`
      : `user_id.eq.${user.id}`

    const [requestsRes, visitsRes] = await Promise.all([
      supabase
        .from('booking_requests')
        .select('id,service_id,service_name,amount_paise,scheduled_at,recipient_name,recipient_address,requester_whatsapp,notes,status,payment_status,companion_name,confirmed_at,paid_at,razorpay_order_id,created_at')
        .or(orFilter)
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('id,service_type,status,scheduled_at,reschedule_time,attention_needed,loved_ones(full_name),companions(full_name),booking_status_history(status,changed_at,note)')
        .eq('family_user_id', user.id)
        .not('status', 'in', '("cancelled")')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (requestsRes.error) { setError('Could not load bookings — please try again.'); setLoading(false); return }
    setBookings(requestsRes.data || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setActiveVisits(((visitsRes.data ?? []) as any[]) as ActiveVisit[])
    setLoading(false)
    setError(null)
  }, [user])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  function handlePaid(id: string) {
    setOptimisticPaid(prev => new Set(prev).add(id))
    setTimeout(() => load(), 5000)
  }

  const active = bookings.filter(b => b.status !== 'cancelled')
  const past   = bookings.filter(b => b.status === 'cancelled')

  if (loading) return (
    <div style={{ padding: '0 16px' }}>
      <BookingsSkeleton />
    </div>
  )

  return (
    <div style={{ padding: '0 16px 80px' }} className="ce-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontWeight: 700, fontSize: 22, color: 'var(--forest)', margin: 0 }}>My bookings</h1>
        <Link
          to="/dashboard/book"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--forest)', color: '#FAF7F2', borderRadius: 100,
            padding: '10px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}
        >
          <Plus size={14} /> New visit
        </Link>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 14, color: '#dc2626' }}>
          {error}
          <button onClick={load} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}>Retry</button>
        </div>
      )}

      {/* ── Active visit tracking (from bookings table) ───────────────────── */}
      {activeVisits.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', margin: '0 0 10px' }}>VISIT TRACKING</p>
          {activeVisits.map(v => <StatusTimeline key={v.id} visit={v} />)}
        </div>
      )}

      {/* Empty state */}
      {bookings.length === 0 && activeVisits.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 20px', background: '#fff', borderRadius: 20, border: '1px solid #f0f0f0' }}>
          <div style={{ width: 56, height: 56, background: '#f0fdf4', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Calendar size={24} color="#16a34a" />
          </div>
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--forest)', margin: '0 0 6px' }}>No bookings yet</p>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 24px' }}>Book a companion visit for your loved one.</p>
          <Link
            to="/dashboard/book"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--forest)', color: '#FAF7F2', borderRadius: 100, padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            <Plus size={14} /> Book a visit
          </Link>
        </div>
      )}

      {/* Active bookings */}
      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: past.length ? 24 : 0 }}>
          {active.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              profile={profile}
              optimisticPaid={optimisticPaid.has(b.id)}
              onPaid={handlePaid}
            />
          ))}
        </div>
      )}

      {/* Cancelled bookings */}
      {past.length > 0 && (
        <>
          {active.length > 0 && (
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', margin: '0 0 10px' }}>CANCELLED</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {past.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                profile={profile}
                optimisticPaid={false}
                onPaid={() => {}}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
