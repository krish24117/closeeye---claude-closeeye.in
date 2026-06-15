import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'

export function CompanionEarnings() {
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
        .select('id,completed_at,amount_paise,companion_payout_paise,loved_ones(full_name),service_type')
        .eq('companion_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error('Failed to load earnings:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading your earnings...</div>

  const totalPaise = bookings.reduce((sum, b) => sum + (b.companion_payout_paise || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-serif text-2xl text-green-900">Earnings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          <p className="text-xs text-gray-400 mb-1">Total Earnings</p>
          <p className="font-serif text-2xl sm:text-3xl text-green-900">₹{(totalPaise / 100).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
          <p className="text-xs text-gray-400 mb-1">Completed Visits</p>
          <p className="font-serif text-2xl sm:text-3xl text-green-900">{bookings.length}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">💰</p>
          <p className="font-semibold text-green-900">No completed visits yet</p>
          <p className="text-sm text-gray-400 mt-1">Your earnings will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-green-900 text-sm">{b.loved_ones?.full_name}</p>
                <p className="text-xs text-gray-400">{SERVICE_NAMES[b.service_type] || b.service_type}</p>
                {b.completed_at && <p className="text-xs text-gray-400 mt-0.5">{format(new Date(b.completed_at), 'dd MMM yyyy')}</p>}
              </div>
              {b.companion_payout_paise != null ? (
                <p className="font-semibold text-green-800">₹{(b.companion_payout_paise / 100).toLocaleString('en-IN')}</p>
              ) : (
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Pending</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
