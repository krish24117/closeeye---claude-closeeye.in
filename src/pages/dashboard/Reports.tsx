import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/Skeleton'

function ReportsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      {[1, 2].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex gap-3">
              {[1, 2, 3].map(j => <Skeleton key={j} className="w-10 h-12 rounded-xl" />)}
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function DashboardReports() {
  const [reports, setReports]         = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [signedUrls, setSignedUrls]   = useState<Record<string, string>>({})

  useEffect(() => { load() }, [])

  useEffect(() => {
    const paths = Array.from(new Set(reports.flatMap(r => (r.photo_urls || []) as string[])))
    if (paths.length === 0) return
    supabase.storage.from('visit-photos').createSignedUrls(paths, 3600).then(({ data, error }) => {
      if (error) { console.error('Failed to load photo URLs:', error); return }
      const map: Record<string, string> = {}
      data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
      setSignedUrls(map)
    })
  }, [reports])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('visit_reports')
        .select('*, loved_ones(full_name), companions(full_name), bookings(service_type)')
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

  if (loading) return <ReportsSkeleton />

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-green-900">Visit Reports</h1>
        <p className="text-gray-400 text-sm mt-0.5">{reports.length} report{reports.length === 1 ? '' : 's'} from your family's visits.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-16 bg-green-50 rounded-2xl">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100">
            <FileText size={22} className="text-green-600" />
          </div>
          <p className="font-semibold text-green-900">No reports yet</p>
          <p className="text-sm text-gray-400 mt-1">Reports appear here after each visit is completed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">

              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-green-900">{r.loved_ones?.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    by {r.companions?.full_name} · {format(new Date(r.created_at), 'dd MMM yyyy')}
                  </p>
                </div>
                {/* Score chips */}
                <div className="flex gap-2 flex-shrink-0">
                  {([['😊', r.mood_score, 'Mood'], ['💊', r.health_score, 'Health'], ['🏠', r.home_safety_score, 'Safety']] as [string, number | null, string][])
                    .filter(([, s]) => s != null)
                    .map(([e, s, l]) => (
                      <div key={l} className="text-center bg-gray-50 rounded-xl px-2 py-1.5">
                        <p className="text-base leading-none">{e}</p>
                        <p className="text-xs font-bold text-green-700 mt-0.5">{s}/5</p>
                        <p className="text-[10px] text-gray-400">{l}</p>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Family message */}
              {r.family_message && (
                <div className="bg-green-50 border-l-4 border-green-500 px-3 py-2.5 rounded-r-xl mb-3">
                  <p className="text-sm text-green-800 italic">"{r.family_message}"</p>
                </div>
              )}

              {/* Medication + PDF row */}
              <div className="flex items-center gap-2 flex-wrap">
                {r.medication_taken !== null && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.medication_taken ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    Medication {r.medication_taken ? 'taken ✓' : 'not taken ✗'}
                  </span>
                )}
                {r.pdf_url && (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={12} /> Download PDF
                  </a>
                )}
              </div>

              {/* Photos */}
              {r.photo_urls?.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.photo_urls.map((path: string, i: number) => (
                    signedUrls[path]
                      ? <img key={i} src={signedUrls[path]} alt="Visit photo" className="w-16 h-16 object-cover rounded-xl border border-gray-100" />
                      : <div key={i} className="w-16 h-16 rounded-xl bg-gray-100 animate-pulse" />
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
