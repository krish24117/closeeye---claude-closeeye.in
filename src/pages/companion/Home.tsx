// src/pages/companion/Home.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'

export function CompanionHome() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(()=>{ load() },[user])

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data: comp, error: compError } = await supabase.from('companions').select('id').eq('user_id',user.id).single()
      if (compError) throw compError
      if (!comp) { setLoading(false); return }
      const { data, error: bookingsError } = await supabase.from('bookings')
        .select('*, loved_ones(full_name,city,address,medical_notes,doctor_name,nearest_hospital,emergency_contact_name,emergency_contact_phone), visit_reports(id)')
        .eq('companion_id',comp.id)
        .in('status',['companion_assigned','in_progress','completed'])
        .order('scheduled_at',{ascending:true})
      if (bookingsError) throw bookingsError
      setBookings(data||[])
    } catch (err) {
      console.error('Failed to load visits:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const STATUS_COLORS: Record<string,string> = {
    companion_assigned:'bg-blue-100 text-blue-700',
    in_progress:'bg-orange-100 text-orange-700',
    completed:'bg-green-100 text-green-700',
  }
  const SERVICE_NAMES: Record<string,string> = {
    companion_visit_single:'Companion Visit',
    hospital_companion_single:'Hospital Companion',
    emergency_visit:'Emergency Visit',
    care_plan_4_monthly:'Monthly Plan',
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading your visits...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-serif text-2xl text-green-900">My Visits</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}
      {bookings.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-green-900">No visits assigned yet</p>
          <p className="text-sm text-gray-400 mt-1">Your upcoming visits will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b=>(
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
                <div>
                  <p className="font-semibold text-green-900">{b.loved_ones?.full_name}</p>
                  <p className="text-xs text-gray-400">{b.loved_ones?.city} · {b.loved_ones?.address}</p>
                  {b.scheduled_at && <p className="text-xs text-green-600 font-medium mt-1">{format(new Date(b.scheduled_at),'EEEE, dd MMM · h:mm a')}</p>}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[b.status]||'bg-gray-100 text-gray-500'}`}>
                  {b.status.replace('_',' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 mb-3">{SERVICE_NAMES[b.service_type]||b.service_type}</p>
              {b.loved_ones?.medical_notes && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 mb-3">⚕️ {b.loved_ones.medical_notes}</p>
              )}
              {b.visit_reports?.length === 0 && b.status !== 'completed' && (
                <Link to={`/companion/visit/${b.id}`} className="block text-center bg-green-800 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition-colors">
                  Submit Visit Report
                </Link>
              )}
              {b.visit_reports?.length > 0 && (
                <p className="text-center text-sm text-green-600 font-medium">✓ Report submitted</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
