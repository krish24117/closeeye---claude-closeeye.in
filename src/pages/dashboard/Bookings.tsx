import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { Calendar, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { loadRazorpayScript } from '@/lib/razorpay'
import { formatIsoTime } from '@/lib/formatTime'

// ── Type ───────────────────────────────────────────────────────────────────────

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

// ── Service emoji map ──────────────────────────────────────────────────────────

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
  pending_confirmation: { label: 'Pending',      cls: 'ce-mc-badge-amber'  },
  requested:            { label: 'Received',      cls: 'ce-mc-badge-amber'  },
  needs_details:        { label: 'Needs details', cls: 'ce-mc-badge-orange' },
  confirmed:            { label: 'Confirmed',     cls: 'ce-mc-badge-blue'   },
  companion_confirmed:  { label: 'Pay now',       cls: 'ce-mc-badge-blue'   },
  paid:                 { label: 'Confirmed ✓',   cls: 'ce-mc-badge-green'  },
  completed:            { label: 'Completed',     cls: 'ce-mc-badge-teal'   },
  cancelled:            { label: 'Cancelled',     cls: 'ce-mc-badge-gray'   },
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
  return (
    new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
    }) + ' · ' + time
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

  async function handlePay(e?: React.MouseEvent) {
    e?.preventDefault()
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
        prefill: {
          name: profile?.full_name || '',
          contact: booking.requester_whatsapp || profile?.whatsapp_number || '',
        },
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
      <button
        onClick={handlePay}
        disabled={loading}
        className="ce-mc-hero-cta"
        style={{ background: '#A8D5B5', color: '#0E2A1F', border: 'none' }}
      >
        {loading ? <Loader2 size={12} className="ce-spin" /> : null}
        {loading ? 'Opening…' : `Pay ${amountStr}`}
      </button>
    )
  }

  return (
    <button onClick={() => handlePay()} disabled={loading} className="ce-bk-pay-btn">
      {loading ? 'Opening payment…' : `Pay ${amountStr} to confirm →`}
    </button>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="ce-bk-skel-bar" style={{ height: 140, borderRadius: 20 }} />
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{ background: '#fff', border: '1px solid #F0EBE1', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72 }}
        >
          <div className="ce-bk-skel-bar" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="ce-bk-skel-bar" style={{ height: 14, width: '55%', borderRadius: 6 }} />
            <div className="ce-bk-skel-bar" style={{ height: 11, width: '38%', borderRadius: 6 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <div className="ce-bk-skel-bar" style={{ height: 14, width: 52, borderRadius: 6 }} />
            <div className="ce-bk-skel-bar" style={{ height: 18, width: 70, borderRadius: 100 }} />
          </div>
        </div>
      ))}
    </div>
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
  const effectiveStatus = optimisticPaid ? 'paid' : booking.status
  const b = getBadge(effectiveStatus)
  const emoji = SERVICE_EMOJI[booking.service_id] || '🏥'
  const needsPay = effectiveStatus === 'companion_confirmed' && !optimisticPaid
  const timeStr = booking.scheduled_at ? formatIsoTime(booking.scheduled_at) : 'Time TBC'
  const hasCompanion = Boolean(booking.companion_name)

  return (
    <div className="ce-mc-hero ce-mc-fadein" role="region" aria-label={`Today's visit: ${booking.service_name}`}>
      <div className="ce-mc-hero-body">
        <p className="ce-mc-hero-svc">{emoji} {booking.service_name}</p>
        <p className="ce-mc-hero-meta">
          {timeStr}
          {booking.recipient_name ? ` · For ${booking.recipient_name}` : ''}
        </p>

        {/* Companion row */}
        <div className="ce-mc-hero-comp">
          {hasCompanion ? (
            <>
              <div className="ce-mc-hero-comp-av" aria-hidden="true">
                {booking.companion_name!.charAt(0).toUpperCase()}
              </div>
              <span className="ce-mc-hero-comp-name">
                {booking.companion_name} · Your companion
              </span>
            </>
          ) : (
            <>
              <span className="ce-mc-find-pulse" aria-hidden="true" />
              <span className="ce-mc-hero-comp-name" style={{ color: 'rgba(250,247,242,.6)' }}>
                Finding your companion — usually within a few hours
              </span>
            </>
          )}
        </div>
      </div>

      <div className="ce-mc-hero-footer">
        <span className={`ce-mc-badge ${b.cls}`}>{b.label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {needsPay && (
            <PayButton booking={booking} profile={profile} onPaid={onPaid} compact />
          )}
          <button
            className="ce-mc-hero-cta"
            onClick={() => navigate(`/dashboard/bookings/${booking.id}`)}
            aria-label={`View details for ${booking.service_name}`}
          >
            View details <ChevronRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Compact card ───────────────────────────────────────────────────────────────

function CompactCard({ booking, optimisticPaid }: { booking: BookingRequest; optimisticPaid: boolean }) {
  const effectiveStatus = optimisticPaid ? 'paid' : booking.status
  const b = getBadge(effectiveStatus)
  const emoji = SERVICE_EMOJI[booking.service_id] || '🏥'
  const amountStr = booking.amount_paise
    ? `₹${Math.round(booking.amount_paise / 100).toLocaleString('en-IN')}`
    : null
  const isCompleted = effectiveStatus === 'completed'
  const when = fmtCompact(booking.scheduled_at)

  return (
    <Link
      to={`/dashboard/bookings/${booking.id}`}
      className="ce-mc-card"
      aria-label={`${booking.service_name}, ${b.label}`}
    >
      <div className="ce-mc-icon" aria-hidden="true">{emoji}</div>
      <div className="ce-mc-card-body">
        <p className="ce-mc-card-name">{booking.service_name}</p>
        <p className="ce-mc-card-when">
          {isCompleted ? 'Tap to view report' : when}
        </p>
      </div>
      <div className="ce-mc-card-right">
        {amountStr && <span className="ce-mc-card-price">{amountStr}</span>}
        <span className={`ce-mc-badge ${b.cls}`}>{b.label}</span>
      </div>
      <ChevronRight size={16} className="ce-mc-chevron" aria-hidden="true" />
    </Link>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="ce-bk-empty ce-mc-fadein">
      <div className="ce-bk-empty-icon">
        <Calendar size={26} color="#16A34A" />
      </div>
      <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--forest)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
        Your first visit is just ahead
      </p>
      <p style={{ fontSize: 14, color: '#9CA3AF', margin: '0 0 24px', lineHeight: 1.55, maxWidth: 260 }}>
        Know your parent is safe and cared for. Book a companion visit today.
      </p>
      <Link
        to="/dashboard/book"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--forest)', color: '#FAF7F2', borderRadius: 100, padding: '13px 26px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
        aria-label="Book your first care service"
      >
        <Plus size={14} aria-hidden="true" /> Book a visit
      </Link>
    </div>
  )
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <p className="ce-mc-sec" style={{ marginTop: first ? 0 : undefined }}>
      {children}
    </p>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function DashboardBookings() {
  const { user, profile } = useAuth()
  const [bookings, setBookings]             = useState<BookingRequest[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [optimisticPaid, setOptimisticPaid] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!user) return
    const phone10 = profile?.whatsapp_number?.replace(/\D/g, '').slice(-10) ?? ''
    const orFilter = phone10
      ? `user_id.eq.${user.id},requester_whatsapp.ilike.%${phone10}`
      : `user_id.eq.${user.id}`

    const { data, error: err } = await supabase
      .from('booking_requests')
      .select('id,service_id,service_name,amount_paise,scheduled_at,recipient_name,recipient_address,requester_whatsapp,notes,status,payment_status,companion_name,confirmed_at,paid_at,razorpay_order_id,created_at')
      .or(orFilter)
      .order('created_at', { ascending: false })

    if (err) { setError('Could not load bookings — please try again.'); setLoading(false); return }
    setBookings(data || [])
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
    setTimeout(load, 5000)
  }

  // ── Section splits ──────────────────────────────────────────────────────────
  const today = todayIst()

  // Today: scheduled for today, not cancelled
  const todayRaw = bookings.filter(b =>
    istDate(b.scheduled_at) === today && b.status !== 'cancelled',
  )
  // Sort by time ascending so the nearest visit is first (→ hero)
  const todayAll = [...todayRaw].sort((a, b) => {
    if (!a.scheduled_at && !b.scheduled_at) return 0
    if (!a.scheduled_at) return 1
    if (!b.scheduled_at) return -1
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  })
  const [heroBooking, ...compactTodayRest] = todayAll

  // Upcoming: not today, not cancelled/completed, and either unscheduled or future
  const upcoming = bookings.filter(b => {
    if (['cancelled', 'completed'].includes(b.status)) return false
    const d = istDate(b.scheduled_at)
    if (d === today) return false   // already in Today section
    return !d || d > today
  })

  // Past: completed or cancelled
  const past = bookings.filter(b => ['completed', 'cancelled'].includes(b.status))

  // ── Completed vs Cancelled split for Past ──────────────────────────────────
  const completed = past.filter(b => b.status === 'completed')
  const cancelled  = past.filter(b => b.status === 'cancelled')

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '0 16px 80px' }}>
        <div style={{ paddingTop: 8, marginBottom: 24 }}>
          <div className="ce-bk-skel-bar" style={{ height: 32, width: 110, borderRadius: 10 }} />
          <div className="ce-bk-skel-bar" style={{ height: 14, width: 160, borderRadius: 8, marginTop: 8 }} />
        </div>
        <Skeleton />
      </div>
    )
  }

  return (
    <div
      style={{ padding: '0 16px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      className="ce-slide-up"
    >
      {/* ── Page header ── */}
      <div style={{ paddingTop: 8, marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.03em', margin: '0 0 2px' }}>
          My Care
        </h1>
        <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>
          Your family's care journey
        </p>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 14, color: '#DC2626' }}>
          {error}
          <button
            onClick={load}
            style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', flexShrink: 0 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {bookings.length === 0 && <EmptyState />}

      {/* ── TODAY'S VISIT(S) ── */}
      {todayAll.length > 0 && (
        <section aria-label="Today's visits">
          <SectionLabel first>
            {todayAll.length === 1 ? "Today's visit" : `Today's visits (${todayAll.length})`}
          </SectionLabel>

          {/* Expanded hero: nearest visit */}
          <TodayHeroCard
            booking={heroBooking}
            profile={profile}
            optimisticPaid={optimisticPaid.has(heroBooking.id)}
            onPaid={handlePaid}
          />

          {/* Remaining today visits as compact cards */}
          {compactTodayRest.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {compactTodayRest.map(b => (
                <CompactCard key={b.id} booking={b} optimisticPaid={optimisticPaid.has(b.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── UPCOMING VISITS ── */}
      {upcoming.length > 0 && (
        <section aria-label="Upcoming visits">
          <SectionLabel>Upcoming</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((b, i) => (
              <div key={b.id} className="ce-mc-fadein" style={{ animationDelay: `${i * 55}ms` }}>
                <CompactCard booking={b} optimisticPaid={optimisticPaid.has(b.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── PAST VISITS (completed) ── */}
      {completed.length > 0 && (
        <section aria-label="Past visits">
          <SectionLabel>Past visits</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.map((b, i) => (
              <div key={b.id} className="ce-mc-fadein" style={{ animationDelay: `${i * 55}ms` }}>
                <CompactCard booking={b} optimisticPaid={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CANCELLED ── */}
      {cancelled.length > 0 && (
        <section aria-label="Cancelled bookings">
          <SectionLabel>Cancelled</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cancelled.map((b, i) => (
              <div key={b.id} className="ce-mc-fadein" style={{ animationDelay: `${i * 55}ms` }}>
                <CompactCard booking={b} optimisticPaid={false} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
