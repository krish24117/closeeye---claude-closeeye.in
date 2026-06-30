import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge, EmptyState, ErrorBox, Skeleton } from './_shared'

export function AdminHealthReports() {
  const [queries, setQueries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(false)
    try {
      const { data, error: err } = await supabase
        .from('member_queries')
        .select('id, question, ai_answer, doctor_note, status, subject_label, created_at, user_id')
        .eq('status', 'doctor_reviewed')
        .order('created_at', { ascending: false })
        .limit(100)
      if (err) throw err

      const rows = data || []
      const userIds = [...new Set(rows.map((q: any) => q.user_id).filter(Boolean))]
      let names: Record<string, string> = {}
      if (userIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)
        names = Object.fromEntries((profs || []).map((p: any) => [p.id, p.full_name]))
      }
      setQueries(rows.map((q: any) => ({ ...q, family_name: names[q.user_id] || 'A family' })))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="adm-page-h">Health reports</h1>
      <p style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 20, marginTop: 2 }}>
        Completed health consultations reviewed by a doctor.
      </p>

      {error && <ErrorBox onRetry={load} />}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} h={100} />)}
        </div>
      )}

      {!loading && !error && (
        queries.length === 0
          ? <EmptyState title="No completed consultations yet" sub="Queries reviewed by a doctor will appear here." />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {queries.map((q: any) => (
                <div key={q.id} className="adm-card adm-card-pad">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', margin: 0 }}>
                      {q.family_name}
                      {q.subject_label ? <span style={{ fontWeight: 400, color: 'var(--gray-mid)' }}>{' — for '}{q.subject_label}</span> : null}
                    </p>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--gray-mid)', whiteSpace: 'nowrap' }}>
                        {new Date(q.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
                        })}
                      </span>
                      <Badge tone="green">Reviewed</Badge>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--gray-dark)', margin: '0 0 8px', lineHeight: 1.5 }}>{q.question}</p>
                  {q.doctor_note && (
                    <div style={{
                      background: 'var(--cream)', borderRadius: 8, padding: '8px 12px',
                      fontSize: 12, color: 'var(--muted)', borderLeft: '3px solid var(--sage-2)',
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--forest)' }}>Doctor note: </span>
                      {q.doctor_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
      )}
    </>
  )
}
