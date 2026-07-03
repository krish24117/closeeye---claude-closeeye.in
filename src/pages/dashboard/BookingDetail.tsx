import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, Clock, UserCheck, MapPin, FileText,
  MessageCircle, Loader2, AlertTriangle, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { loadRazorpayScript } from '@/lib/razorpay'
import { formatIsoTime } from '@/lib/formatTime'

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Service emoji ──────────────────────────────────────────────────────────────

const SERVICE_EMOJI: Record<string, string> = {
  home_visit:                    '🏠',
  doctor_visit_support:          '👨‍⚕️',
  hospital_assistance_half_day:  '🏥',
  hospital_assistance_full_day:  '🏥',
  emergency_support_visit:       '🚨',
  grocery_medicine_assistance:   '🛒',
  home_maintenance_coordination: '🔧',
}

// ── Status timeline steps ──────────────────────────────────────────────────────

interface TimelineStep {
  key: string
  label: string
  icon: React.ReactNode
  getTimestamp: (b: BookingRequest) => string | null
  isComplete: (b: BookingRequest) => boolean
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: 'requested',
    label: 'Booking Requested',
    icon: <FileText size={11} />,
    getTimestamp: b => b.created_at,
    isComplete: () => true,
  },
  {
    key: 'companion_assigned',
    label: 'Companion Assigned',
    icon: <UserCheck size={11} />,
    getTimestamp: b => b.confirmed_at,
    isComplete: b => ['confirmed','companion_confirmed','paid','completed'].includes(b.status),
  },
  {
    key: 'payment_confirmed',
    label: 'Payment Confirmed',
    icon: <CheckCircle size={11} />,
    getTimestamp: b => b.paid_at,
    isComplete: b => ['paid','completed'].includes(b.status),
  },
  {
    key: 'completed',
    label: 'Visit Completed',
    icon: <CheckCircle size={11} />,
    getTimestamp: () => null,
    isComplete: b => b.status === 'completed',
  },
]

// ── Badge config ───────────────────────────────────────────────────────────────

const BADGE_MAP: Record<string, { label: string; cls: string }> = {
  pending_confirmation: { label: 'Pending Confirmation', cls: 'ce-mc-badge-amber'  },
  requested:            { label: 'Request Received',     cls: 'ce-mc-badge-amber'  },
  needs_details:        { label: 'Needs Details',        cls: 'ce-mc-badge-orange' },
  confirmed:            { label: 'Companion Assigned',   cls: 'ce-mc-badge-blue'   },
  companion_confirmed:  { label: 'Payment Pending',      cls: 'ce-mc-badge-blue'   },
  paid:                 { label: 'Visit Confirmed ✓',    cls: 'ce-mc-badge-green'  },
  completed:            { label: 'Visit Completed',      cls: 'ce-mc-badge-teal'   },
  cancelled:            { label: 'Cancelled',            cls: 'ce-mc-badge-gray'   },
}

function getBadge(status: string) {
  return BADGE_MAP[status] ?? { label: status.replace(/_/g, ' '), cls: 'ce-mc-badge-gray' }
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function fmtFull(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }) + ' · ' + formatIsoTime(iso)
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }) + ' · ' + formatIsoTime(iso)
}

// ── Pay button ─────────────────────────────────────────────────────────────────

function PayButton({
  booking, profile, onPaid,
}: {
  booking: BookingRequest
  profile: { full_name?: string | null; whatsapp_number?: string | null } | null
  onPaid: () => void
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
      if (error || !data?.order_id) { showToast(data?.error || 'Could not start payment — try again', 'error'); return }
      const { order_id, key_id, amount_paise } = data as { order_id: string; key_id: string; amount_paise: number }
      const options = {
        key: key_id, amount: amount_paise, currency: 'INR', order_id,
        name: 'Close Eye',
        description: `${booking.service_name} for ${booking.recipient_name}`,
        prefill: { name: profile?.full_name || '', contact: booking.requester_whatsapp || profile?.whatsapp_number || '' },
        theme: { color: '#0E2A1F' },
        handler: () => { showToast('Payment received — confirming your visit…', 'success'); onPaid() },
      }
      const rzp = new window.Razorpay(options) as { open(): void; on(event: string, cb: () => void): void }
      rzp.on('payment.failed', () => { showToast('Payment did not complete — please try again', 'error') })
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
    <button onClick={handlePay} disabled={loading}
      className="ce-mc-action-btn" style={{ marginTop: 0 }}>
      {loading ? <><Loader2 size={16} className="ce-spin" /> Opening payment…</> : `Pay ${amountStr} to confirm visit →`}
    </button>
  )
}

// ── Vertical timeline ──────────────────────────────────────────────────────────

function VerticalTimeline({ booking }: { booking: BookingRequest }) {
  const isCancelled = booking.status === 'cancelled'
  if (isCancelled) {
    return (
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'4px 0' }}>
        <div className="ce-mc-vline-dot" style={{ background:'#FEE2E2', color:'#DC2626' }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="ce-mc-vline-label">Booking Cancelled</p>
          <p className="ce-mc-vline-ts">This visit was cancelled. Need to rebook? <Link to="/dashboard/book" style={{ color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>We're here.</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="ce-mc-vline">
      {TIMELINE_STEPS.map((step, i) => {
        const done = step.isComplete(booking)
        const isLast = i === TIMELINE_STEPS.length - 1
        const ts = step.getTimestamp(booking)
        // Active: next step after the last completed one
        const nextIncomplete = TIMELINE_STEPS.findIndex(s => !s.isComplete(booking))
        const isActive = i === nextIncomplete && !done

        return (
          <div key={step.key} className="ce-mc-vline-item">
            <div className="ce-mc-vline-dot-col">
              <div className={`ce-mc-vline-dot ${done ? 'done' : isActive ? 'active' : 'future'}`}>
                {step.icon}
              </div>
              {!isLast && <div className={`ce-mc-vline-line ${done ? 'done' : ''}`} />}
            </div>
            <div style={{ paddingTop:2 }}>
              <p className={`ce-mc-vline-label${done || isActive ? '' : ' future'}`}>
                {step.label}
              </p>
              {ts && done && <p className="ce-mc-vline-ts">{fmtShort(ts)}</p>}
              {isActive && !ts && <p className="ce-mc-vline-ts">In progress…</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Rate companion modal ────────────────────────────────────────────────────────

function RatingModal({ onClose, companionName }: { onClose: () => void; companionName: string }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  function submit() {
    if (!rating) return
    setSubmitted(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:9999 }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'24px 20px 32px', width:'100%', maxWidth:480 }}
        onClick={e => e.stopPropagation()}
      >
        {submitted ? (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <p style={{ fontSize:32, marginBottom:8 }}>🙏</p>
            <p style={{ fontSize:18, fontWeight:700, color:'#1D1D1F' }}>Thank you!</p>
            <p style={{ fontSize:14, color:'#6E6E73', marginTop:4 }}>Your feedback helps us improve.</p>
          </div>
        ) : (
          <>
            <div style={{ width:36, height:4, background:'#E5E5EA', borderRadius:2, margin:'0 auto 20px' }} />
            <p style={{ fontSize:17, fontWeight:700, color:'#1D1D1F', margin:'0 0 4px' }}>
              Rate your companion
            </p>
            <p style={{ fontSize:13.5, color:'#6E6E73', margin:'0 0 20px' }}>
              How was your experience with {companionName}?
            </p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:24 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:4, fontSize:36, transition:'transform 120ms ease', transform: (hover || rating) >= n ? 'scale(1.15)' : 'scale(1)' }}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >
                  {(hover || rating) >= n ? '⭐' : '☆'}
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              disabled={!rating}
              className="ce-mc-action-btn"
              style={{ opacity: rating ? 1 : 0.4 }}
            >
              Submit rating
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Detail block helper ────────────────────────────────────────────────────────

function DetailBlock({ children }: { children: React.ReactNode }) {
  return <div className="ce-mc-detail-block">{children}</div>
}

function DetailRow({
  icon, label, value, children,
}: {
  icon: React.ReactNode; label: string; value?: string; children?: React.ReactNode
}) {
  return (
    <div className="ce-mc-detail-row">
      <div className="ce-mc-detail-icon" aria-hidden="true">{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <p className="ce-mc-detail-key">{label}</p>
        {value && <p className="ce-mc-detail-val">{value}</p>}
        {children}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [booking, setBooking]     = useState<BookingRequest | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [optimisticPaid, setOptimisticPaid] = useState(false)

  useEffect(() => {
    if (!user || !id) return
    ;(async () => {
      const { data, error: err } = await supabase
        .from('booking_requests')
        .select('id,service_id,service_name,amount_paise,scheduled_at,recipient_name,recipient_address,requester_whatsapp,notes,status,payment_status,companion_name,confirmed_at,paid_at,razorpay_order_id,created_at')
        .eq('id', id)
        .maybeSingle()
      if (err || !data) { setError('Could not load booking details.'); setLoading(false); return }
      setBooking(data)
      setLoading(false)
    })()
  }, [user, id])

  async function reload() {
    if (!user || !id) return
    const { data } = await supabase
      .from('booking_requests')
      .select('id,service_id,service_name,amount_paise,scheduled_at,recipient_name,recipient_address,requester_whatsapp,notes,status,payment_status,companion_name,confirmed_at,paid_at,razorpay_order_id,created_at')
      .eq('id', id)
      .maybeSingle()
    if (data) setBooking(data)
  }

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid #F0EBE1' }}>
        <div className="ce-bk-skel-bar" style={{ width:36, height:36, borderRadius:'50%' }} />
        <div className="ce-bk-skel-bar" style={{ width:120, height:18, borderRadius:8 }} />
      </div>
      <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        <div className="ce-bk-skel-bar" style={{ height:120, borderRadius:18 }} />
        <div className="ce-bk-skel-bar" style={{ height:180, borderRadius:18 }} />
        <div className="ce-bk-skel-bar" style={{ height:100, borderRadius:18 }} />
      </div>
    </div>
  )

  if (error || !booking) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid #F0EBE1' }}>
        <button onClick={() => navigate(-1)} style={{ width:36, height:36, borderRadius:'50%', background:'#F5F0E8', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} aria-label="Go back">
          <ArrowLeft size={16} color="#0E2A1F" />
        </button>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, textAlign:'center' }}>
        <p style={{ fontSize:16, fontWeight:600, color:'#1D1D1F', marginBottom:8 }}>{error || 'Booking not found'}</p>
        <button onClick={() => navigate('/dashboard/bookings')} style={{ fontSize:14, color:'#0E2A1F', fontWeight:700, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
          Back to My Care
        </button>
      </div>
    </div>
  )

  const effectiveStatus = optimisticPaid ? 'paid' : booking.status
  const b = getBadge(effectiveStatus)
  const emoji = SERVICE_EMOJI[booking.service_id] || '🏥'
  const amountStr = booking.amount_paise
    ? `₹${Math.round(booking.amount_paise / 100).toLocaleString('en-IN')}`
    : null
  const isCompleted = effectiveStatus === 'completed'
  const isCancelled = effectiveStatus === 'cancelled'
  const needsPay    = effectiveStatus === 'companion_confirmed'
  const canCancel   = ['pending_confirmation','requested','confirmed','companion_confirmed'].includes(effectiveStatus)
  const needsDetails = effectiveStatus === 'needs_details'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#F5F0E8' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#fff', borderBottom:'1px solid #F0EBE1', flexShrink:0 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ width:36, height:36, borderRadius:'50%', background:'#F5F0E8', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
          aria-label="Go back"
        >
          <ArrowLeft size={16} color="#0E2A1F" />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:14, fontWeight:700, color:'#1D1D1F', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {booking?.service_name || 'Booking Details'}
          </p>
        </div>
        <span className={`ce-mc-badge ${b.cls}`}>{b.label}</span>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' as never, padding:'16px 16px', paddingBottom:'calc(16px + env(safe-area-inset-bottom))' }}>

        {/* ── Hero block ── */}
        <div style={{ background:'#0E2A1F', borderRadius:20, padding:'20px', marginBottom:12, overflow:'hidden' }}>
          <p style={{ fontSize:32, margin:'0 0 10px', lineHeight:1 }}>{emoji}</p>
          <p style={{ fontSize:22, fontWeight:800, color:'#FAF7F2', margin:'0 0 6px', letterSpacing:'-0.02em', lineHeight:1.15 }}>
            {booking.service_name}
          </p>
          {booking.scheduled_at ? (
            <p style={{ fontSize:13.5, color:'rgba(250,247,242,.7)', margin:'0 0 12px' }}>
              {fmtFull(booking.scheduled_at)}
            </p>
          ) : (
            <p style={{ fontSize:13.5, color:'rgba(250,247,242,.5)', margin:'0 0 12px' }}>
              We'll confirm your visit time shortly
            </p>
          )}
          {booking.recipient_name && (
            <p style={{ fontSize:12.5, color:'rgba(250,247,242,.55)', margin:0 }}>
              For {booking.recipient_name}
            </p>
          )}
        </div>

        {/* ── Needs details warning ── */}
        {needsDetails && (
          <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:16, padding:'14px 16px', marginBottom:12, display:'flex', alignItems:'flex-start', gap:10 }}>
            <AlertTriangle size={16} style={{ color:'#92400E', flexShrink:0, marginTop:1 }} />
            <div>
              <p style={{ fontSize:13.5, fontWeight:700, color:'#92400E', margin:'0 0 4px' }}>Action needed</p>
              <p style={{ fontSize:13, color:'#78350F', margin:'0 0 10px', lineHeight:1.5 }}>
                We need your address or WhatsApp number to confirm this booking.
              </p>
              <Link to="/dashboard/profile" style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:13, fontWeight:700, color:'#0E2A1F', textDecoration:'none' }}>
                Update profile <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* ── Pay now card ── */}
        {needsPay && !optimisticPaid && (
          <div style={{ background:'#EFF6FF', border:'1.5px solid #BFDBFE', borderRadius:16, padding:'14px 16px', marginBottom:12 }}>
            <p style={{ fontSize:13.5, fontWeight:700, color:'#1D4ED8', margin:'0 0 4px' }}>
              💳 Payment link sent to WhatsApp
            </p>
            <p style={{ fontSize:13, color:'#1E40AF', margin:'0 0 12px', lineHeight:1.5 }}>
              A secure payment link has been sent to your WhatsApp. Pay to lock in your visit.
            </p>
            <PayButton booking={booking} profile={profile} onPaid={() => { setOptimisticPaid(true); setTimeout(reload, 5000) }} />
          </div>
        )}

        {/* ── Visit confirmed ── */}
        {effectiveStatus === 'paid' && (
          <div style={{ background:'#F0FDF4', border:'1.5px solid #BBF7D0', borderRadius:16, padding:'14px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:12, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <CheckCircle size={18} color="#16A34A" />
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'#15803D', margin:'0 0 2px' }}>Visit confirmed</p>
              <p style={{ fontSize:12.5, color:'#166534', margin:0, lineHeight:1.45 }}>
                Your companion will be there. You'll get a WhatsApp message before they leave.
              </p>
            </div>
          </div>
        )}

        {/* ── Status Timeline ── */}
        {!isCancelled && (
          <DetailBlock>
            <div style={{ padding:'16px 16px 4px' }}>
              <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#AEAEAE', margin:'0 0 16px' }}>
                Visit timeline
              </p>
              <VerticalTimeline booking={{ ...booking, status: effectiveStatus }} />
            </div>
            <div style={{ height:16 }} />
          </DetailBlock>
        )}

        {/* ── Companion details ── */}
        {booking.companion_name && (
          <DetailBlock>
            <DetailRow
              icon={<UserCheck size={16} />}
              label="Your companion"
              value={booking.companion_name}
            >
              <p style={{ fontSize:12.5, color:'#6E6E73', margin:'4px 0 0', lineHeight:1.45 }}>
                Trained · Background-checked · Aadhaar-verified
              </p>
            </DetailRow>
          </DetailBlock>
        )}

        {/* ── Visit details ── */}
        <DetailBlock>
          {booking.recipient_address && (
            <DetailRow icon={<MapPin size={16} />} label="Visit address" value={booking.recipient_address} />
          )}
          {booking.notes && (
            <DetailRow icon={<FileText size={16} />} label="Special instructions" value={booking.notes} />
          )}
          {booking.requester_whatsapp && (
            <DetailRow icon={<MessageCircle size={16} />} label="Report sent to" value={booking.requester_whatsapp} />
          )}
          {amountStr && (
            <DetailRow icon={
              <span style={{ fontSize:14, fontWeight:700 }}>₹</span>
            } label="Service fee" value={`${amountStr} · ${booking.payment_status === 'paid' ? 'Paid' : 'Pending'}`} />
          )}
          <DetailRow icon={<Clock size={16} />} label="Booked on" value={fmtShort(booking.created_at)} />
        </DetailBlock>

        {/* ── Completed actions ── */}
        {isCompleted && (
          <DetailBlock>
            <div style={{ padding:'14px 16px' }}>
              <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#AEAEAE', margin:'0 0 12px' }}>
                Visit actions
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <Link
                  to="/dashboard/reports"
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, background:'#F5F0E8', borderRadius:14, padding:'13px 16px', textDecoration:'none', minHeight:48 }}
                  aria-label="View visit report"
                >
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <FileText size={16} color="#0E2A1F" />
                    <span style={{ fontSize:14, fontWeight:600, color:'#0E2A1F' }}>View visit report</span>
                  </div>
                  <ChevronRight size={14} color="#AEAEAE" />
                </Link>
              </div>
            </div>
          </DetailBlock>
        )}

        {/* ── Cancel booking ── */}
        {canCancel && !isCancelled && (
          <div style={{ marginTop:4 }}>
            <a
              href={`https://wa.me/919000221261?text=I'd%20like%20to%20cancel%20my%20booking%20(ID:%20${booking.id})`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, width:'100%', padding:'14px', background:'transparent', border:'1.5px solid #FCA5A5', color:'#DC2626', borderRadius:16, fontSize:14, fontWeight:600, textDecoration:'none', minHeight:48 }}
              aria-label="Cancel booking via WhatsApp support"
            >
              Cancel Booking
            </a>
            <p style={{ fontSize:11.5, color:'#AEAEAE', textAlign:'center', margin:'8px 0 0', lineHeight:1.5 }}>
              Tapping above opens WhatsApp to request cancellation from our team.
            </p>
          </div>
        )}

      </div>

    </div>
  )
}
