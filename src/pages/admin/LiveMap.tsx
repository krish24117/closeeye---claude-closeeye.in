import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { LiveMap, LiveMapMarker } from '@/components/ui/LiveMap'

export function AdminLiveMap() {
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load(true) }, [])

  useEffect(() => {
    const channel = supabase.channel('admin-companion-locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companion_locations' }, () => {
        load(false)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function load(showLoading: boolean) {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('companion_locations')
        .select('companion_id,booking_id,lat,lng,updated_at,companions(full_name),bookings(status,checked_out_at,loved_ones(full_name))')
      if (error) throw error
      const active = (data || []).filter((l: any) => l.bookings?.status === 'in_progress' && !l.bookings?.checked_out_at)
      setLocations(active)
    } catch (err) {
      console.error('Failed to load live locations:', err)
      setError('Something went wrong — please try again.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const markers: LiveMapMarker[] = locations.map(l => ({
    id: l.companion_id,
    lat: l.lat,
    lng: l.lng,
    label: l.companions?.full_name,
  }))

  if (loading) return <div className="text-center py-20 text-gray-400">Loading live map...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Live Map</h1>
        <p className="text-gray-400 text-sm mt-1">Companions currently on an active visit.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={() => load(true)} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      <LiveMap markers={markers} height="400px" />

      {locations.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="font-semibold text-green-900">No active visits</p>
          <p className="text-sm text-gray-400 mt-1">Companion locations will appear here while a visit is in progress.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map(l => (
            <div key={l.companion_id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-green-900 text-sm">{l.companions?.full_name}</p>
                <p className="text-xs text-gray-400">Visiting {l.bookings?.loved_ones?.full_name}</p>
              </div>
              <p className="text-xs text-gray-400">Updated {formatDistanceToNow(new Date(l.updated_at), { addSuffix: true })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
