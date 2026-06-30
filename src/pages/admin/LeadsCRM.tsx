import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle } from 'lucide-react'
import { Badge, EmptyState, ErrorBox, Skeleton } from './_shared'

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
  extra: string
  status: LeadStatus
  admin_notes: string
  created_at: string
  // survey-only fields
  q1_location?: string
  q2_residence?: string
  q3_worries?: string[]
  q4_check_method?: string
  q5_value_perception?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new',            label: 'New'           },
  { value: 'contacted',      label: 'Contacted'     },
  { value: 'interested',     label: 'Interested'    },
  { value: 'converted',      label: 'Converted'     },
  { value: 'not_interested', label: 'Not interested'},
]

const STATUS_TONE: Record<string, string> = {
  new: 'blue',
  contacted: 'amber',
  interested: 'purple',
  converted: 'green',
  not_interested: 'gray',
}

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

function urgencyLabel(u: string) {
  if (u === 'this_week')           return '🔴 Urgent'
  if (u === 'one_to_three_months') return '🟡 1–3 months'
  return '🟢 Exploring'
}

// ── Survey panel ───────────────────────────────────────────────────────────────

function SurveyPanel({ lead }: { lead: Lead }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Do they have elderly parents in India?',
      value: lead.q1_location || '—',
    },
    {
      label: 'Where they live',
      value: lead.q2_residence || lead.country || '—',
    },
    {
      label: 'What worries them most',
      value: lead.q3_worries?.length
        ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {lead.q3_worries.map(w => (
              <Badge key={w} tone="amber">{w}</Badge>
            ))}
          </div>
        )
        : '—',
    },
    {
      label: 'How they currently check on parents',
      value: lead.q4_check_method || '—',
    },
    {
      label: "How valuable they'd find the service",
      value: lead.q5_value_perception || '—',
    },
  ]

  return (
    <div style={{
      background: 'rgba(168,213,181,0.12)',
      border: '1px solid rgba(168,213,181,0.4)',
      borderRadius: 'var(--radius-card)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
        Survey answers
      </p>
      {rows.map(r => (
        <div key={r.label}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>{r.label}</p>
          <div style={{ fontSize: 13, color: 'var(--black)' }}>{r.value}</div>
        </div>
      ))}
    </div>
  )
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
    id:                 String(r.id),
    type:               'survey',
    name:               String(r.name ?? ''),
    whatsapp:           String(r.whatsapp ?? ''),
    email:              String(r.email ?? ''),
    parent_city:        String(r.parent_city ?? ''),
    source:             String(r.source ?? 'direct'),
    country:            String(r.q2_residence ?? ''),
    extra:              String(r.q5_value_perception ?? ''),
    status:             (r.status as LeadStatus) ?? 'new',
    admin_notes:        String(r.admin_notes ?? ''),
    created_at:         String(r.created_at),
    q1_location:        String(r.q1_location ?? ''),
    q2_residence:       String(r.q2_residence ?? ''),
    q3_worries:         Array.isArray(r.q3_worries) ? (r.q3_worries as string[]) : [],
    q4_check_method:    String(r.q4_check_method ?? ''),
    q5_value_perception: String(r.q5_value_perception ?? ''),
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
  const toneMap: Record<LeadType, string> = {
    waitlist:     'purple',
    survey:       'green',
    consultation: 'amber',
  }
  const labels: Record<LeadType, string> = {
    waitlist: 'Waitlist', survey: 'Survey', consultation: 'Consult',
  }
  return (
    <Badge tone={toneMap[type] as any}>{labels[type]}</Badge>
  )
}

// ── useSave ───────────────────────────────────────────────────────────────────

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

// ── LeadRow (desktop table) ───────────────────────────────────────────────────

function LeadRow({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, patch: Partial<Lead>) => void }) {
  const [notes, setNotes] = useState(lead.admin_notes)
  const [expanded, setExpanded] = useState(false)
  const { save, saving, saved } = useSave(lead, onUpdate)
  const hasSurvey = lead.type === 'survey'

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--gray-light)' }}>
        <td style={{ padding: '10px 14px', minWidth: 160, verticalAlign: 'top' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            {hasSurvey ? (
              <button
                onClick={() => setExpanded(v => !v)}
                title="View survey answers"
                style={{ marginTop: 2, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-mid)', padding: 0, fontSize: 14, lineHeight: 1 }}
              >
                {expanded ? '▲' : '▼'}
              </button>
            ) : (
              <span style={{ width: 14, flexShrink: 0 }} />
            )}
            <div>
              <p style={{ fontWeight: 600, color: 'var(--forest)', fontSize: 13, margin: 0 }}>{lead.name}</p>
              <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>{lead.email}</p>
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
          <a
            href={waLink(lead.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--forest)', fontWeight: 500, textDecoration: 'none' }}
          >
            <MessageCircle size={13} />
            {lead.whatsapp}
          </a>
        </td>
        <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--black)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{lead.parent_city}</td>
        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{lead.source}</span>
          {lead.country && <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>{lead.country}</p>}
        </td>
        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
          <TypeBadge type={lead.type} />
        </td>
        <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--gray-mid)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{fmt(lead.created_at)}</td>
        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
          <select
            value={lead.status}
            onChange={e => save({ status: e.target.value as LeadStatus })}
            className={`adm-badge ${STATUS_TONE[lead.status] || 'gray'}`}
            style={{ border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: 4, fontWeight: 600, fontSize: 12 }}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </td>
        <td style={{ padding: '10px 14px', minWidth: 180, verticalAlign: 'top' }}>
          <div style={{ position: 'relative' }}>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => notes !== lead.admin_notes && save({ admin_notes: notes })}
              rows={1}
              placeholder="Add note…"
              className="adm-textarea"
              style={{ width: '100%', fontSize: 12, resize: 'none' }}
            />
            {(saving || saved) && (
              <span style={{ position: 'absolute', right: 6, top: 6, fontSize: 10, color: 'var(--forest)', fontWeight: 700 }}>
                {saving ? '…' : '✓'}
              </span>
            )}
          </div>
        </td>
      </tr>

      {expanded && hasSurvey && (
        <tr style={{ background: 'rgba(168,213,181,0.06)' }}>
          <td colSpan={8} style={{ padding: '10px 20px', borderBottom: '1px solid rgba(168,213,181,0.3)' }}>
            <SurveyPanel lead={lead} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── LeadCard (mobile) ─────────────────────────────────────────────────────────

function LeadCard({ lead, onUpdate }: { lead: Lead; onUpdate: (id: string, patch: Partial<Lead>) => void }) {
  const [notes, setNotes] = useState(lead.admin_notes)
  const [notesOpen, setNotesOpen] = useState(false)
  const [surveyOpen, setSurveyOpen] = useState(false)
  const { save, saving, saved } = useSave(lead, onUpdate)
  const hasSurvey = lead.type === 'survey'

  return (
    <div className="adm-card adm-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--forest)', margin: 0 }}>{lead.name}</p>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>{lead.email}</p>
        </div>
        <TypeBadge type={lead.type} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <a
          href={waLink(lead.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--forest)', fontWeight: 500, textDecoration: 'none' }}
        >
          <MessageCircle size={13} /> {lead.whatsapp}
        </a>
        <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{lead.parent_city}</span>
        {lead.source !== 'website' && (
          <Badge tone="blue">{lead.source}</Badge>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <select
          value={lead.status}
          onChange={e => save({ status: e.target.value as LeadStatus })}
          className={`adm-badge ${STATUS_TONE[lead.status] || 'gray'}`}
          style={{ border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', fontWeight: 600, fontSize: 12 }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{fmt(lead.created_at)}</span>
      </div>

      {hasSurvey && (
        <button
          onClick={() => setSurveyOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', fontSize: 12, fontWeight: 600, color: 'var(--forest)',
            background: 'rgba(168,213,181,0.12)', border: '1px solid rgba(168,213,181,0.4)',
            borderRadius: 'var(--radius-card)', padding: '6px 10px', cursor: 'pointer',
          }}
        >
          <span>{surveyOpen ? 'Hide survey answers' : 'View survey answers'}</span>
          <span style={{ fontSize: 11 }}>{surveyOpen ? '▲' : '▼'}</span>
        </button>
      )}

      {hasSurvey && surveyOpen && <SurveyPanel lead={lead} />}

      <button
        onClick={() => setNotesOpen(v => !v)}
        style={{ fontSize: 12, color: 'var(--gray-mid)', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{ fontSize: 11 }}>{notesOpen ? '▲' : '▼'}</span>
        {notesOpen ? 'Hide notes' : 'Add note'}
      </button>

      {notesOpen && (
        <div style={{ position: 'relative' }}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => notes !== lead.admin_notes && save({ admin_notes: notes })}
            rows={2}
            placeholder="Add a note after your call…"
            className="adm-textarea"
            style={{ width: '100%', fontSize: 12, resize: 'none' }}
          />
          {(saving || saved) && (
            <span style={{ position: 'absolute', right: 8, top: 8, fontSize: 10, color: 'var(--forest)', fontWeight: 700 }}>
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
  const [leads, setLeads]           = useState<Lead[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [sortDir, setSortDir]           = useState<'desc' | 'asc'>('desc')

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

  const sources = ['all', ...Array.from(new Set(leads.map(l => l.source))).sort()]

  const filtered = leads
    .filter(l => sourceFilter === 'all' || l.source === sourceFilter)
    .filter(l => statusFilter === 'all' || l.status === statusFilter)
    .filter(l => typeFilter   === 'all' || l.type   === typeFilter)
    .sort((a, b) => {
      const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return sortDir === 'desc' ? d : -d
    })

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="adm-page-h">Waitlist &amp; Leads</h1>
          <p className="adm-page-sub" style={{ marginTop: 4 }}>All inbound leads — waitlist, survey, consultation</p>
        </div>
        <button onClick={load} className="adm-btn" style={{ fontSize: 12 }}>
          Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          <div className="adm-card adm-card-pad">
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>{total}</p>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>Total leads</p>
          </div>
          <div className="adm-card adm-card-pad">
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>{byType.waitlist}</p>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>Waitlist signups</p>
          </div>
          <div className="adm-card adm-card-pad">
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>{byType.survey}</p>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>Survey responses</p>
          </div>
          <div className="adm-card adm-card-pad">
            <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>{byType.consultation}</p>
            <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>Consultation requests</p>
          </div>
        </div>
      )}

      {/* Source breakdown */}
      {!loading && sourceBreakdown.length > 0 && (
        <div className="adm-card adm-card-pad">
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>By source</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sourceBreakdown.map(([src, count]) => (
              <button
                key={src}
                onClick={() => setSourceFilter(sourceFilter === src ? 'all' : src)}
                className={`adm-pill-f${sourceFilter === src ? ' is-active' : ''}`}
              >
                {src} <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorBox onRetry={load} />}

      {/* Filters */}
      <div className="adm-filterbar">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="adm-input" style={{ fontSize: 13 }}>
          <option value="all">All types</option>
          <option value="waitlist">Waitlist</option>
          <option value="survey">Survey</option>
          <option value="consultation">Consultation</option>
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="adm-input" style={{ fontSize: 13 }}>
          {sources.map(s => <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="adm-input" style={{ fontSize: 13 }}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="adm-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}
        >
          <span style={{ fontSize: 11 }}>{sortDir === 'desc' ? '▼' : '▲'}</span>
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton h={88} />
          <Skeleton h={88} />
          <Skeleton h={88} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="adm-card adm-card-pad">
          <EmptyState
            title="No leads match your filters"
            sub="Try clearing the filters to see all leads"
          />
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button
              onClick={() => { setSourceFilter('all'); setStatusFilter('all'); setTypeFilter('all') }}
              className="adm-btn"
              style={{ fontSize: 13 }}
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="adm-table-wrap" style={{ display: 'none' }}>
            <style>{`@media(min-width:768px){.leads-table-wrap{display:block!important}}`}</style>
            <div className="leads-table-wrap adm-table-wrap">
              <table className="adm-table" style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--gray-light)', background: 'var(--cream)' }}>
                    {['Name / Email', 'WhatsApp', "Parent's City", 'Source', 'Type', 'Date', 'Status', 'Notes'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => (
                    <LeadRow key={`${lead.type}-${lead.id}`} lead={lead} onUpdate={onUpdate} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="leads-mobile-cards" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <style>{`@media(min-width:768px){.leads-mobile-cards{display:none!important}}`}</style>
            {filtered.map(lead => (
              <LeadCard key={`${lead.type}-${lead.id}`} lead={lead} onUpdate={onUpdate} />
            ))}
          </div>

          <p style={{ fontSize: 12, color: 'var(--gray-mid)', textAlign: 'center' }}>
            Showing {filtered.length} of {total} leads
          </p>
        </>
      )}
    </div>
  )
}
