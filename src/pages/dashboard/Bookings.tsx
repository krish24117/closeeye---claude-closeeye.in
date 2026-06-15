// src/pages/dashboard/Bookings.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { STATUS_COLORS, SERVICE_NAMES } from '@/lib/booking-labels'
import { LiveMap } from '@/components/ui/LiveMap'

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
    <div className="mt-3 pt-3 border-t border-gray-50">
      <p className="text-xs font-semibold text-green-900 mb-2">📍 Live location</p>
      {location ? (
        <LiveMap
          markers={[{ id: booking.companion_id, lat: location.lat, lng: location.lng, label: booking.companions?.full_name }]}
          center={{ lat: location.lat, lng: location.lng }}
          height="220px"
        />
      ) : (
        <div className="bg-gray-100 rounded-2xl flex items-center justify-center text-sm text-gray-400 text-center px-4" style={{ height: '220px' }}>
          Waiting for companion's live location...
        </div>
      )}
    </div>
  )
}

export function DashboardBookings() {
  const { showToast } = useToast()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('bookings')
        .select('*, loved_ones(full_name,city), companions(full_name,phone)')
        .order('created_at',{ascending:false})
      if (error) throw error
      setBookings(data||[])
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
    } catch (err) {
      console.error('Failed to cancel booking:', err)
      showToast('Could not cancel booking — try again', 'error')
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading bookings...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-green-900">Bookings</h1>
        <a href="/waitlist" className="bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">+ New booking</a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-green-900 mb-1">No bookings yet</p>
          <p className="text-sm text-gray-400 mb-5">Book your first companion visit</p>
          <a href="/services" className="bg-green-800 text-white text-sm font-semibold px-6 py-2.5 rounded-xl">View Services</a>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b=>(
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-card transition-shadow">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-green-900 text-sm">{SERVICE_NAMES[b.service_type] || b.service_type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.loved_ones?.full_name} · {b.loved_ones?.city}</p>
                  {b.scheduled_at && <p className="text-xs text-gray-400">{format(new Date(b.scheduled_at),'dd MMM yyyy, h:mm a')}</p>}
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status]||'bg-gray-100 text-gray-500'}`}>
                    {b.status.replace('_',' ')}
                  </span>
                  <p className="text-sm font-semibold text-green-800 mt-2">₹{(b.amount_paise/100).toLocaleString('en-IN')}</p>
                  <p className={`text-xs mt-0.5 ${b.payment_status==='paid'?'text-green-600':'text-orange-500'}`}>{b.payment_status}</p>
                </div>
              </div>
              {b.companions && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">{b.companions.full_name?.[0]}</div>
                  <p className="text-xs text-gray-500">Companion: {b.companions.full_name} · {b.companions.phone}</p>
                </div>
              )}
              {b.status === 'in_progress' && b.companion_id && (
                <ActiveVisitMap booking={b} />
              )}
              {(b.status === 'pending' || b.status === 'confirmed') && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <button
                    onClick={()=>cancelBooking(b)}
                    disabled={cancellingId === b.id}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                  >
                    {cancellingId === b.id ? 'Cancelling...' : 'Cancel booking'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
