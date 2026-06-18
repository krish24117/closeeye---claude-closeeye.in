import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { format, differenceInDays, isFuture } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'
import { LiveMap } from '@/components/ui/LiveMap'
import { Skeleton } from '@/components/ui/Skeleton'
import { Calendar, Phone, MapPin, Plus, CheckCircle, Clock, AlertCircle, XCircle, ChevronRight } from 'lucide-react'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; pill: string; icon: React.ReactNode }> = {
  pending:            { label: 'Awaiting companion',  pill: 'bg-amber-100 text-amber-700',   icon: <Clock size={12} /> },
  confirmed:          { label: 'Confirmed',            pill: 'bg-blue-100 text-blue-700',     icon: <CheckCircle size={12} /> },
  companion_assigned: { label: 'Companion assigned',  pill: 'bg-purple-100 text-purple-700', icon: <CheckCircle size={12} /> },
  in_progress:        { label: 'Visit in progress',   pill: 'bg-green-600 text-white',        icon: <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" /> },
  completed:          { label: 'Completed',            pill: 'bg-green-100 text-green-700',   icon: <CheckCircle size={12} /> },
  cancelled:          { label: 'Cancelled',            pill: 'bg-red-100 text-red-600',       icon: <XCircle size={12} /> },
}

// ── Progress steps ────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'paid',     label: 'Paid' },
  { key: 'assigned', label: 'Companion ready' },
  { key: 'visit',    label: 'Visit done' },
]

function stepIndex(status: string) {
  if (status === 'in_progress')        return 2
  if (status === 'companion_assigned') return 1
  return 0
}

function ProgressTrack({ status }: { status: string }) {
  if (['completed', 'cancelled'].includes(status)) return null
  const active = stepIndex(status)
  return (
    <div className="flex items-center gap-0 mt-4">
      {STEPS.map((s, i) => {
        const done    = i < active || (status === 'in_progress' && i === 2)
        const current = i === active && status !== 'in_progress'
        const pulse   = status === 'in_progress' && i === 2
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors',
                done    ? 'bg-green-600 text-white' :
                current ? 'bg-green-100 ring-2 ring-green-400 text-green-700' :
                pulse   ? 'bg-green-600 text-white animate-pulse' :
                          'bg-gray-100 text-gray-400',
              ].join(' ')}>
                {done ? <CheckCircle size={13} /> : <span className="font-bold">{i + 1}</span>}
              </div>
              <p className={`text-xs mt-1 whitespace-nowrap ${done || current || pulse ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                {s.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full ${i < active ? 'bg-green-400' : 'bg-gray-100'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Live map ──────────────────────────────────────────────────────────────────

function ActiveVisitMap({ booking }: { booking: any }) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    let active = true
    supabase.from('companion_locations').select('lat,lng').eq('booking_id', booking.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('Failed to load companion location:', error); return }
        if (data) setLocation(data as any)
      })
    const channel = supabase.channel(`family-location-${booking.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companion_locations', filter: `booking_id=eq.${booking.id}` }, (payload) => {
        if (payload.eventType === 'DELETE') { setLocation(null); return }
        setLocation(payload.new as any)
      })
      .subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [booking.id])

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
        <MapPin size={12} /> Live companion location
      </p>
      {location ? (
        <LiveMap
          markers={[{ id: booking.companion_id, lat: location.lat, lng: location.lng, label: booking.companions?.full_name }]}
          center={{ lat: location.lat, lng: location.lng }}
          height="200px"
        />
      ) : (
        <div className="bg-gray-50 rounded-2xl flex items-center justify-center text-xs text-gray-400 text-center px-4" style={{ height: '180px' }}>
          Waiting for companion's live location…
        </div>
      )}
    </div>
  )
}

// ── Full booking card (upcoming) ──────────────────────────────────────────────

function BookingCard({ booking, onCancel, cancelling }: { booking: any; onCancel: (b: any) => void; cancelling: boolean }) {
  const cfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, pill: 'bg-gray-100 text-gray-500', icon: null }
  const canCancel = ['pending', 'confirmed'].includes(booking.status)
  const paid = ['paid', 'received'].includes(booking.payment_status)
  const daysUntil = booking.scheduled_at && isFuture(new Date(booking.scheduled_at))
    ? differenceInDays(new Date(booking.scheduled_at), new Date()) : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className={`px-4 py-2.5 flex items-center justify-between gap-2 ${
        booking.status === 'in_progress' ? 'bg-green-600' : 'bg-gray-50'
      }`}>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.pill}`}>
          {cfg.icon}{cfg.label}
        </span>
        {daysUntil !== null && (
          <span className={`text-xs font-bold ${booking.status === 'in_progress' ? 'text-white/80' : 'text-gray-400'}`}>
            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-900">{SERVICE_NAMES[booking.service_type] || booking.service_type}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {booking.scheduled_at && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={12} className="flex-shrink-0" />
                  {format(new Date(booking.scheduled_at), 'EEE, d MMM yyyy · h:mm a')}
                </p>
              )}
              {booking.loved_ones?.full_name && (
                <p className="text-xs text-gray-400">
                  For <span className="font-medium text-gray-600">{booking.loved_ones.full_name}</span>
                  {booking.loved_ones.city ? ` · ${booking.loved_ones.city}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-serif text-lg text-green-900 leading-tight">₹{(booking.amount_paise / 100).toLocaleString('en-IN')}</p>
            <span className={`text-xs font-medium ${paid ? 'text-green-600' : 'text-amber-600'}`}>
              {paid ? '✓ Paid' : 'Unpaid'}
            </span>
          </div>
        </div>
        <ProgressTrack status={booking.status} />
        {booking.companions && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-700 font-bold text-sm">{booking.companions.full_name?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-900 truncate">{booking.companions.full_name}</p>
              <p className="text-xs text-gray-400">Your companion</p>
            </div>
            {booking.companions.phone && (
              <a
                href={`tel:${booking.companions.phone}`}
                className="w-9 h-9 bg-green-50 hover:bg-green-100 rounded-xl flex items-center justify-center text-green-600 transition-colors flex-shrink-0"
              >
                <Phone size={16} />
              </a>
            )}
          </div>
        )}
        {booking.status === 'in_progress' && booking.companion_id && <ActiveVisitMap booking={booking} />}
        {canCancel && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => onCancel(booking)}
              disabled={cancelling}
              className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <XCircle size={13} /> {cancelling ? 'Cancelling…' : 'Cancel booking'}
            </button>
          </div>
        )}
        {booking.status === 'completed' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Link to="/dashboard/reports" className="text-xs font-semibold text-green-700 hover:underline">
              View visit report →
            </Link>
          </div>
        )}
        {booking.special_instructions && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 mb-1">Notes for companion</p>
            <p className="text-xs text-gray-600 leading-relaxed">{booking.special_instructions}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Compact card (past bookings) ──────────────────────────────────────────────

function CompactBookingCard({ booking, onCancel, cancelling }: { booking: any; onCancel: (b: any) => void; cancelling: boolean }) {
  const cfg  = STATUS_CONFIG[booking.status] ?? { label: booking.status, pill: 'bg-gray-100 text-gray-500', icon: null }
  const paid = ['paid', 'received'].includes(booking.payment_status)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-green-900 truncate">{SERVICE_NAMES[booking.service_type] || booking.service_type}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {booking.loved_ones?.full_name}
          {booking.scheduled_at ? ` · ${format(new Date(booking.scheduled_at), 'd MMM yyyy')}` : ''}
          {booking.companions?.full_name ? ` · ${booking.companions.full_name}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.pill}`}>
          {cfg.icon}{cfg.label}
        </span>
        {booking.amount_paise && (
          <p className="text-sm font-semibold text-green-800 whitespace-nowrap">
            ₹{(booking.amount_paise / 100).toLocaleString('en-IN')}
          </p>
        )}
        {booking.status === 'completed' && (
          <Link to="/dashboard/reports" className="text-green-600 hover:text-green-800 transition-colors" title="View report">
            <ChevronRight size={15} />
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function BookingsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <Skeleton className="h-10 rounded-xl" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <Skeleton className="h-10 rounded-none" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DashboardBookings() {
  const { showToast } = useToast()
  const [bookings, setBookings]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [tab, setTab]                   = useState<'upcoming' | 'past'>('upcoming')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, loved_ones(full_name,city), companions(full_name,phone)')
        .order('scheduled_at', { ascending: false })
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error('Failed to load bookings:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function cancelBooking(b: any) {
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return
    setCancellingId(b.id)
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', b.id)
      if (error) throw error
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: 'cancelled' } : x))
      showToast('Booking cancelled', 'success')
    } catch {
      showToast('Could not cancel booking — try again', 'error')
    } finally {
      setCancellingId(null)
    }
  }

  const upcoming = bookings.filter(b => ['pending', 'confirmed', 'companion_assigned', 'in_progress'].includes(b.status))
  const past     = bookings.filter(b => ['completed', 'cancelled'].includes(b.status))
  const shown    = tab === 'upcoming' ? upcoming : past

  if (loading) return <BookingsSkeleton />

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-green-900">Bookings</h1>
          <p className="text-gray-400 text-sm mt-0.5">{bookings.length} total · {upcoming.length} upcoming</p>
        </div>
        <Link
          to="/dashboard/new-booking"
          className="flex items-center gap-1.5 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
        >
          <Plus size={15} /> New booking
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Tabs */}
      {bookings.length > 0 && (
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
            { key: 'past',     label: 'Past',     count: past.length },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg transition-all',
                tab === t.key ? 'bg-white text-green-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.key ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty — no bookings at all */}
      {bookings.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} className="text-green-600" />
          </div>
          <p className="font-semibold text-green-900 mb-1">No bookings yet</p>
          <p className="text-sm text-gray-400 mb-6">Book your first companion visit for a loved one.</p>
          <Link
            to="/dashboard/new-booking"
            className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={15} /> Book a visit
          </Link>
        </div>
      )}

      {/* Tab empty states */}
      {bookings.length > 0 && shown.length === 0 && (
        tab === 'upcoming' ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Calendar size={20} className="text-amber-500" />
            </div>
            <p className="font-semibold text-green-900 mb-1 text-sm">No upcoming visits</p>
            <p className="text-xs text-gray-400 mb-5">Schedule a new companion visit for your loved one.</p>
            <Link
              to="/dashboard/new-booking"
              className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={15} /> Book now
            </Link>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={20} className="text-gray-400" />
            </div>
            <p className="font-semibold text-green-900 mb-1 text-sm">No past visits yet</p>
            <p className="text-xs text-gray-400">Completed and cancelled bookings will appear here.</p>
          </div>
        )
      )}

      {/* Booking list */}
      {shown.length > 0 && (
        <div className="space-y-3">
          {tab === 'upcoming'
            ? shown.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onCancel={cancelBooking}
                  cancelling={cancellingId === b.id}
                />
              ))
            : shown.map(b => (
                <CompactBookingCard
                  key={b.id}
                  booking={b}
                  onCancel={cancelBooking}
                  cancelling={cancellingId === b.id}
                />
              ))
          }
        </div>
      )}
    </div>
  )
}
