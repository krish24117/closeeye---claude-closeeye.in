import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Phone, CalendarHeart } from 'lucide-react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
type Tier1 = { mood?: boolean | null; eating?: boolean | null; medicines?: boolean | null; home?: boolean | null; concerns?: boolean; one_moment?: string }
type Tier2 = Record<string, unknown>
interface Visit {
  id: string; companion_id: string | null; start_time: string | null; end_time: string | null; created_at: string
  flags: string; flag_notes: string | null; one_moment: string | null; mood_score: number | null
  checklist_data: { tier1?: Tier1; tier2?: Tier2 } | null
  elder_profiles?: { name: string | null } | null
}

const SNAPSHOT: { key: keyof Tier1; emoji: string; label: string; good: string; bad: string }[] = [
  { key: 'mood', emoji: '😊', label: 'Mood', good: 'Good', bad: 'Low' },
  { key: 'eating', emoji: '🍽️', label: 'Eating', good: 'Well', bad: 'Concern' },
  { key: 'medicines', emoji: '💊', label: 'Medicines', good: 'Taken', bad: 'Missed' },
  { key: 'home', emoji: '🏠', label: 'Home', good: 'Safe', bad: 'Check' },
]

function durationLabel(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  const m = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (m < 0) return null
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`.replace(' 0m', '')
}
function fmt(iso?: string | null, f = 'EEE, dd MMM yyyy') { return iso ? format(new Date(iso), f) : '' }

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ margin: 16, background: '#fdecec', border: '1px solid #f5c2c2', color: '#b42318', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
      <span style={{ fontSize: 14 }}>Connection issue — please try again.</span>
      <button onClick={onRetry} style={{ fontSize: 14, fontWeight: 600, color: '#b42318', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Try again</button>
    </div>
  )
}

/* ================================================================== */
/*  REPORTS LIST                                                       */
/* ================================================================== */

export function DashboardReports() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [companions, setCompanions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<'all' | 'this' | 'last'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(false)
    const { data, error } = await supabase.from('visits')
      .select('*, elder_profiles(name)').order('created_at', { ascending: false })
    if (error) { setError(true); setLoading(false); return }
    const rows = (data || []) as Visit[]
    setVisits(rows)
    const ids = Array.from(new Set(rows.map(r => r.companion_id).filter(Boolean))) as string[]
    if (ids.length) {
      const { data: comps } = await supabase.from('companions').select('id, full_name').in('id', ids)
      const map: Record<string, string> = {}
      comps?.forEach((c: { id: string; full_name: string }) => { map[c.id] = c.full_name })
      setCompanions(map)
    }
    setLoading(false)
  }

  const now = new Date()
  const filtered = visits.filter(v => {
    if (filter === 'all') return true
    const d = new Date(v.created_at)
    if (filter === 'this') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
  })

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 16px 12px' }}>Visit Reports</h1>

      {/* Filter pills */}
      <div className="ce-noscroll" style={{ display: 'flex', gap: 8, padding: '0 16px 4px', overflowX: 'auto' }}>
        {([['all', 'All'], ['this', 'This Month'], ['last', 'Last Month']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            flexShrink: 0, borderRadius: 100, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
            fontWeight: filter === k ? 600 : 400,
            background: filter === k ? 'var(--forest)' : '#fff', color: filter === k ? '#fff' : 'var(--gray-dark)',
            border: filter === k ? 'none' : '1px solid var(--gray-light)',
          }}>{l}</button>
        ))}
      </div>

      {loading && <div style={{ padding: 16 }}>{[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 16, marginBottom: 12 }} />)}</div>}
      {error && <ErrorBox onRetry={load} />}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <CalendarHeart size={40} color="var(--sage)" style={{ margin: '0 auto' }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--black)', margin: '12px 0 4px' }}>Your first visit is coming</p>
          <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 16px' }}>We'll notify you on WhatsApp once a visit report is ready.</p>
          <Link to="/dashboard/book" className="ce-btn ce-btn-primary" style={{ display: 'inline-flex' }}>Book a visit →</Link>
        </div>
      )}

      {!loading && !error && filtered.map(v => {
        const flagged = v.flags && v.flags !== 'none'
        return (
          <Link key={v.id} to={`/dashboard/reports/${v.id}`} style={{ display: 'block', margin: '0 16px 12px', background: '#fff', borderRadius: 'var(--radius-card)', padding: '18px 20px', boxShadow: 'var(--shadow-card)', textDecoration: 'none' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)' }}>{fmt(v.end_time || v.created_at)}</span>
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 100, padding: '3px 10px', background: flagged ? '#FFF3E0' : 'var(--sage)', color: flagged ? '#F59E0B' : 'var(--forest)' }}>
                {flagged ? 'Flagged' : 'All well'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '4px 0 0' }}>
              {[durationLabel(v.start_time, v.end_time), v.companion_id ? (companions[v.companion_id] || 'Companion') : 'Companion'].filter(Boolean).join(' · ')}
            </p>
            {v.one_moment && <p style={{ fontSize: 13, color: 'var(--gray-dark)', fontStyle: 'italic', margin: '8px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{v.one_moment}”</p>}
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--forest)', margin: '10px 0 0' }}>View full report →</p>
          </Link>
        )
      })}
    </div>
  )
}

/* ================================================================== */
/*  REPORT DETAIL                                                      */
/* ================================================================== */

export function DashboardReportDetail() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const [v, setV] = useState<Visit | null>(null)
  const [companion, setCompanion] = useState('Companion')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!visitId) return
    let active = true
    ;(async () => {
      setLoading(true); setError(false)
      const { data, error } = await supabase.from('visits').select('*, elder_profiles(name)').eq('id', visitId).maybeSingle()
      if (!active) return
      if (error || !data) { setError(true); setLoading(false); return }
      setV(data as Visit)
      if (data.companion_id) {
        const { data: c } = await supabase.from('companions').select('full_name').eq('id', data.companion_id).maybeSingle()
        if (active && c?.full_name) setCompanion(c.full_name)
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [visitId])

  const t1 = v?.checklist_data?.tier1 || {}
  const t2 = (v?.checklist_data?.tier2 || {}) as Record<string, string>
  const flagged = !!v && v.flags !== 'none'
  const urgent = v?.flags === 'urgent'

  function snapColor(val: boolean | null | undefined) {
    if (val === true) return 'var(--forest)'
    if (val === false) return urgent ? '#EF4444' : '#F59E0B'
    return 'var(--gray-mid)'
  }

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate('/dashboard/reports')} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-dark)' }}><ChevronLeft size={24} /></button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Visit Report</span>
      </div>

      {loading && <div style={{ padding: 16 }}><div className="skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 12 }} /><div className="skeleton" style={{ height: 160, borderRadius: 16 }} /></div>}
      {error && <ErrorBox onRetry={() => navigate(0)} />}

      {!loading && !error && v && (
        <>
          {/* Meta */}
          <div style={{ background: 'var(--cream)', padding: '20px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>{v.elder_profiles?.name || 'Your loved one'}</p>
            <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '4px 0 0' }}>{fmt(v.start_time || v.created_at)}{durationLabel(v.start_time, v.end_time) ? ` · ${durationLabel(v.start_time, v.end_time)}` : ''}</p>
            <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '2px 0 0' }}>Companion: {companion}</p>
          </div>

          {/* Snapshot 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16 }}>
            {SNAPSHOT.map(s => {
              const val = t1[s.key] as boolean | null | undefined
              return (
                <div key={s.key} style={{ background: '#fff', borderRadius: 12, padding: 16, textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ fontSize: 24 }}>{s.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-mid)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: snapColor(val), marginTop: 2 }}>{val === true ? s.good : val === false ? s.bad : '—'}</div>
                </div>
              )
            })}
          </div>

          {/* Narrative */}
          <div style={{ margin: '0 16px', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', textTransform: 'uppercase', margin: '0 0 12px' }}>How they were today</p>
            <p style={{ fontSize: 16, color: 'var(--gray-dark)', lineHeight: 1.8, margin: 0 }}>
              {flagged
                ? (v.flag_notes || t2.concerns_text || 'Your companion noted something to keep an eye on — see below.')
                : 'A calm, positive visit. Mood, meals, medicines and home all looked good, with no concerns to report.'}
            </p>
          </div>

          {/* One moment */}
          {v.one_moment && (
            <div style={{ margin: '16px 16px 0', background: 'var(--forest)', borderRadius: 'var(--radius-card)', padding: 24 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--sage)', opacity: 0.5, lineHeight: 0.5 }}>“</span>
              <p style={{ fontSize: 17, color: '#fff', fontStyle: 'italic', lineHeight: 1.7, margin: '8px 0 0' }}>{v.one_moment}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '12px 0 0' }}>Captured by {companion} · {fmt(v.created_at, 'dd MMM yyyy')}</p>
            </div>
          )}

          {/* Medicines */}
          <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-mid)', textTransform: 'uppercase', margin: '0 0 12px' }}>Medicines</p>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>Medicines on schedule</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: t1.medicines === false ? '#EF4444' : 'var(--forest)' }}>{t1.medicines === false ? '✗ Missed' : '✓ Taken'}</span>
            </div>
            {t1.medicines === false && t2.med_which_missed && (
              <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '6px 0 0' }}>{t2.med_which_missed}</p>
            )}
          </div>

          {/* Flags */}
          {flagged && (
            <div style={{ margin: '16px 16px 0', background: 'rgba(255,165,0,0.10)', border: '1px solid rgba(255,165,0,0.30)', borderRadius: 'var(--radius-card)', padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', margin: '0 0 8px' }}>{urgent ? 'Needs attention' : 'Worth monitoring'}</p>
              <p style={{ fontSize: 14, color: '#A65A00', lineHeight: 1.6, margin: '0 0 12px' }}>{v.flag_notes || t2.concerns_text || 'Your companion flagged something from this visit.'}</p>
              <a href="https://wa.me/919000221261?text=Hi%2C%20about%20my%20visit%20report" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #F59E0B', color: '#A65A00', borderRadius: 'var(--radius-btn)', padding: '10px 18px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                <Phone size={15} /> Call us about this
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}
