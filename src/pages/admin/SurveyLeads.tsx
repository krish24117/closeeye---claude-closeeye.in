import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge, EmptyState, ErrorBox, Skeleton } from './_shared'

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
  if (!value) return <span style={{ color: 'var(--gray-mid)' }}>—</span>
  const hot = value.includes("Very valuable") || value.includes("want this")
  return (
    <Badge tone={hot ? 'green' : 'gray'}>
      {hot ? '🔥 ' : ''}{value}
    </Badge>
  )
}

function ExpandedRow({ r }: { r: SurveyResponse }) {
  return (
    <div style={{
      background: 'rgba(168,213,181,0.12)',
      borderTop: '1px solid var(--line)',
      padding: '14px 20px',
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 12,
      fontSize: 13,
    }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', marginBottom: 2 }}>Q1 — Has elderly family in India?</p>
        <p style={{ color: 'var(--black)' }}>{r.q1_location || '—'}</p>
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', marginBottom: 2 }}>Q2 — Where they live</p>
        <p style={{ color: 'var(--black)' }}>{r.q2_residence || '—'}</p>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', marginBottom: 2 }}>Q3 — Worries (multi-select)</p>
        {r.q3_worries && r.q3_worries.length > 0
          ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {r.q3_worries.map(w => (
                <span key={w} style={{
                  fontSize: 11,
                  background: '#fff',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: '2px 8px',
                  color: 'var(--gray-dark)',
                }}>{w}</span>
              ))}
            </div>
          : <p style={{ color: 'var(--gray-mid)' }}>—</p>
        }
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', marginBottom: 2 }}>Q4 — How they check in</p>
        <p style={{ color: 'var(--black)' }}>{r.q4_check_method || '—'}</p>
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', marginBottom: 2 }}>Q5 — Value of companion visit</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="adm-page-h">Survey Leads</h1>
          <p className="adm-page-sub" style={{ marginTop: 4 }}>
            {leads.length} total · {hotLeads} hot leads 🔥
          </p>
        </div>
        <a
          href="/survey"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--forest)',
            border: '1px solid var(--sage)',
            borderRadius: 10,
            padding: '6px 12px',
            textDecoration: 'none',
            background: 'transparent',
          }}
        >
          ↗ View survey
        </a>
      </div>

      {error && (
        <ErrorBox onRetry={load} />
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, city, source…"
          className="adm-input"
          style={{ flex: 1, minWidth: 200 }}
        />
        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="adm-btn"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
        >
          {sortDir === 'desc' ? '↓' : '↑'}
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton h={56} />
          <Skeleton h={56} />
          <Skeleton h={56} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={leads.length === 0 ? 'No leads yet' : 'No results'}
          sub={leads.length === 0
            ? 'Share the survey link to start collecting responses.'
            : 'Try a different search term.'}
        />
      ) : (
        <div className="adm-card" style={{ overflow: 'hidden', padding: 0 }}>
          {/* Desktop header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 130px 120px 100px 80px 130px',
            gap: 12,
            padding: '10px 20px',
            background: 'var(--gray-light)',
            borderBottom: '1px solid var(--line)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--gray-mid)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <span>Name / Contact</span>
            <span>Parent's city</span>
            <span>Source</span>
            <span>Hot?</span>
            <span>Lives</span>
            <span>Date</span>
          </div>

          {filtered.map(r => (
            <div key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
              <button
                onClick={() => toggleExpand(r.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 130px 120px 100px 80px 130px',
                  gap: 12,
                  alignItems: 'center',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: 'var(--forest)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{r.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--gray-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>{r.whatsapp}</p>
                    <p style={{ fontSize: 11, color: 'var(--gray-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '1px 0 0' }}>{r.email}</p>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--gray-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.parent_city}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.source || '—'}</span>
                  <ValueBadge value={r.q5_value_perception} />
                  <span style={{ fontSize: 11, color: 'var(--gray-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.q2_residence ? r.q2_residence.replace('Outside India (NRI)', 'NRI') : '—'}</span>
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{fmt(r.created_at)}</span>
                    <span style={{ fontSize: 13, color: 'var(--gray-mid)' }}>{expanded === r.id ? '▲' : '▼'}</span>
                  </div>
                </div>
              </button>

              {expanded === r.id && <ExpandedRow r={r} />}
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--gray-mid)', textAlign: 'center' }}>
          Showing {filtered.length} of {leads.length} leads
        </p>
      )}
    </div>
  )
}
