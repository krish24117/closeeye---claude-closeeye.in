import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import { STATUS_COLORS, SERVICE_NAMES } from '@/lib/booking-labels'

export function CompanionSchedule() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('bookings')
        .select('*, loved_ones(full_name,city,address)')
        .eq('companion_id', user.id)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error('Failed to load schedule:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading your schedule...</div>

  const groups: Record<string, any[]> = {}
  for (const b of bookings) {
    const key = b.scheduled_at ? format(new Date(b.scheduled_at), 'EEEE, dd MMM yyyy') : 'Unscheduled'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-serif text-2xl text-green-900">Schedule</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">🗓️</p>
          <p className="font-semibold text-green-900">No visits scheduled yet</p>
          <p className="text-sm text-gray-400 mt-1">Your visits will appear here once assigned</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{date}</p>
              <div className="space-y-3">
                {items.map(b => (
                  <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex justify-between items-start flex-wrap gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-green-900">{b.loved_ones?.full_name}</p>
                        <p className="text-xs text-gray-400">{b.loved_ones?.city} · {b.loved_ones?.address}</p>
                        {b.scheduled_at && <p className="text-xs text-green-600 font-medium mt-1">{format(new Date(b.scheduled_at), 'h:mm a')}</p>}
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-500'}`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 inline-block">{SERVICE_NAMES[b.service_type] || b.service_type}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
