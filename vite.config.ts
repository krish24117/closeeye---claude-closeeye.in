// src/pages/dashboard/Bookings.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const STATUS_COLORS: Record<string,string> = {
  pending:'bg-yellow-100 text-yellow-700',
  confirmed:'bg-blue-100 text-blue-700',
  companion_assigned:'bg-purple-100 text-purple-700',
  in_progress:'bg-orange-100 text-orange-700',
  completed:'bg-green-100 text-green-700',
  cancelled:'bg-red-100 text-red-700',
}

const SERVICE_NAMES: Record<string,string> = {
  companion_visit_single:'Companion Visit',
  hospital_companion_single:'Hospital Companion',
  emergency_visit:'Emergency Visit',
  care_plan_4_monthly:'Monthly Plan (4 visits)',
  care_plan_8_monthly:'Monthly Plan (8 visits)',
  care_plan_quarterly:'Quarterly Plan',
}

export function DashboardBookings() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    supabase.from('bookings')
      .select('*, loved_ones(full_name,city), companions(full_name,phone)')
      .order('created_at',{ascending:false})
      .then(({data})=>{ setBookings(data||[]); setLoading(false) })
  },[])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading bookings...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-green-900">Bookings</h1>
        <a href="/waitlist" className="bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">+ New booking</a>
      </div>

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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
