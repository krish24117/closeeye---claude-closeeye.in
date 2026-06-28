import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'

interface Query {
  id: string
  subject_label: string | null
  question: string | null
  ai_answer: string | null
  doctor_response: string | null
  verification_status: string | null
  assigned_at: string | null
  created_at: string | null
  verified_at: string | null
}

const timeAgo = (iso?: string | null) => {
  if (!iso) return '—'
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return '—'
  }
}

const borderColorFor = (status?: string | null) => {
  if (status === 'verified') return '#16a34a'
  if (status === 'reviewed') return '#3B82F6'
  return '#F59E0B'
}

export function DoctorHome() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [queries, setQueries] = useState<Query[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let active = true
    ;(async () => {
      if (profile?.id) {
        await supabase.from('doctors').select('*').eq('user_id', profile.id).maybeSingle()
      }
      const { data } = await supabase
        .from('member_queries')
        .select(
          'id, subject_label, question, ai_answer, doctor_response, verification_status, assigned_at, created_at, verified_at'
        )
        .eq('assigned_doctor_id', profile.id)
        .order('created_at', { ascending: false })
      if (!active) return
      const rows = (data || []) as Query[]
      setQueries(rows)
      const initial: Record<string, string> = {}
      rows.forEach(r => {
        initial[r.id] = r.doctor_response || ''
      })
      setDrafts(initial)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [profile?.id])

  const submit = async (q: Query) => {
    const draft = (drafts[q.id] || '').trim()
    if (!draft || saving[q.id]) return
    setSaving(s => ({ ...s, [q.id]: true }))
    const { error } = await supabase
      .from('member_queries')
      .update({ doctor_response: draft, verification_status: 'reviewed' })
      .eq('id', q.id)
    setSaving(s => ({ ...s, [q.id]: false }))
    if (error) {
      showToast('Could not submit response — please try again', 'error')
      return
    }
    setQueries(prev =>
      prev.map(r =>
        r.id === q.id ? { ...r, doctor_response: draft, verification_status: 'reviewed' } : r
      )
    )
    showToast('Response submitted — Close Eye will publish it to the family', 'success')
  }

  const pending = queries.filter(q => q.verification_status === 'assigned').length
  const reviewed = queries.filter(
    q => q.verification_status === 'reviewed' || q.verification_status === 'verified'
  ).length
  const total = queries.length

  const statCard = (label: string, value: number) => (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-card)',
        border: '0.5px solid var(--gray-light)',
        padding: '14px 16px',
        flex: 1,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)' }}>{value}</div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--gray-mid)',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  )

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--black)', margin: '0 0 16px' }}>
        Queries assigned to you
      </h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {statCard('Pending', pending)}
        {statCard('Reviewed', reviewed)}
        {statCard('Total', total)}
      </div>

      {loading ? (
        <div>
          <div
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-card)',
              border: '0.5px solid var(--gray-light)',
              height: 120,
              marginBottom: 12,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-card)',
              border: '0.5px solid var(--gray-light)',
              height: 120,
              opacity: 0.6,
            }}
          />
        </div>
      ) : queries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-mid)', fontSize: 14 }}>
          No queries assigned to you yet.
        </div>
      ) : (
        queries.map(q => {
          const isVerified = q.verification_status === 'verified'
          const isReviewed = q.verification_status === 'reviewed'
          const draft = drafts[q.id] ?? ''
          return (
            <div
              key={q.id}
              style={{
                background: '#fff',
                borderRadius: 'var(--radius-card)',
                border: '0.5px solid var(--gray-light)',
                boxShadow: 'var(--shadow-card)',
                padding: 18,
                marginBottom: 12,
                borderLeft: `3px solid ${borderColorFor(q.verification_status)}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)' }}>
                  For {q.subject_label || 'a family member'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--gray-mid)', whiteSpace: 'nowrap' }}>
                  Assigned {timeAgo(q.assigned_at || q.created_at)}
                </span>
              </div>

              <p style={{ fontSize: 14, color: 'var(--gray-dark)', lineHeight: 1.6, margin: '8px 0' }}>
                {q.question}
              </p>

              {q.ai_answer && (
                <div style={{ margin: '10px 0' }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--gray-mid)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    AI Suggestion
                  </div>
                  <div
                    style={{
                      background: 'var(--cream)',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 13,
                      color: 'var(--gray-dark)',
                      lineHeight: 1.6,
                    }}
                  >
                    {q.ai_answer}
                  </div>
                </div>
              )}

              {isVerified ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        background: 'var(--sage)',
                        color: 'var(--forest)',
                        borderRadius: 100,
                        padding: '2px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      Published
                    </span>
                  </div>
                  <div
                    style={{
                      background: 'rgba(22,163,74,0.08)',
                      border: '0.5px solid rgba(22,163,74,0.25)',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 13,
                      color: 'var(--gray-dark)',
                      lineHeight: 1.6,
                    }}
                  >
                    {q.doctor_response}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    value={draft}
                    onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))}
                    placeholder="Write your medical response for the family…"
                    style={{
                      width: '100%',
                      minHeight: 90,
                      background: 'var(--cream)',
                      border: '0.5px solid var(--gray-light)',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => submit(q)}
                    disabled={!draft.trim() || saving[q.id]}
                    style={{
                      background: 'var(--forest)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 16px',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: !draft.trim() || saving[q.id] ? 'default' : 'pointer',
                      opacity: !draft.trim() || saving[q.id] ? 0.6 : 1,
                      marginTop: 8,
                    }}
                  >
                    {saving[q.id] ? 'Saving…' : isReviewed ? 'Update response' : 'Submit response'}
                  </button>
                  {isReviewed && (
                    <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 6 }}>
                      Submitted — awaiting Close Eye to publish
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
