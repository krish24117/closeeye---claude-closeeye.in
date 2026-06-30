import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { LiveMap, LiveMapMarker } from '@/components/ui/LiveMap'
import { Skeleton, EmptyState, ErrorBox, Avatar } from './_shared'

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

  if (loading) return <Skeleton h={400} />

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="adm-page-h">Live Map</h1>
        <p className="adm-page-sub" style={{ marginTop: 4 }}>Companions currently on an active visit.</p>
      </div>

      {error && (
        <ErrorBox onRetry={() => load(true)} />
      )}

      <LiveMap markers={markers} height="400px" />

      {locations.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <EmptyState title="No active visits" sub="Companion locations will appear here while a visit is in progress." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {locations.map(l => (
            <div key={l.companion_id} className="adm-card adm-card-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={l.companions?.full_name} size={28} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--forest)', fontSize: 13, margin: 0 }}>{l.companions?.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>Visiting {l.bookings?.loved_ones?.full_name}</p>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>Updated {formatDistanceToNow(new Date(l.updated_at), { addSuffix: true })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
