import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ChevronDown, AlertTriangle, CalendarHeart, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Helpers ────────────────────────────────────────────────────────────────

const FLAG_EMOJI: Record<string, string> = { none: '✅', monitor: '🟡', urgent: '🔴' }
const FLAG_LABEL: Record<string, string> = { none: 'All good', monitor: 'Monitoring', urgent: 'Needs attention' }

const SNAPSHOT: { key: string; label: string; good: string; bad: string }[] = [
  { key: 'mood',      label: 'Mood',      good: 'Good',         bad: 'Low' },
  { key: 'eating',    label: 'Eating',    good: 'Well',         bad: 'Concern' },
  { key: 'medicines', label: 'Medicines', good: 'Taken',        bad: 'Missed' },
  { key: 'home',      label: 'Home',      good: 'Safe & clean', bad: 'Check needed' },
]

function durationLabel(start?: string | null, end?: string | null): string {
  if (!start || !end) return '—'
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins < 0) return '—'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Visit card ─────────────────────────────────────────────────────────────

function VisitCard({ v, companionName }: { v: any; companionName: string }) {
  const [open, setOpen] = useState(false)
  const t1   = v.checklist_data?.tier1
  const when = v.end_time || v.created_at
  const flag = v.flags || 'none'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left px-4 py-3.5 flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">{FLAG_EMOJI[flag] || '✅'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-green-900 text-sm">{format(new Date(when), 'EEEE, dd MMM yyyy')}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            by {companionName} · {durationLabel(v.start_time, v.end_time)} · {FLAG_LABEL[flag]}
          </p>
        </div>
        <ChevronDown size={15} className={`text-gray-300 flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-50 px-4 py-4 space-y-4">
          {/* Health snapshot */}
          {t1 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Health snapshot</p>
              <div className="grid grid-cols-2 gap-2">
                {SNAPSHOT.map(s => {
                  const val = t1[s.key]
                  return (
                    <div key={s.key} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <span>{val === true ? '✅' : val === false ? '❌' : '—'}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-400 leading-none">{s.label}</p>
                        <p className="text-xs font-semibold text-green-900 mt-0.5">{val === true ? s.good : val === false ? s.bad : '—'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* One moment */}
          {v.one_moment && (
            <div className="bg-green-50 border-l-4 border-green-500 px-3 py-2.5 rounded-r-xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-green-700 mb-1">A moment from the visit</p>
              <p className="text-sm text-green-800 italic">"{v.one_moment}"</p>
            </div>
          )}

          {/* Flag notes */}
          {flag !== 'none' && v.flag_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1">
                <AlertTriangle size={11} /> Flagged for your attention
              </p>
              <p className="text-sm text-amber-800">{v.flag_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function DashboardReports() {
  const [visits, setVisits]               = useState<any[]>([])
  const [companionNames, setCompanionNames] = useState<Record<string, string>>({})
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('visits')
        .select('*, bookings(loved_ones(full_name)), elder_profiles(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = data || []
      setVisits(rows)

      // Resolve companion names (visits.companion_id → companions table)
      const ids = Array.from(new Set(rows.map(r => r.companion_id).filter(Boolean)))
      if (ids.length) {
        const { data: comps } = await supabase.from('companions').select('id, full_name').in('id', ids)
        const map: Record<string, string> = {}
        comps?.forEach(c => { map[c.id] = c.full_name })
        setCompanionNames(map)
      }
    } catch (err) {
      console.error('Failed to load reports:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div><Skeleton className="h-7 w-32 mb-1" /><Skeleton className="h-4 w-48" /></div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
    </div>
  )

  const lastVisit = visits[0]
  const lastWhen  = lastVisit ? (lastVisit.end_time || lastVisit.created_at) : null

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-green-900">Reports</h1>
        <p className="text-gray-400 text-sm mt-0.5">Visit reports from your loved one's Close Eye visits.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {visits.length === 0 ? (
        <div className="text-center py-16 bg-green-50 rounded-2xl">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100">
            <CalendarHeart size={22} className="text-green-600" />
          </div>
          <p className="font-semibold text-green-900">Your first visit is being scheduled</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">We'll notify you on WhatsApp the moment your loved one's first visit is complete.</p>
        </div>
      ) : (
        <>
          {/* Streak + last visit */}
          <div className="bg-gradient-to-br from-green-900 to-green-700 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={15} className="text-green-300" />
              <p className="text-xs font-bold uppercase tracking-widest text-green-300">Close Eye care</p>
            </div>
            <p className="font-serif text-2xl leading-tight">
              Visited {visits.length} time{visits.length === 1 ? '' : 's'} by Close Eye
            </p>
            {lastWhen && (
              <p className="text-green-200 text-sm mt-1.5">
                Last visit: <span className="font-semibold text-white">{format(new Date(lastWhen), 'EEEE, dd MMM yyyy')}</span>
              </p>
            )}
          </div>

          {/* Visit list */}
          <div className="space-y-2">
            {visits.map(v => (
              <VisitCard key={v.id} v={v} companionName={companionNames[v.companion_id] || 'Your companion'} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
