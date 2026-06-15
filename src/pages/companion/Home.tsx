// src/pages/companion/Home.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import { MapPin, Stethoscope, Building2, Phone } from 'lucide-react'
import { STATUS_COLORS, SERVICE_NAMES } from '@/lib/booking-labels'

export function CompanionHome() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)

  useEffect(()=>{ load() },[user])

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: bookingsError } = await supabase.from('bookings')
        .select('*, loved_ones(full_name,city,address,medical_notes,doctor_name,nearest_hospital,emergency_contact_name,emergency_contact_phone), visit_reports(id)')
        .eq('companion_id',user.id)
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

  async function startVisit(b: any) {
    setStartingId(b.id)
    try {
      const { error } = await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', b.id)
      if (error) throw error
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: 'in_progress' } : x))
      showToast('Visit started — your location is now shared with the family', 'success')
      window.dispatchEvent(new Event('closeeye:active-booking-changed'))
    } catch (err) {
      console.error('Failed to start visit:', err)
      showToast('Could not start visit — try again', 'error')
    } finally {
      setStartingId(null)
    }
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
                  <p className="text-xs text-gray-400">{b.loved_ones?.city}</p>
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

              {/* Visit prep */}
              {(b.loved_ones?.address || b.loved_ones?.doctor_name || b.loved_ones?.nearest_hospital || b.loved_ones?.emergency_contact_name) && (
                <div className="mb-3 pb-3 border-b border-gray-50 space-y-1.5">
                  <p className="text-xs font-semibold text-green-900">Visit prep</p>
                  {b.loved_ones?.address && (
                    <p className="text-xs text-gray-500 flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 flex-shrink-0 text-gray-400" /> {b.loved_ones.address}</p>
                  )}
                  {b.loved_ones?.doctor_name && (
                    <p className="text-xs text-gray-500 flex items-start gap-1.5"><Stethoscope size={12} className="mt-0.5 flex-shrink-0 text-gray-400" /> Dr. {b.loved_ones.doctor_name}</p>
                  )}
                  {b.loved_ones?.nearest_hospital && (
                    <p className="text-xs text-gray-500 flex items-start gap-1.5"><Building2 size={12} className="mt-0.5 flex-shrink-0 text-gray-400" /> {b.loved_ones.nearest_hospital}</p>
                  )}
                  {b.loved_ones?.emergency_contact_name && (
                    <p className="text-xs text-gray-500 flex items-start gap-1.5">
                      <Phone size={12} className="mt-0.5 flex-shrink-0 text-gray-400" />
                      {b.loved_ones.emergency_contact_name}{b.loved_ones?.emergency_contact_phone ? ` · ${b.loved_ones.emergency_contact_phone}` : ''}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {b.status === 'companion_assigned' && (
                  <button
                    onClick={()=>startVisit(b)}
                    disabled={startingId===b.id}
                    className="block w-full text-center bg-green-800 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {startingId===b.id ? 'Starting visit...' : 'Start Visit'}
                  </button>
                )}
                {b.status === 'in_progress' && (
                  <p className="text-center text-xs font-semibold text-orange-600 bg-orange-50 rounded-xl py-2">📍 Sharing live location with the family</p>
                )}
                {b.visit_reports?.length === 0 && b.status !== 'companion_assigned' && b.status !== 'completed' && (
                  <Link to={`/companion/visit/${b.id}`} className="block text-center bg-green-800 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition-colors">
                    Submit Visit Report
                  </Link>
                )}
                {b.visit_reports?.length > 0 && (
                  <p className="text-center text-sm text-green-600 font-medium">✓ Report submitted</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
