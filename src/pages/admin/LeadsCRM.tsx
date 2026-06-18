import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type LeadType = 'waitlist' | 'survey' | 'consultation'
type LeadStatus = 'new' | 'contacted' | 'interested' | 'converted' | 'not_interested'

interface Lead {
  id: string
  type: LeadType
  name: string
  whatsapp: string
  email: string
  parent_city: string
  source: string
  country: string
  extra: string       // urgency (waitlist) | q5 value (survey) | best_time (consult)
  status: LeadStatus
  admin_notes: string
  created_at: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new',            label: 'New',           color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted',      label: 'Contacted',     color: 'bg-yellow-100 text-yellow-800' },
  { value: 'interested',     label: 'Interested',    color: 'bg-purple-100 text-purple-800' },
  { value: 'converted',      label: 'Converted',     color: 'bg-green-100 text-green-800' },
  { value: 'not_interested', label: 'Not interested',color: 'bg-gray-100 text-gray-500' },
]

const TABLE_MAP: Record<LeadType, string> = {
  waitlist:     'waitlist',
  survey:       'survey_responses',
  consultation: 'consultation_requests',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function waLink(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return `https://wa.me/${digits}`
}

function fmt(dt: string) {
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function statusColor(s: LeadStatus) {
  return STATUS_OPTIONS.find(o => o.value === s)?.color ?? 'bg-gray-100 text-gray-500'
}

function urgencyLabel(u: string) {
  if (u === 'this_week') return '🔴 Urgent'
  if (u === 'one_to_three_months') return '🟡 1–3 months'
  return '🟢 Exploring'
}

// ── Fetch + normalise ──────────────────────────────────────────────────────────

async function fetchLeads(): Promise<Lead[]> {
  const [wlRes, srRes, crRes] = await Promise.all([
    supabase.from('waitlist').select('*').order('created_at', { ascending: false }),
    supabase.from('survey_responses').select('*').order('created_at', { ascending: false }),
    supabase.from('consultation_requests').select('*').order('created_at', { ascending: false }),
  ])

  const waitlist: Lead[] = (wlRes.data ?? []).map((r: Record<string, unknown>) => ({
    id:          String(r.id),
    type:        'waitlist',
    name:        String(r.full_name ?? ''),
    whatsapp:    String(r.whatsapp_number ?? ''),
    email:       String(r.email ?? ''),
    parent_city: String(r.loved_one_city ?? r.parent_city ?? ''),
    source:      'website',
    country:     String(r.country ?? ''),
    extra:       urgencyLabel(String(r.urgency ?? '')),
    status:      (r.status as LeadStatus) ?? 'new',
    admin_notes: String(r.admin_notes ?? ''),
    created_at:  String(r.created_at),
  }))

  const survey: Lead[] = (srRes.data ?? []).map((r: Record<string, unknown>) => ({
    id:          String(r.id),
    type:        'survey',
    name:        String(r.name ?? ''),
    whatsapp:    String(r.whatsapp ?? ''),
    email:       String(r.email ?? ''),
    parent_city: String(r.parent_city ?? ''),
    source:      String(r.source ?? 'direct'),
    country:     String(r.q2_residence ?? ''),
    extra:       String(r.q5_value_perception ?? ''),
    status:      (r.status as LeadStatus) ?? 'new',
    admin_notes: String(r.admin_notes ?? ''),
    created_at:  String(r.created_at),
  }))

  const consult: Lead[] = (crRes.data ?? []).map((r: Record<string, unknown>) => ({
    id:          String(r.id),
    type:        'consultation',
    name:        String(r.full_name ?? ''),
    whatsapp:    String(r.whatsapp_number ?? ''),
    email:       String(r.email ?? ''),
    parent_city: String(r.parent_city ?? ''),
    source:      'website',
    country:     String(r.country ?? ''),
    extra:       `Best time: ${r.best_time ?? '—'}`,
    status:      (r.status as LeadStatus) ?? 'new',
    admin_notes: String(r.admin_notes ?? ''),
    created_at:  String(r.created_at),
  }))

  return [...waitlist, ...survey, ...consult].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

// ── TypeBadge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: LeadType }) {
  const map: Record<LeadType, string> = {
    waitlist:     'bg-indigo-100 text-indigo-700',
    survey:       'bg-green-100 text-green-700',
    consultation: 'bg-orange-100 text-orange-700',
  }
  const labels: Record<LeadType, string> = {
    waitlist: 'Waitlist', survey: 'Survey', consultation: 'Consult',
  }
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${map[type]}`}>
      {labels[type]}
    </span>
  )
}

// ── SaveToast ─────────────────────────────────────────────────────────────────

function useSave(lead: Lead, onUpdate: (id: string, patch: Partial<Lead>) => void) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = useCallback(async (patch: { status?: LeadStatus; admin_notes?: string }) => {
    setSaving(true)
    const table = TABLE_MAP[lead.type]
    await supabase.from(table).update(patch).eq('id', lead.id)
    onUpdate(lead.id, patch)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }, [lead.id, lead.type, onUpdate])

  return { save, saving, saved }
}

// ── LeadRow (desktop) ─────────────────────────────────────────────────────────

function LeadRow({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, patch: Partial<Lead>) => void }) {
  const [notes, setNotes] = useState(lead.admin_notes)
  const { save, saving, saved } = useSave(lead, onUpdate)

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 align-top">
      <td className="px-4 py-3 min-w-[160px]">
        <p className="font-semibold text-green-900 text-sm">{lead.name}</p>
        <p className="text-xs text-gray-400">{lead.email}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <a
          href={waLink(lead.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-900 font-medium"
        >
          <MessageCircle size={13} />
          {lead.whatsapp}
        </a>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{lead.parent_city}</td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-500">{lead.source}</span>
        {lead.country && <p className="text-xs text-gray-400">{lead.country}</p>}
      </td>
      <td className="px-4 py-3"><TypeBadge type={lead.type} /></td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmt(lead.created_at)}</td>
      <td className="px-4 py-3">
        <select
          value={lead.status}
          onChange={e => save({ status: e.target.value as LeadStatus })}
          className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer appearance-none pr-5 ${statusColor(lead.status)}`}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 min-w-[180px]">
        <div className="relative">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => notes !== lead.admin_notes && save({ admin_notes: notes })}
            rows={1}
            placeholder="Add note…"
            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-green-500 placeholder-gray-300"
          />
          {(saving || saved) && (
            <span className="absolute right-1.5 top-1.5 text-[10px] text-green-600 font-semibold">
              {saving ? '…' : '✓'}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── LeadCard (mobile) ─────────────────────────────────────────────────────────

function LeadCard({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, patch: Partial<Lead>) => void }) {
  const [notes, setNotes] = useState(lead.admin_notes)
  const [open, setOpen] = useState(false)
  const { save, saving, saved } = useSave(lead, onUpdate)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-green-900">{lead.name}</p>
          <p className="text-xs text-gray-400">{lead.email}</p>
        </div>
        <TypeBadge type={lead.type} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <a
          href={waLink(lead.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-green-700 font-medium"
        >
          <MessageCircle size={13} /> {lead.whatsapp}
        </a>
        <span className="text-xs text-gray-400">{lead.parent_city}</span>
        {lead.source !== 'website' && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg px-2 py-0.5">
            {lead.source}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 justify-between">
        <select
          value={lead.status}
          onChange={e => save({ status: e.target.value as LeadStatus })}
          className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${statusColor(lead.status)}`}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{fmt(lead.created_at)}</span>
      </div>

      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-gray-400 flex items-center gap-1"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? 'Hide notes' : 'Add note'}
      </button>

      {open && (
        <div className="relative">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => notes !== lead.admin_notes && save({ admin_notes: notes })}
            rows={2}
            placeholder="Add a note after your call…"
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-green-500 placeholder-gray-300"
          />
          {(saving || saved) && (
            <span className="absolute right-2 top-2 text-[10px] text-green-600 font-semibold">
              {saving ? '…' : '✓ Saved'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminLeadsCRM() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filters
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setLeads(await fetchLeads())
    } catch {
      setError('Failed to load leads. Try again.')
    }
    setLoading(false)
  }

  const onUpdate = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }, [])

  // unique sources for filter dropdown
  const sources = ['all', ...Array.from(new Set(leads.map(l => l.source))).sort()]

  const filtered = leads
    .filter(l => sourceFilter === 'all' || l.source === sourceFilter)
    .filter(l => statusFilter === 'all' || l.status === statusFilter)
    .filter(l => typeFilter   === 'all' || l.type   === typeFilter)
    .sort((a, b) => {
      const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortDir === 'desc' ? d : -d
    })

  // stats
  const total = leads.length
  const byType = {
    waitlist:     leads.filter(l => l.type === 'waitlist').length,
    survey:       leads.filter(l => l.type === 'survey').length,
    consultation: leads.filter(l => l.type === 'consultation').length,
  }
  const sourceBreakdown = Array.from(
    leads.reduce((acc, l) => {
      acc.set(l.source, (acc.get(l.source) ?? 0) + 1)
      return acc
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl text-green-900">Waitlist & Leads</h1>
          <p className="text-gray-400 text-sm mt-1">All inbound leads — waitlist, survey, consultation</p>
        </div>
        <button
          onClick={load}
          className="text-xs font-semibold text-green-700 border border-green-200 rounded-xl px-3 py-2 hover:bg-green-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-green-900">{total}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total leads</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-indigo-700">{byType.waitlist}</p>
            <p className="text-xs text-gray-400 mt-0.5">Waitlist signups</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-green-700">{byType.survey}</p>
            <p className="text-xs text-gray-400 mt-0.5">Survey responses</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-orange-600">{byType.consultation}</p>
            <p className="text-xs text-gray-400 mt-0.5">Consultation requests</p>
          </div>
        </div>
      )}

      {/* Source breakdown */}
      {!loading && sourceBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">By source</p>
          <div className="flex flex-wrap gap-2">
            {sourceBreakdown.map(([src, count]) => (
              <button
                key={src}
                onClick={() => setSourceFilter(sourceFilter === src ? 'all' : src)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                  sourceFilter === src
                    ? 'bg-green-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {src} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between">
          {error}
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-green-600 bg-white"
        >
          <option value="all">All types</option>
          <option value="waitlist">Waitlist</option>
          <option value="survey">Survey</option>
          <option value="consultation">Consultation</option>
        </select>

        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-green-600 bg-white"
        >
          {sources.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-green-600 bg-white"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 border-2 border-gray-200 rounded-xl px-3 py-2 hover:border-green-400 transition-colors bg-white"
        >
          {sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={26} className="animate-spin text-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-semibold text-green-900">No leads match your filters</p>
          <button onClick={() => { setSourceFilter('all'); setStatusFilter('all'); setTypeFilter('all') }}
            className="mt-3 text-sm text-green-600 underline">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Name / Email</th>
                  <th className="px-4 py-3 text-left">WhatsApp</th>
                  <th className="px-4 py-3 text-left">Parent's City</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <LeadRow key={`${lead.type}-${lead.id}`} lead={lead} onUpdate={onUpdate} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(lead => (
              <LeadCard key={`${lead.type}-${lead.id}`} lead={lead} onUpdate={onUpdate} />
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Showing {filtered.length} of {total} leads
          </p>
        </>
      )}
    </div>
  )
}
