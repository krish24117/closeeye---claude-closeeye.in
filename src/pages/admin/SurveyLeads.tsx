import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

interface SurveyResponse {
  id: string
  q1_location: string | null
  q2_residence: string | null
  q3_worries: string[] | null
  q4_check_method: string | null
  q5_value_perception: string | null
  name: string
  whatsapp: string
  email: string
  parent_city: string
  source: string | null
  created_at: string
}

function fmt(dt: string) {
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function ValueBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-300">—</span>
  const hot = value.includes("Very valuable") || value.includes("want this")
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
      hot ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
    }`}>
      {hot ? '🔥 ' : ''}{value}
    </span>
  )
}

function ExpandedRow({ r }: { r: SurveyResponse }) {
  return (
    <div className="bg-green-50 border-t border-green-100 px-4 sm:px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Q1 — Has elderly family in India?</p>
        <p className="text-gray-800">{r.q1_location || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Q2 — Where they live</p>
        <p className="text-gray-800">{r.q2_residence || '—'}</p>
      </div>
      <div className="sm:col-span-2">
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Q3 — Worries (multi-select)</p>
        {r.q3_worries && r.q3_worries.length > 0
          ? <div className="flex flex-wrap gap-1.5 mt-1">
              {r.q3_worries.map(w => (
                <span key={w} className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-gray-700">{w}</span>
              ))}
            </div>
          : <p className="text-gray-400">—</p>
        }
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Q4 — How they check in</p>
        <p className="text-gray-800">{r.q4_check_method || '—'}</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Q5 — Value of companion visit</p>
        <ValueBadge value={r.q5_value_perception} />
      </div>
    </div>
  )
}

export function AdminSurveyLeads() {
  const [leads, setLeads] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('survey_responses')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) { setError('Failed to load leads. Try again.'); setLoading(false); return }
    setLeads(data || [])
    setLoading(false)
  }

  const filtered = leads
    .filter(l => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        l.name.toLowerCase().includes(q) ||
        l.whatsapp.includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.parent_city.toLowerCase().includes(q) ||
        (l.source || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortDir === 'desc' ? diff : -diff
    })

  function toggleExpand(id: string) {
    setExpanded(prev => (prev === id ? null : id))
  }

  const hotLeads = leads.filter(l => l.q5_value_perception?.includes('Very valuable')).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-green-900">Survey Leads</h1>
          <p className="text-gray-400 text-sm mt-1">
            {leads.length} total · {hotLeads} hot leads 🔥
          </p>
        </div>
        <a
          href="/survey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-200 rounded-xl px-3 py-2 hover:bg-green-50 transition-colors"
        >
          <ExternalLink size={13} /> View survey
        </a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, city, source…"
          className="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
        />
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border-2 border-gray-200 rounded-xl px-3 py-2 hover:border-green-400 transition-colors"
        >
          {sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-green-50 rounded-2xl">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-semibold text-green-900 mb-1">{leads.length === 0 ? 'No leads yet' : 'No results'}</p>
          <p className="text-sm text-gray-400">
            {leads.length === 0
              ? 'Share the survey link to start collecting responses.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[1fr_130px_120px_100px_80px_130px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Name / Contact</span>
            <span>Parent's city</span>
            <span>Source</span>
            <span>Hot?</span>
            <span>Lives</span>
            <span>Date</span>
          </div>

          {filtered.map(r => (
            <div key={r.id} className="border-b border-gray-100 last:border-0">
              {/* Row */}
              <button
                onClick={() => toggleExpand(r.id)}
                className="w-full text-left px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                {/* Mobile layout */}
                <div className="sm:hidden space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-green-900 text-sm">{r.name}</p>
                    <div className="flex items-center gap-1 text-gray-400">
                      {expanded === r.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{r.whatsapp} · {r.email}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-green-700 bg-green-50 rounded-lg px-2 py-0.5">{r.parent_city}</span>
                    {r.source && <span className="text-xs text-gray-400">via {r.source}</span>}
                    <span className="text-xs text-gray-400">{fmt(r.created_at)}</span>
                  </div>
                  {r.q5_value_perception?.includes('Very valuable') && (
                    <span className="text-xs text-green-700 font-semibold">🔥 Hot lead</span>
                  )}
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-[1fr_130px_120px_100px_80px_130px] gap-3 items-center">
                  <div className="min-w-0">
                    <p className="font-semibold text-green-900 text-sm truncate">{r.name}</p>
                    <p className="text-xs text-gray-400 truncate">{r.whatsapp}</p>
                    <p className="text-xs text-gray-400 truncate">{r.email}</p>
                  </div>
                  <span className="text-sm text-gray-700 truncate">{r.parent_city}</span>
                  <span className="text-xs text-gray-500 truncate">{r.source || '—'}</span>
                  <ValueBadge value={r.q5_value_perception} />
                  <span className="text-xs text-gray-500 truncate">{r.q2_residence ? r.q2_residence.replace('Outside India (NRI)', 'NRI') : '—'}</span>
                  <div className="text-right flex items-center justify-end gap-1">
                    <span className="text-xs text-gray-400">{fmt(r.created_at)}</span>
                    {expanded === r.id ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                  </div>
                </div>
              </button>

              {/* Expanded survey answers */}
              {expanded === r.id && <ExpandedRow r={r} />}
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filtered.length} of {leads.length} leads
        </p>
      )}
    </div>
  )
}
