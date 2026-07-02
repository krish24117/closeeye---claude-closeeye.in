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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 80 }}>
      {[1, 2].map(i => (
        <div key={i} className="ce-bk-skel">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="ce-bk-skel-bar" style={{ height: 24, width: 130, borderRadius: 100 }} />
            <div className="ce-bk-skel-bar" style={{ height: 22, width: 56 }} />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="ce-bk-skel-bar" style={{ height: 18, width: '65%' }} />
            <div className="ce-bk-skel-bar" style={{ height: 13, width: '40%' }} />
            <div className="ce-bk-skel-bar" style={{ height: 13, width: '55%', marginTop: 4 }} />
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between' }}>
            <div className="ce-bk-skel-bar" style={{ height: 11, width: 90 }} />
            <div className="ce-bk-skel-bar" style={{ height: 11, width: 40 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Visit status timeline ─────────────────────────────────────────────────────

const TIMELINE_STEPS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'confirmed',          label: 'Confirmed',         icon: <CheckCircle size={14} /> },
  { key: 'companion_assigned', label: 'Assigned',          icon: <UserCheck size={14} /> },
  { key: 'on_the_way',         label: 'On the way',        icon: <Car size={14} /> },
  { key: 'in_progress',        label: 'In progress',       icon: <Clock size={14} /> },
  { key: 'completed',          label: 'Done',              icon: <CheckCircle size={14} /> },
]

const STATUS_ORDER = ['confirmed','companion_assigned','on_the_way','in_progress','completed']

function visitStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:            'Pending',
    confirmed:          'Confirmed',
    companion_assigned: 'Companion assigned',
    on_the_way:         'On the way',
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

  const badgeStyle: React.CSSProperties = {
    background: visit.status === 'completed' ? '#DCFCE7' :
                isException ? '#FEF3C7' :
                visit.status === 'in_progress' ? '#DBEAFE' : '#F3F4F6',
    color: visit.status === 'completed' ? '#15803D' :
           isException ? '#92400E' :
           visit.status === 'in_progress' ? '#1D4ED8' : '#374151',
  }

  return (
    <div
      className="ce-bk-track"
      style={{
        borderLeft: `4px solid ${visit.attention_needed ? '#EF4444' : visit.status === 'completed' ? '#22C55E' : 'var(--forest)'}`,
      }}
    >
      {/* Header */}
      <div className="ce-bk-track-hdr">
        <div>
          <p className="ce-bk-track-name">
            {visit.loved_ones?.full_name || 'Visit'}
          </p>
          {visit.companions?.full_name && (
            <p className="ce-bk-track-time">👤 {visit.companions.full_name}{timeStr ? ` · ${timeStr}` : ''}</p>
          )}
          {!visit.companions?.full_name && timeStr && (
            <p className="ce-bk-track-time">{timeStr}</p>
          )}
        </div>
        <span className="ce-bk-track-badge" style={badgeStyle}>
          {visitStatusLabel(visit.status)}
        </span>
      </div>

      {/* Exception state */}
      {isException && (
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 10, padding: '8px 12px', marginBottom: 14,
          display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#78350F',
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
        <div className="ce-bk-steps">
          {TIMELINE_STEPS.map((step, i) => {
            const stepIdx  = STATUS_ORDER.indexOf(step.key)
            const isDone   = currentIdx > stepIdx || visit.status === 'completed'
            const isActive = visit.status === step.key || (visit.status === 'delayed' && stepIdx === currentIdx)

            const dotClass = isDone ? 'done' : isActive ? 'active' : 'future'

            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', flex: i < TIMELINE_STEPS.length - 1 ? 1 : undefined, position: 'relative' }}>
                <div className="ce-bk-step">
                  <div className={`ce-bk-dot ${dotClass}`}>
                    {step.icon}
                  </div>
                  <p className={`ce-bk-dot-lbl ${dotClass}`}>{step.label}</p>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`ce-bk-connector ${isDone ? 'done' : 'future'}`} />
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
      className="ce-bk-pay-btn"
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
  const isPaid       = status === 'paid'
  const isComp       = status === 'companion_confirmed'
  const isNeedsDetails = status === 'needs_details'
  const isCancelled  = status === 'cancelled'
  const dateStr = fmtDate(booking.scheduled_at)

  const amountStr = booking.amount_paise
    ? `₹${Math.round(booking.amount_paise / 100).toLocaleString('en-IN')}`
    : null

  const topBg = isPaid ? '#F0FDF4' : isComp ? '#EFF6FF' : isCancelled ? '#FAFAFA' : '#FAFAFA'

  return (
    <div className="ce-bk-card">
      {/* Status strip + amount */}
      <div className="ce-bk-top" style={{ background: topBg }}>
        <span className={`ce-bk-pill ${pill}`}>
          {icon}&nbsp;{label}
        </span>
        {amountStr && (
          <div>
            <span className="ce-bk-amount-val">{amountStr}</span>
            <div
              className="ce-bk-amount-lbl"
              style={{ color: isPaid ? '#16A34A' : isComp ? '#2563EB' : '#9CA3AF' }}
            >
              {isPaid ? '✓ Paid' : isComp ? 'Due now' : 'Pending'}
            </div>
          </div>
        )}
        {optimisticPaid && !booking.paid_at && !amountStr && (
          <span style={{ fontSize: 11, color: '#6B7280' }}>Confirming…</span>
        )}
      </div>

      {/* Body */}
      <div className="ce-bk-body">
        <p className="ce-bk-svc">{booking.service_name}</p>
        <p className="ce-bk-for">For {booking.recipient_name}</p>

        {dateStr && (
          <div className="ce-bk-meta">
            <Calendar size={13} color="#9CA3AF" />
            <span>{dateStr}</span>
          </div>
        )}

        {booking.companion_name && (
          <div className="ce-bk-meta">
            <UserCheck size={13} color="#9CA3AF" />
            <span style={{ fontWeight: 600 }}>{booking.companion_name}</span>
          </div>
        )}

        {/* Status message */}
        {!isPaid && sub && (
          <p className="ce-bk-sub">{sub}</p>
        )}
        {isPaid && (
          <p className="ce-bk-sub" style={{ color: '#16A34A', fontWeight: 600 }}>
            Your visit is confirmed. We'll be there.
          </p>
        )}

        {/* Payment link notice */}
        {isComp && !optimisticPaid && (
          <div className="ce-bk-wa-cta">
            💳 A secure payment link has been sent to your WhatsApp. Pay there to lock in your visit.
          </div>
        )}

        {/* Needs details CTA */}
        {isNeedsDetails && (
          <Link
            to="/dashboard/profile"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 13, fontWeight: 700, color: 'var(--forest)', textDecoration: 'none' }}
          >
            Update your profile <ChevronRight size={13} />
          </Link>
        )}
      </div>

      {/* Footer */}
      <div className="ce-bk-footer">
        <span className="ce-bk-footer-date">Requested {fmtShort(booking.created_at)}</span>
        {!['paid', 'cancelled', 'needs_details'].includes(status) && (
          <span className="ce-bk-live">
            Live&nbsp;
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} className="ce-pulse-dot" />
          </span>
        )}
        {optimisticPaid && !booking.paid_at && (
          <span style={{ fontSize: 11, color: '#6B7280' }}>Confirming…</span>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, marginTop: 4 }}>
        <div style={{ height: 28, width: 120, background: '#F0F0F0', borderRadius: 8, animation: 'ce-skel-shimmer 1.4s ease-in-out infinite' }} />
        <div style={{ height: 38, width: 96, background: '#F0F0F0', borderRadius: 100, animation: 'ce-skel-shimmer 1.4s ease-in-out infinite' }} />
      </div>
      <BookingsSkeleton />
    </div>
  )

  return (
    <div style={{ padding: '0 16px 80px' }} className="ce-slide-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, marginTop: 4 }}>
        <h1 style={{ fontWeight: 700, fontSize: 22, color: 'var(--forest)', margin: 0, letterSpacing: '-0.02em' }}>My bookings</h1>
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

      {/* Error */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 14, color: '#DC2626' }}>
          {error}
          <button onClick={load} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', flexShrink: 0 }}>Retry</button>
        </div>
      )}

      {/* Active visit tracking */}
      {activeVisits.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="ce-bk-sec">Today's visits</p>
          {activeVisits.map(v => <StatusTimeline key={v.id} visit={v} />)}
        </div>
      )}

      {/* Empty state */}
      {bookings.length === 0 && activeVisits.length === 0 && (
        <div className="ce-bk-empty">
          <div className="ce-bk-empty-icon">
            <Calendar size={26} color="#16A34A" />
          </div>
          <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--forest)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>No bookings yet</p>
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: '0 0 24px', lineHeight: 1.5 }}>Book a companion visit for your loved one — we'll send a WhatsApp report after every visit.</p>
          <Link
            to="/dashboard/book"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--forest)', color: '#FAF7F2', borderRadius: 100, padding: '13px 26px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            <Plus size={14} /> Book a visit
          </Link>
        </div>
      )}

      {/* Active bookings */}
      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: past.length ? 28 : 0 }}>
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
          <p className="ce-bk-sec" style={{ marginTop: active.length ? 0 : undefined }}>Cancelled</p>
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
