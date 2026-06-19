import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { format } from 'date-fns'
import { ChevronDown, AlertTriangle, MessageSquare, Download } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Helpers ────────────────────────────────────────────────────────────────

const FLAG_EMOJI: Record<string, string> = { none: '✅', monitor: '🟡', urgent: '🔴' }
const FLAG_LABEL: Record<string, string> = { none: 'All good', monitor: 'Monitoring', urgent: 'Urgent' }

function durationLabel(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—'
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 0) return '—'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// Tier-1 yes/no booleans → readable ✅ / ❌ rows
const T1_LABELS: Record<string, [string, string, string]> = {
  // key: [label, goodWhenTrue?'good':'bad', ...]  — handled inline below
  mood:      ['Mood & spirits', 'Good', 'Low'],
  eating:    ['Eating & hydration', 'Well', 'Concern'],
  medicines: ['Medicines', 'Taken', 'Missed'],
  home:      ['Home', 'Safe & clean', 'Check needed'],
}

function prettyKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Checklist detail renderer ──────────────────────────────────────────────

function ChecklistDetail({ data }: { data: any }) {
  const t1 = data?.tier1
  const t2 = data?.tier2
  const t3 = data?.tier3
  if (!t1 && !t2 && !t3) return <p className="text-sm text-gray-400">No checklist data recorded.</p>

  return (
    <div className="space-y-3">
      {t1 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Health snapshot</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(T1_LABELS).map(([key, [label, good, bad]]) => {
              const v = t1[key]
              return (
                <div key={key} className="flex items-center gap-1.5 text-sm">
                  <span>{v === true ? '✅' : v === false ? '❌' : '—'}</span>
                  <span className="text-gray-600">{label}:</span>
                  <span className="font-medium text-green-900">{v === true ? good : v === false ? bad : '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {t2 && Object.keys(t2).length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Expanded detail</p>
          <div className="space-y-1">
            {Object.entries(t2).filter(([, v]) => v !== undefined && v !== '' && v !== false).map(([k, v]) => (
              <div key={k} className="text-sm text-gray-600">
                <span className="font-medium text-green-900">{prettyKey(k)}:</span>{' '}
                {typeof v === 'boolean' ? 'Yes' : String(v)}
              </div>
            ))}
          </div>
        </div>
      )}

      {t3 && Object.keys(t3).filter(k => k !== '_photos').length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Monthly deep check</p>
          <div className="space-y-1">
            {Object.entries(t3).filter(([k, v]) => k !== '_photos' && v !== undefined && v !== '' && v !== null).map(([k, v]) => (
              <div key={k} className="text-sm text-gray-600">
                <span className="font-medium text-green-900">{prettyKey(k)}:</span>{' '}
                {typeof v === 'boolean' ? 'Yes' : String(v)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Visit row ──────────────────────────────────────────────────────────────

function VisitRow({ v, photoUrls, pdfUrl }: { v: any; photoUrls: Record<string, string>; pdfUrl?: string }) {
  const [open, setOpen] = useState(false)
  const elderName = v.elder_profiles?.name || v.bookings?.loved_ones?.full_name || 'Elder'
  const when      = v.end_time || v.created_at
  const flag      = v.flags || 'none'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left px-4 py-3 flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">{FLAG_EMOJI[flag] || '✅'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-900 text-sm">{elderName}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {format(new Date(when), 'dd MMM yyyy')} · {durationLabel(v.start_time, v.end_time)} · {FLAG_LABEL[flag]}
          </p>
          {v.one_moment && <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">"{v.one_moment}"</p>}
        </div>
        <ChevronDown size={15} className={`text-gray-300 flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-50 px-4 py-4 space-y-4">
          <ChecklistDetail data={v.checklist_data} />

          {v.one_moment && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">One moment</p>
              <p className="text-sm text-gray-700 italic">"{v.one_moment}"</p>
            </div>
          )}

          {v.flag_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1">
                <AlertTriangle size={11} /> Flag notes
              </p>
              <p className="text-sm text-amber-800">{v.flag_notes}</p>
            </div>
          )}

          {v.short_visit_reason && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700 mb-1">Short visit reason</p>
              <p className="text-sm text-orange-800">{v.short_visit_reason}</p>
            </div>
          )}

          {/* Photos */}
          {v.photo_urls?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Photos</p>
              <div className="flex gap-2 flex-wrap">
                {v.photo_urls.map((path: string, i: number) => (
                  photoUrls[path]
                    ? <img key={i} src={photoUrls[path]} alt="Visit photo" className="w-16 h-16 object-cover rounded-xl border border-gray-100" />
                    : <div key={i} className="w-16 h-16 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp report */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1">
              <MessageSquare size={11} /> WhatsApp report sent
            </p>
            {v.report_text ? (
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-3">{v.report_text}</pre>
            ) : (
              <p className="text-sm text-gray-400">Report text was not recorded for this visit.</p>
            )}
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                <Download size={12} /> Download PDF
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function CompanionVisits() {
  const { user } = useAuth()
  const [visits, setVisits]       = useState<any[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [pdfUrls, setPdfUrls]     = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => { load() }, [user]) // eslint-disable-line

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('visits')
        .select('*, elder_profiles(name), bookings(service_type, loved_ones(full_name))')
        .eq('companion_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setVisits(data || [])
    } catch (err) {
      console.error('Failed to load visit history:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Resolve signed URLs for all photos across all visits
  useEffect(() => {
    const paths = Array.from(new Set(visits.flatMap(v => (v.photo_urls || []) as string[])))
    if (paths.length === 0) return
    supabase.storage.from('visit-photos').createSignedUrls(paths, 3600).then(({ data }) => {
      const map: Record<string, string> = {}
      data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
      setPhotoUrls(map)
    })
  }, [visits])

  // Resolve signed URLs for the generated PDFs
  useEffect(() => {
    const paths = visits.map(v => v.pdf_path).filter(Boolean) as string[]
    if (paths.length === 0) return
    supabase.storage.from('visit-pdfs').createSignedUrls(paths, 3600).then(({ data }) => {
      const map: Record<string, string> = {}
      data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
      setPdfUrls(map)
    })
  }, [visits])

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Visit History</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {loading ? 'Loading…' : `${visits.length} completed visit${visits.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-44" />
              </div>
            </div>
          ))}
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-green-900">No visits yet</p>
          <p className="text-sm text-gray-400 mt-1">Your completed visits and reports will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visits.map(v => <VisitRow key={v.id} v={v} photoUrls={photoUrls} pdfUrl={v.pdf_path ? pdfUrls[v.pdf_path] : undefined} />)}
        </div>
      )}
    </div>
  )
}
