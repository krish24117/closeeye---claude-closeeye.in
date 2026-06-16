import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Clock, ArrowRight, ChevronRight, AlertCircle } from 'lucide-react'
import { format, isToday, isFuture, differenceInMinutes } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { SERVICE_NAMES } from '@/lib/booking-labels'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeUntilLabel(scheduledAt: string): string {
  const mins = differenceInMinutes(new Date(scheduledAt), new Date())
  if (mins < 0) return 'Past scheduled time'
  if (mins === 0) return 'Now'
  if (mins < 60) return `in ${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`
}

function durationSince(iso: string): string {
  const mins = differenceInMinutes(new Date(), new Date(iso))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CompanionHome() {
  const { user, profile } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, loved_ones(full_name,city,address,medical_notes,emergency_contact_name,emergency_contact_phone), visit_reports(id)')
        .eq('companion_id', user.id)
        .in('status', ['companion_assigned', 'in_progress'])
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error('Failed to load visits:', err)
      setError('Could not load visits — please try again.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel(`companion-home-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `companion_id=eq.${user.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, load])

  const activeVisit   = bookings.find(b => b.status === 'in_progress')
  const todayVisits   = bookings.filter(b =>
    b.status === 'companion_assigned' &&
    b.scheduled_at &&
    isToday(new Date(b.scheduled_at))
  )
  const futureVisits  = bookings.filter(b =>
    b.status === 'companion_assigned' &&
    b.scheduled_at &&
    !isToday(new Date(b.scheduled_at)) &&
    isFuture(new Date(b.scheduled_at))
  )

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayTotal = (activeVisit ? 1 : 0) + todayVisits.length

  if (loading) return <HomeSkeleton />

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-green-900">{greeting}, {firstName} 👋</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {format(new Date(), 'EEEE, d MMMM')} ·{' '}
          {todayTotal === 0 ? 'No visits today' : `${todayTotal} visit${todayTotal > 1 ? 's' : ''} today`}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><AlertCircle size={15} /> {error}</span>
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Active visit — always show first, most prominent */}
      {activeVisit && <ActiveVisitCard b={activeVisit} />}

      {/* Today's visits */}
      {todayVisits.length > 0 && (
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Today</p>
          <div className="space-y-3">
            {todayVisits.map(b => <VisitCard key={b.id} b={b} showCountdown />)}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {futureVisits.length > 0 && (
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Upcoming</p>
          <div className="space-y-3">
            {futureVisits.map(b => <VisitCard key={b.id} b={b} showCountdown={false} />)}
          </div>
        </section>
      )}

      {/* Empty */}
      {!activeVisit && todayVisits.length === 0 && futureVisits.length === 0 && (
        <div className="text-center py-16 bg-green-50 rounded-2xl">
          <p className="text-5xl mb-4">🌿</p>
          <p className="font-semibold text-green-900 text-lg mb-1">You're all caught up</p>
          <p className="text-sm text-gray-400">No visits scheduled. New bookings will appear here automatically.</p>
        </div>
      )}
    </div>
  )
}

// ─── Active visit card ────────────────────────────────────────────────────────

function ActiveVisitCard({ b }: { b: any }) {
  const lo = b.loved_ones
  return (
    <div className="bg-gradient-to-br from-green-900 to-green-700 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse flex-shrink-0" />
        <p className="text-xs font-bold text-green-200 uppercase tracking-widest">Active Visit</p>
      </div>

      <div className="mb-4">
        <p className="font-serif text-2xl leading-tight mb-1">{lo?.full_name}</p>
        <p className="text-green-200 text-sm">
          {[lo?.city, lo?.address].filter(Boolean).join(' · ')}
        </p>
      </div>

      {b.checked_in_at && (
        <div className="bg-white/10 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <Clock size={14} className="text-green-200 flex-shrink-0" />
          <p className="text-green-100 text-sm">
            Checked in {format(new Date(b.checked_in_at), 'h:mm a')}
            <span className="text-green-300 ml-2">· {durationSince(b.checked_in_at)} in progress</span>
          </p>
        </div>
      )}

      <Link
        to={`/companion/visit/${b.id}`}
        className="inline-flex items-center gap-2 bg-white text-green-900 font-bold text-sm px-5 py-3 rounded-xl hover:bg-green-50 transition-colors"
      >
        Continue Visit <ArrowRight size={15} />
      </Link>
    </div>
  )
}

// ─── Individual visit card ────────────────────────────────────────────────────

function VisitCard({ b, showCountdown }: { b: any; showCountdown: boolean }) {
  const lo = b.loved_ones
  const hasReport = (b.visit_reports?.length ?? 0) > 0
  const isPast    = b.scheduled_at && !isFuture(new Date(b.scheduled_at))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Top row */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-900">{lo?.full_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{lo?.city}</p>
        </div>
        {b.scheduled_at && (
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-green-700">{format(new Date(b.scheduled_at), 'h:mm a')}</p>
            {showCountdown ? (
              <p className={`text-xs mt-0.5 font-medium ${isPast ? 'text-red-500' : 'text-gray-400'}`}>
                {timeUntilLabel(b.scheduled_at)}
              </p>
            ) : (
              <p className="text-xs mt-0.5 text-gray-400">{format(new Date(b.scheduled_at), 'EEE, d MMM')}</p>
            )}
          </div>
        )}
      </div>

      {/* Chips */}
      <div className="px-5 pb-3 flex flex-wrap gap-2">
        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
          {SERVICE_NAMES[b.service_type] || b.service_type}
        </span>
        {lo?.medical_notes && (
          <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100">
            ⚕️ Medical notes
          </span>
        )}
      </div>

      {/* Prep info */}
      {(lo?.address || lo?.emergency_contact_name) && (
        <div className="mx-5 mb-3 bg-gray-50 rounded-xl p-3 space-y-2">
          {lo?.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(lo.address)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 text-xs text-gray-500 hover:text-green-700 transition-colors group"
            >
              <MapPin size={12} className="mt-0.5 flex-shrink-0 group-hover:text-green-600 transition-colors" />
              <span className="group-hover:underline">{lo.address}</span>
            </a>
          )}
          {lo?.emergency_contact_name && (
            <a
              href={lo?.emergency_contact_phone ? `tel:${lo.emergency_contact_phone}` : undefined}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-green-700 transition-colors"
            >
              <Phone size={12} className="flex-shrink-0 text-gray-400" />
              <span>
                {lo.emergency_contact_name}
                {lo.emergency_contact_phone && (
                  <span className="text-gray-400 ml-1">· {lo.emergency_contact_phone}</span>
                )}
              </span>
            </a>
          )}
        </div>
      )}

      {/* Medical notes */}
      {lo?.medical_notes && (
        <div className="mx-5 mb-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs font-bold text-amber-800 mb-1">Medical Notes</p>
          <p className="text-xs text-amber-700 leading-relaxed">{lo.medical_notes}</p>
        </div>
      )}

      {/* CTA */}
      <div className="px-5 pb-5 pt-1">
        <Link
          to={`/companion/visit/${b.id}`}
          className={`flex items-center justify-center gap-2 w-full font-semibold text-sm py-3 rounded-xl transition-colors ${
            hasReport
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-green-800 text-white hover:bg-green-700'
          }`}
        >
          {hasReport
            ? '✓ Report submitted'
            : b.status === 'in_progress'
              ? 'Continue Visit'
              : 'Start Visit'}
          {!hasReport && <ChevronRight size={15} />}
        </Link>
      </div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="h-7 bg-gray-200 rounded-lg w-52 mb-2" />
        <div className="h-4 bg-gray-100 rounded-lg w-36" />
      </div>
      {[1, 2].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
            <div className="space-y-2 items-end flex flex-col">
              <div className="h-4 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-100 rounded w-12" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-6 bg-gray-100 rounded-full w-28" />
          </div>
          <div className="h-10 bg-gray-200 rounded-xl" />
        </div>
      ))}
    </div>
  )
}
