import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import {
  Calendar, CheckCircle, Clock, AlertCircle, XCircle,
  ChevronRight, Plus, Car, UserCheck, AlertTriangle, Loader2,
} from 'lucide-react'
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

// ── Status badge config ────────────────────────────────────────────────────────

const BADGE_MAP: Record<string, { label: string; cls: string }> = {
  pending_confirmation: { label: 'Pending',        cls: 'ce-mc-badge-amber'  },
  requested:            { label: 'Received',        cls: 'ce-mc-badge-amber'  },
  needs_details:        { label: 'Needs details',   cls: 'ce-mc-badge-orange' },
  confirmed:            { label: 'Confirmed',       cls: 'ce-mc-badge-blue'   },
  companion_confirmed:  { label: 'Pay now',         cls: 'ce-mc-badge-blue'   },
  paid:                 { label: 'Confirmed ✓',     cls: 'ce-mc-badge-green'  },
  completed:            { label: 'Completed',       cls: 'ce-mc-badge-teal'   },
  cancelled:            { label: 'Cancelled',       cls: 'ce-mc-badge-gray'   },
}

function getBadge(status: string) {
  return BADGE_MAP[status] ?? { label: status.replace(/_/g, ' '), cls: 'ce-mc-badge-gray' }
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function istDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
function todayIst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
function tomorrowIst(): string {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}
function fmtCompact(iso: string | null): string {
  if (!iso) return 'Pending schedule'
  const d = istDate(iso)
  const time = formatIsoTime(iso)
  if (d === todayIst()) return `Today · ${time}`
  if (d === tomorrowIst()) return `Tomorrow · ${time}`
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
  }) + ' · ' + time
}

// ── Active visit timeline (old booking system) ─────────────────────────────────

const TIMELINE_STEPS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'confirmed',          label: 'Confirmed',   icon: <CheckCircle size={12} /> },
  { key: 'companion_assigned', label: 'Assigned',    icon: <UserCheck size={12} />   },
  { key: 'on_the_way',         label: 'On the way',  icon: <Car size={12} />         },
  { key: 'in_progress',        label: 'In progress', icon: <Clock size={12} />       },
  { key: 'completed',          label: 'Done',        icon: <CheckCircle size={12} /> },
]
const STATUS_ORDER = ['confirmed','companion_assigned','on_the_way','in_progress','completed']

function visitStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending', confirmed: 'Confirmed', companion_assigned: 'Companion assigned',
    on_the_way: 'On the way', in_progress: 'Visit in progress',
    completed: 'Visit complete', delayed: 'Delayed', rescheduled: 'Rescheduled', cancelled: 'Cancelled',
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
        marginBottom: 12,
      }}
    >
      <div className="ce-bk-track-hdr">
        <div>
          <p className="ce-bk-track-name">{visit.loved_ones?.full_name || 'Visit'}</p>
          {visit.companions?.full_name && (
            <p className="ce-bk-track-time">👤 {visit.companions.full_name}{timeStr ? ` · ${timeStr}` : ''}</p>
          )}
          {!visit.companions?.full_name && timeStr && (
            <p className="ce-bk-track-time">{timeStr}</p>
          )}
        </div>
        <span className="ce-bk-track-badge" style={badgeStyle}>{visitStatusLabel(visit.status)}</span>
      </div>
      {isException && (
        <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'8px 12px', marginBottom:14, display:'flex', alignItems:'flex-start', gap:8, fontSize:13, color:'#78350F' }}>
          <AlertTriangle size={14} style={{ flexShrink:0, marginTop:1 }} />
          <span>
            {visit.status === 'delayed' && 'Your visit has been delayed.'}
            {visit.status === 'rescheduled' && `Visit rescheduled${scheduledAt ? ` to ${new Date(scheduledAt).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Kolkata'})} at ${formatIsoTime(scheduledAt)}` : ''}.`}
            {visit.status === 'cancelled' && 'This visit has been cancelled.'}
            {latestNote?.note && ` ${latestNote.note}`}
          </span>
        </div>
      )}
      {!isException && visit.status !== 'cancelled' && (
        <div className="ce-bk-steps">
          {TIMELINE_STEPS.map((step, i) => {
            const stepIdx = STATUS_ORDER.indexOf(step.key)
            const isDone = currentIdx > stepIdx || visit.status === 'completed'
            const isActive = visit.status === step.key || (visit.status === 'delayed' && stepIdx === currentIdx)
            const dotClass = isDone ? 'done' : isActive ? 'active' : 'future'
            return (
              <div key={step.key} style={{ display:'flex', alignItems:'flex-start', flex: i < TIMELINE_STEPS.length - 1 ? 1 : undefined, position:'relative' }}>
                <div className="ce-bk-step">
                  <div className={`ce-bk-dot ${dotClass}`}>{step.icon}</div>
                  <p className={`ce-bk-dot-lbl ${dotClass}`}>{step.label}</p>
                </div>
                {i < TIMELINE_STEPS.length - 1 && <div className={`ce-bk-connector ${isDone ? 'done' : 'future'}`} />}
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
  compact,
}: {
  booking: BookingRequest
  profile: { full_name?: string | null; whatsapp_number?: string | null } | null
  onPaid: (id: string) => void
  compact?: boolean
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
        handler: () => { showToast('Payment received — confirming your visit…', 'success'); onPaid(booking.id) },
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

  if (compact) {
    return (
      <button onClick={(e) => { e.preventDefault(); handlePay() }} disabled={loading}
        className="ce-mc-hero-cta" style={{ background: '#A8D5B5', color: '#0E2A1F' }}>
        {loading ? <Loader2 size={13} className="ce-spin" /> : null}
        {loading ? 'Opening…' : `Pay ${amountStr}`}
      </button>
    )
  }

  return (
    <button onClick={handlePay} disabled={loading} className="ce-bk-pay-btn">
      {loading ? 'Opening payment…' : `Pay ${amountStr} to confirm →`}
    </button>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function BookingsSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background:'#fff', border:'1px solid #F0EBE1', borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, minHeight:72 }}>
          <div className="ce-bk-skel-bar" style={{ width:40, height:40, borderRadius:12, flexShrink:0 }} />
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
            <div className="ce-bk-skel-bar" style={{ height:14, width:'55%', borderRadius:6 }} />
            <div className="ce-bk-skel-bar" style={{ height:11, width:'38%', borderRadius:6 }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
            <div className="ce-bk-skel-bar" style={{ height:14, width:52, borderRadius:6 }} />
            <div className="ce-bk-skel-bar" style={{ height:18, width:70, borderRadius:100 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Compact booking card ────────────────────────────────────────────────────────

function CompactCard({ booking, optimisticPaid }: { booking: BookingRequest; optimisticPaid: boolean }) {
  const status = optimisticPaid ? 'paid' : booking.status
  const b = getBadge(status)
  const emoji = SERVICE_EMOJI[booking.service_id] || '🏥'
  const amountStr = booking.amount_paise
    ? `₹${Math.round(booking.amount_paise / 100).toLocaleString('en-IN')}`
    : null
  const isCompleted = status === 'completed'
  const when = fmtCompact(booking.scheduled_at)

  return (
    <Link
      to={`/dashboard/bookings/${booking.id}`}
      className="ce-mc-card"
      aria-label={`${booking.service_name} — ${b.label}`}
    >
      <div className="ce-mc-icon" aria-hidden="true">{emoji}</div>
      <div className="ce-mc-card-body">
        <p className="ce-mc-card-name">{booking.service_name}</p>
        <p className="ce-mc-card-when">{isCompleted ? 'Completed · tap for report' : when}</p>
      </div>
      <div className="ce-mc-card-right">
        {amountStr && <span className="ce-mc-card-price">{amountStr}</span>}
        <span className={`ce-mc-badge ${b.cls}`}>{b.label}</span>
      </div>
      <ChevronRight size={16} className="ce-mc-chevron" aria-hidden="true" />
    </Link>
  )
}

// ── Today hero card ────────────────────────────────────────────────────────────

function TodayHeroCard({
  booking, profile, optimisticPaid, onPaid,
}: {
  booking: BookingRequest
  profile: { full_name?: string | null; whatsapp_number?: string | null } | null
  optimisticPaid: boolean
  onPaid: (id: string) => void
}) {
  const navigate = useNavigate()
  const status = optimisticPaid ? 'paid' : booking.status
  const b = getBadge(status)
  const emoji = SERVICE_EMOJI[booking.service_id] || '🏥'
  const needsPay = status === 'companion_confirmed' && !optimisticPaid
  const timeStr = booking.scheduled_at ? formatIsoTime(booking.scheduled_at) : 'Time TBC'

  return (
    <div className="ce-mc-hero ce-mc-fadein" aria-label={`Today's visit: ${booking.service_name}`}>
      <div className="ce-mc-hero-body">
        <p className="ce-mc-hero-label">Today's visit</p>
        <p className="ce-mc-hero-svc">{emoji} {booking.service_name}</p>
        <p className="ce-mc-hero-meta">
          {timeStr}{booking.recipient_name ? ` · For ${booking.recipient_name}` : ''}
        </p>
        {booking.companion_name && (
          <div className="ce-mc-hero-comp">
            <div className="ce-mc-hero-comp-av" aria-hidden="true">
              {booking.companion_name.charAt(0).toUpperCase()}
            </div>
            <span className="ce-mc-hero-comp-name">{booking.companion_name} · Your companion</span>
          </div>
        )}
        {!booking.companion_name && status !== 'cancelled' && (
          <div className="ce-mc-hero-comp">
            <div className="ce-mc-hero-comp-av" aria-hidden="true">⏳</div>
            <span className="ce-mc-hero-comp-name">Companion being assigned…</span>
          </div>
        )}
      </div>
      <div className="ce-mc-hero-footer">
        <span className={`ce-mc-badge ${b.cls}`}>{b.label}</span>
        <div style={{ display:'flex', gap:8 }}>
          {needsPay && (
            <PayButton booking={booking} profile={profile} onPaid={onPaid} compact />
          )}
          <button
            className="ce-mc-hero-cta"
            onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
            aria-label={`View details for ${booking.service_name}`}
          >
            View details <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="ce-bk-empty ce-mc-fadein">
      <div className="ce-bk-empty-icon">
        <Calendar size={26} color="#16A34A" />
      </div>
      <p style={{ fontWeight:700, fontSize:18, color:'var(--forest)', margin:'0 0 8px', letterSpacing:'-0.01em' }}>
        No bookings yet
      </p>
      <p style={{ fontSize:14, color:'#9CA3AF', margin:'0 0 24px', lineHeight:1.55, maxWidth:260 }}>
        Book a companion visit for your loved one — we'll send a WhatsApp report after every visit.
      </p>
      <Link
        to="/dashboard/book"
        style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--forest)', color:'#FAF7F2', borderRadius:100, padding:'13px 26px', fontSize:14, fontWeight:700, textDecoration:'none' }}
        aria-label="Book your first care service"
      >
        <Plus size={14} aria-hidden="true" /> Book a visit
      </Link>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function DashboardBookings() {
  const { user, profile } = useAuth()
  const [bookings, setBookings]             = useState<BookingRequest[]>([])
  const [activeVisits, setActiveVisits]     = useState<ActiveVisit[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [optimisticPaid, setOptimisticPaid] = useState<Set<string>>(new Set())

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
  }, [user, profile?.whatsapp_number])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  function handlePaid(id: string) {
    setOptimisticPaid(prev => new Set(prev).add(id))
    setTimeout(() => load(), 5000)
  }

  // Section splits
  const today = todayIst()
  const todayBookings = bookings.filter(b =>
    istDate(b.scheduled_at) === today && b.status !== 'cancelled',
  )
  const upcoming = bookings.filter(b => {
    if (['cancelled','completed'].includes(b.status)) return false
    const d = istDate(b.scheduled_at)
    return !d || d > today
  })
  const past = bookings.filter(b => ['cancelled','completed'].includes(b.status))

  // ── Loading ──
  if (loading) return (
    <div style={{ padding:'0 16px 80px' }}>
      <div style={{ paddingTop:8, marginBottom:24 }}>
        <div className="ce-bk-skel-bar" style={{ height:32, width:100, borderRadius:10 }} />
      </div>
      <BookingsSkeleton />
    </div>
  )

  return (
    <div style={{ padding:'0 16px', paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }} className="ce-slide-up">

      {/* ── Header ── */}
      <div style={{ paddingTop:8, marginBottom:24 }}>
        <h1 style={{ fontSize:28, fontWeight:800, color:'#1D1D1F', letterSpacing:'-0.03em', margin:'0 0 2px' }}>
          My Care
        </h1>
        <p style={{ fontSize:13, color:'#6E6E73', margin:0 }}>Your companion visits</p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:14, padding:'12px 16px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, fontSize:14, color:'#DC2626' }}>
          {error}
          <button onClick={load} style={{ fontWeight:700, textDecoration:'underline', background:'none', border:'none', color:'#DC2626', cursor:'pointer', flexShrink:0 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Today's Visit (active visits from old system) ── */}
      {activeVisits.length > 0 && (
        <section aria-label="Today's visit">
          <p className="ce-mc-sec" style={{ marginTop:0 }}>Today's visit</p>
          {activeVisits.map(v => <StatusTimeline key={v.id} visit={v} />)}
        </section>
      )}

      {/* ── Today's Visit (booking_requests system) ── */}
      {todayBookings.length > 0 && (
        <section aria-label="Today's visit">
          {!activeVisits.length && <p className="ce-mc-sec" style={{ marginTop:0 }}>Today's visit</p>}
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:8 }}>
            {todayBookings.map(b => (
              <TodayHeroCard
                key={b.id}
                booking={b}
                profile={profile}
                optimisticPaid={optimisticPaid.has(b.id)}
                onPaid={handlePaid}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {bookings.length === 0 && activeVisits.length === 0 && <EmptyState />}

      {/* ── Upcoming visits ── */}
      {upcoming.length > 0 && (
        <section aria-label="Upcoming visits">
          <p className="ce-mc-sec">Upcoming</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {upcoming.map((b, i) => (
              <div key={b.id} className="ce-mc-fadein" style={{ animationDelay:`${i * 60}ms` }}>
                <CompactCard booking={b} optimisticPaid={optimisticPaid.has(b.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Past visits ── */}
      {past.length > 0 && (
        <section aria-label="Past visits">
          <p className="ce-mc-sec">Past visits</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {past.map((b, i) => (
              <div key={b.id} className="ce-mc-fadein" style={{ animationDelay:`${i * 60}ms` }}>
                <CompactCard booking={b} optimisticPaid={false} />
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
