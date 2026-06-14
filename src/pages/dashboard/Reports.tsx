// src/pages/dashboard/Reports.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

export function DashboardReports() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    supabase.from('visit_reports')
      .select('*, loved_ones(full_name), companions(full_name), bookings(service_type)')
      .order('created_at',{ascending:false})
      .then(({data})=>{ setReports(data||[]); setLoading(false) })
  },[])

  if (loading) return <div className="text-center py-20 text-gray-400">Loading reports...</div>

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-serif text-2xl text-green-900">Visit Reports</h1>
      {reports.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-green-900">No reports yet</p>
          <p className="text-sm text-gray-400 mt-1">Reports appear here after each visit is completed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r=>(
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
                <div>
                  <p className="font-semibold text-green-900">{r.loved_ones?.full_name}</p>
                  <p className="text-xs text-gray-400">by {r.companions?.full_name} · {format(new Date(r.report_submitted_at),'dd MMM yyyy')}</p>
                </div>
                <div className="flex gap-2">
                  {[['😊',r.mood_score,'Mood'],['💊',r.health_score,'Health'],['🏠',r.home_safety_score,'Safety']].map(([e,s,l])=>s&&(
                    <div key={l as string} className="text-center">
                      <p className="text-lg">{e}</p>
                      <p className="text-xs font-bold text-green-700">{s}/5</p>
                      <p className="text-xs text-gray-400">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
              {r.family_message && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-xl mb-3">
                  <p className="text-sm text-green-800 italic">"{r.family_message}"</p>
                </div>
              )}
              {r.medication_taken !== null && (
                <p className={`text-xs font-medium px-2.5 py-1 rounded-full inline-block ${r.medication_taken?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                  Medication {r.medication_taken?'taken ✓':'not taken ✗'}
                </p>
              )}
              {r.photo_urls?.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.photo_urls.map((url: string, i: number)=>(
                    <img key={i} src={url} alt="Visit photo" className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
