import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Skeleton'
import { format } from 'date-fns'
import { SERVICE_NAMES } from '@/lib/booking-labels'

export function AdminReports() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  useEffect(() => { load() }, [])

  useEffect(() => {
    const photoPaths = Array.from(new Set(reports.flatMap(r => (r.photo_urls || []) as string[])))
    const videoPaths = Array.from(new Set(reports.flatMap(r => (r.video_urls || []) as string[])))
    if (photoPaths.length === 0 && videoPaths.length === 0) return

    async function resolve() {
      const map: Record<string, string> = {}
      if (photoPaths.length > 0) {
        const { data, error } = await supabase.storage.from('visit-photos').createSignedUrls(photoPaths, 3600)
        if (error) console.error('Failed to load photo URLs:', error)
        data?.forEach(d => { if (d.signedUrl && d.path) map[`visit-photos:${d.path}`] = d.signedUrl })
      }
      if (videoPaths.length > 0) {
        const { data, error } = await supabase.storage.from('visit-videos').createSignedUrls(videoPaths, 3600)
        if (error) console.error('Failed to load video URLs:', error)
        data?.forEach(d => { if (d.signedUrl && d.path) map[`visit-videos:${d.path}`] = d.signedUrl })
      }
      setSignedUrls(prev => ({ ...prev, ...map }))
    }
    resolve()
  }, [reports])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('visit_reports')
        .select('*, loved_ones(full_name), companions(full_name), bookings(service_type, scheduled_at)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setReports(data || [])
    } catch (err) {
      console.error('Failed to load reports:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Visit Reports</h1>
        <p className="text-gray-400 text-sm mt-1">All visit reports submitted by companions.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-green-900">No reports yet</p>
          <p className="text-sm text-gray-400 mt-1">Reports appear here after each visit is completed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
              <div className="flex justify-between items-start flex-wrap gap-3 mb-4">
                <div>
                  <p className="font-semibold text-green-900">{r.loved_ones?.full_name}</p>
                  <p className="text-xs text-gray-400">by {r.companions?.full_name} · {format(new Date(r.created_at), 'dd MMM yyyy')}</p>
                  {r.bookings?.service_type && (
                    <p className="text-xs text-gray-400">{SERVICE_NAMES[r.bookings.service_type] || r.bookings.service_type}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {[['😊', r.mood_score, 'Mood'], ['💊', r.health_score, 'Health'], ['🏠', r.home_safety_score, 'Safety']].map(([e, s, l]) => s && (
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
                <p className={`text-xs font-medium px-2.5 py-1 rounded-full inline-block ${r.medication_taken ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Medication {r.medication_taken ? 'taken ✓' : 'not taken ✗'}
                </p>
              )}
              {r.photo_urls?.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.photo_urls.map((path: string, i: number) => {
                    const url = signedUrls[`visit-photos:${path}`]
                    return url
                      ? <img key={i} src={url} alt="Visit photo" className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                      : <div key={i} className="w-16 h-16 rounded-lg bg-gray-100 animate-pulse" />
                  })}
                </div>
              )}
              {r.video_urls?.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.video_urls.map((path: string, i: number) => {
                    const url = signedUrls[`visit-videos:${path}`]
                    return url
                      ? <video key={i} src={url} controls className="w-32 h-20 object-cover rounded-lg border border-gray-100 bg-black" />
                      : <div key={i} className="w-32 h-20 rounded-lg bg-gray-100 animate-pulse" />
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
