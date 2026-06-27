import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import {
  Card, Badge, EmptyState, ErrorBox, Skeleton,
  timeAgo, istDate, queryTone, useAdmin,
} from './_shared'

type Filter = 'all' | 'pending' | 'verified' | 'flagged' | 'week'

const WEEK_MS = 7 * 864e5

export function AdminQueries() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const { refreshCounts } = useAdmin()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [authors, setAuthors] = useState<Record<string, any>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<Filter>('pending')

  const adminName = profile?.full_name || 'Close Eye Medical Team'

  async function load() {
    setLoading(true)
    setError(false)
    const { data, error: err } = await supabase
      .from('member_queries')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) { setError(true); setLoading(false); return }

    const list = data || []
    const ids = [...new Set(list.map((q: any) => q.user_id).filter(Boolean))]
    let map: Record<string, any> = {}
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, whatsapp_number')
        .in('id', ids)
      map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    }

    // prefill drafts with ai_answer for rows not yet verified
    const seed: Record<string, string> = {}
    list.forEach((q: any) => {
      if (q.status !== 'doctor_reviewed') seed[q.id] = q.answer || q.ai_answer || ''
    })

    setAuthors(map)
    setRows(list)
    setDrafts(prev => ({ ...seed, ...prev }))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function verify(q: any) {
    const text = (drafts[q.id] || '').trim()
    if (!text || saving[q.id]) return
    setSaving(s => ({ ...s, [q.id]: true }))
    const answered_at = new Date().toISOString()
    const { error: err } = await supabase
      .from('member_queries')
      .update({ answer: text, status: 'doctor_reviewed', reviewed_by: adminName, answered_at })
      .eq('id', q.id)
    setSaving(s => ({ ...s, [q.id]: false }))
    if (err) { showToast(err.message || 'Could not save', 'error'); return }
    setRows(rs => rs.map(r => r.id === q.id
      ? { ...r, answer: text, status: 'doctor_reviewed', reviewed_by: adminName, answered_at }
      : r))
    showToast('Marked as verified', 'success')
    refreshCounts()
  }

  const pendingCount = useMemo(
    () => rows.filter(q => q.status !== 'doctor_reviewed').length,
    [rows],
  )

  const filtered = useMemo(() => {
    const now = Date.now()
    return rows.filter(q => {
      switch (filter) {
        case 'pending': return q.status !== 'doctor_reviewed'
        case 'verified': return q.status === 'doctor_reviewed'
        case 'flagged': return q.helpful === false
        case 'week': return q.created_at && (now - new Date(q.created_at).getTime()) < WEEK_MS
        default: return true
      }
    })
  }, [rows, filter])

  const pills: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending review' },
    { key: 'verified', label: 'Verified' },
    { key: 'flagged', label: 'Flagged' },
    { key: 'week', label: 'This week' },
  ]

  return (
    <>
      <div className="adm-card-head" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 className="adm-page-h">Health Queries</h1>
          <p className="adm-page-sub" style={{ margin: 0 }}>
            {pendingCount > 0
              ? `${pendingCount} quer${pendingCount === 1 ? 'y' : 'ies'} awaiting doctor review`
              : 'All caught up — no queries need review'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {pills.map(p => (
          <button
            key={p.key}
            className={`adm-pill-f${filter === p.key ? ' is-active' : ''}`}
            onClick={() => setFilter(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map(i => <Skeleton key={i} h={160} />)}
        </div>
      ) : error ? (
        <ErrorBox onRetry={load} />
      ) : filtered.length === 0 ? (
        <Card><EmptyState title="No queries here" sub="Nothing matches this filter right now." /></Card>
      ) : (
        filtered.map(q => {
          const author = authors[q.user_id]
          const name = author?.full_name || 'A family'
          const qt = queryTone(q.status)
          const verified = q.status === 'doctor_reviewed'
          const flagged = q.helpful === false
          const borderColor = flagged ? '#EF4444' : verified ? 'var(--forest)' : '#F59E0B'

          return (
            <div
              key={q.id}
              className="adm-card adm-card-pad"
              style={{ borderLeft: `3px solid ${borderColor}`, marginBottom: 10 }}
            >
              {/* top row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>
                  {name}{q.subject_label ? ` — for ${q.subject_label}` : ''}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{timeAgo(q.created_at)}</span>
                  <Badge tone={qt.tone}>{qt.label}</Badge>
                </div>
              </div>

              {/* question */}
              <p style={{ fontSize: 14, color: 'var(--gray-dark)', lineHeight: 1.6, margin: '8px 0' }}>
                {q.question}
              </p>

              {/* AI response */}
              {q.ai_answer && (
                <div style={{ margin: '8px 0' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginBottom: 4 }}>AI response</div>
                  <div style={{
                    borderLeft: '2px solid var(--sage)', paddingLeft: 10,
                    fontSize: 13, color: 'var(--gray-dark)', lineHeight: 1.6,
                  }}>
                    {q.ai_answer}
                  </div>
                </div>
              )}

              {/* doctor section */}
              {verified ? (
                <div style={{
                  marginTop: 10, padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(34,197,94,0.12)',
                }}>
                  <p style={{ fontSize: 13, color: 'var(--gray-dark)', lineHeight: 1.6, margin: '0 0 8px' }}>
                    {q.answer}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Badge tone="green">Verified by {q.reviewed_by || 'Close Eye Medical Team'}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{istDate(q.answered_at)}</span>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    className="adm-textarea"
                    value={drafts[q.id] ?? ''}
                    onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))}
                    placeholder="Add your verified response…"
                    rows={4}
                    style={{ width: '100%' }}
                  />
                  <button
                    className="adm-btn adm-btn-sage"
                    style={{ width: '100%', marginTop: 8 }}
                    disabled={saving[q.id] || !(drafts[q.id] || '').trim()}
                    onClick={() => verify(q)}
                  >
                    {saving[q.id] ? 'Saving…' : 'Mark as verified ✓'}
                  </button>
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <span
                      className="adm-link"
                      style={{ fontSize: 12, cursor: 'pointer', color: 'var(--gray-mid)' }}
                      onClick={() => showToast('Assigned', 'info')}
                    >
                      Assign to doctor
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}
