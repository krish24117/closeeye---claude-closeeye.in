import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

interface Query {
  id: string; question: string; answer: string | null; ai_answer: string | null
  status: string; created_at: string
}

const SOCIETY_SUBJECTS = ['Myself', 'My Child', 'My Parent', 'Partner']

export function DashboardAsk() {
  const { user, profile } = useAuth()
  const isNri = profile?.user_type === 'nri'
  const [elderName, setElderName] = useState('your loved one')
  const [subject, setSubject] = useState('Myself')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<Query[]>([])

  useEffect(() => {
    if (!user) return
    if (isNri) {
      supabase.from('loved_ones').select('name').eq('family_user_id', user.id).order('created_at').limit(1).maybeSingle()
        .then(({ data }) => { if (data?.name) setElderName(data.name) })
    }
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function loadHistory() {
    if (!user) return
    const { data } = await supabase.from('member_queries').select('id,question,answer,ai_answer,status,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (data) setHistory(data)
  }

  async function submit() {
    if (!user || !text.trim()) return
    setSubmitting(true)
    const subjectLabel = isNri ? elderName : subject
    // Phase 1: persist the question (status 'pending'). The Claude AI draft +
    // doctor review is wired via an edge function in the next phase.
    const { error } = await supabase.from('member_queries').insert({
      user_id: user.id, question: text.trim(), subject_label: subjectLabel, status: 'pending',
    })
    setSubmitting(false)
    if (!error) { setText(''); loadHistory() }
  }

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 16px 12px' }}>Ask Close Eye</h1>

      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 'var(--radius-card)', padding: 16, boxShadow: 'var(--shadow-card)' }}>
        <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 10px' }}>
          {isNri ? `Ask anything about ${elderName}'s health` : 'Who is this question about?'}
        </p>
        {!isNri && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {SOCIETY_SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)} style={{
                borderRadius: 100, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                fontWeight: subject === s ? 600 : 400,
                background: subject === s ? 'var(--forest)' : 'var(--cream)',
                color: subject === s ? '#fff' : 'var(--gray-dark)',
                border: subject === s ? 'none' : '1px solid var(--gray-light)',
              }}>{s}</button>
            ))}
          </div>
        )}
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder={isNri ? 'e.g. Is it okay to give paracetamol with BP medicine?' : 'e.g. My child has had a fever for 2 days…'}
          style={{ width: '100%', minHeight: 90, resize: 'none', background: 'var(--cream)', border: '1px solid var(--gray-light)', borderRadius: 12, padding: '14px 16px', fontSize: 16, fontFamily: 'inherit' }}
        />
        <p style={{ fontSize: 11, color: 'var(--gray-mid)', fontStyle: 'italic', margin: '8px 0 12px' }}>
          General wellness guidance only. For emergencies call 108.
        </p>
        <button onClick={submit} disabled={submitting || !text.trim()} className="ce-btn ce-btn-primary ce-btn-full" style={{ padding: 14, opacity: submitting || !text.trim() ? 0.6 : 1 }}>
          {submitting ? <><Loader2 size={16} className="ce-spin" /> Sending…</> : 'Ask Close Eye →'}
        </button>
      </div>

      {history.length > 0 && (
        <div style={{ margin: '16px 16px 0' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.06em', margin: '0 0 8px' }}>PREVIOUS QUESTIONS</p>
          {history.map(q => (
            <div key={q.id} style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: 16, boxShadow: 'var(--shadow-card)', marginBottom: 10, borderLeft: '3px solid var(--sage)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', margin: 0 }}>{q.question}</p>
              <p style={{ fontSize: 13, color: 'var(--gray-dark)', lineHeight: 1.6, margin: '8px 0 0' }}>
                {q.answer || q.ai_answer || 'Doctor review in progress…'}
              </p>
              <span style={{ display: 'inline-block', marginTop: 10, fontSize: 11, fontWeight: q.status === 'doctor_reviewed' ? 600 : 400, color: q.status === 'doctor_reviewed' ? 'var(--forest)' : 'var(--gray-mid)', background: q.status === 'doctor_reviewed' ? 'rgba(14,42,31,0.06)' : 'transparent', borderRadius: 100, padding: q.status === 'doctor_reviewed' ? '4px 12px' : 0 }}>
                {q.status === 'doctor_reviewed' ? '✓ Reviewed by Close Eye Medical Team' : '⏳ Doctor review in progress'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
