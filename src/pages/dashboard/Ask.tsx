import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'

interface Query {
  id: string; question: string; answer: string | null; ai_answer: string | null
  status: string; created_at: string
}

const SOCIETY_SUBJECTS = ['Myself', 'My Child', 'My Parent', 'Partner']

function StatusBadge({ status }: { status: string }) {
  if (status === 'doctor_reviewed')
    return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--forest)', background: 'rgba(14,42,31,0.06)', borderRadius: 100, padding: '4px 12px' }}>✓ Reviewed by Close Eye Medical Team</span>
  if (status === 'ai_answered')
    return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, color: 'var(--gray-mid)' }}>AI guidance · being reviewed by our medical team</span>
  return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 400, color: 'var(--gray-mid)' }}>⏳ Our medical team is reviewing this</span>
}

export function DashboardAsk() {
  const { user, profile } = useAuth()
  const isNri = profile?.user_type === 'nri'
  const [elder, setElder] = useState<{ id: string; full_name: string } | null>(null)
  const [subject, setSubject] = useState('Myself')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [answer, setAnswer] = useState<{ text: string | null; pending: boolean } | null>(null)
  const [history, setHistory] = useState<Query[]>([])
  const [monthlyCount, setMonthlyCount] = useState(0)

  useEffect(() => {
    if (!user) return
    if (isNri) {
      supabase.from('loved_ones').select('id, full_name').eq('family_user_id', user.id).order('created_at').limit(1).maybeSingle()
        .then(({ data }) => { if (data) setElder(data) })
    }
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function loadHistory() {
    if (!user) return
    const { data } = await supabase.from('member_queries').select('id,question,answer,ai_answer,status,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (data) setHistory(data)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await supabase.from('member_queries').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', startOfMonth)
    setMonthlyCount(count ?? 0)
  }

  async function submit() {
    if (!user || !text.trim()) return
    setSubmitting(true); setAnswer(null)
    const subjectLabel = isNri ? (elder?.full_name || 'my parent') : subject
    const { data, error } = await supabase.functions.invoke('ask-health', {
      body: { question: text.trim(), subject_label: subjectLabel, loved_one_id: isNri ? elder?.id ?? null : null },
    })
    setSubmitting(false)
    if (error) { setAnswer({ text: null, pending: true }); return }
    setAnswer({ text: data?.ai_answer ?? null, pending: !data?.ai_answer })
    setText('')
    loadHistory()
  }

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 8 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: '16px 16px 12px' }}>Ask Close Eye</h1>

      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 'var(--radius-card)', padding: 16, boxShadow: 'var(--shadow-card)' }}>
        <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 10px' }}>
          {isNri ? `Ask anything about ${elder?.full_name || 'your loved one'}'s health` : 'Who is this question about?'}
        </p>
        {!isNri && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {SOCIETY_SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)} style={{
                borderRadius: 100, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: subject === s ? 600 : 400,
                background: subject === s ? 'var(--forest)' : 'var(--cream)', color: subject === s ? '#fff' : 'var(--gray-dark)',
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
          General guidance only — not a diagnosis. For emergencies or serious concerns, please contact a doctor.
        </p>
        {monthlyCount === 4 && (
          <div style={{ background: 'rgba(168,213,181,0.15)', border: '1px solid rgba(168,213,181,0.4)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--forest)', marginBottom: 10 }}>
            You have <strong>1 question left</strong> this month.{' '}
            <Link to="/onboarding" style={{ color: 'var(--forest)', fontWeight: 600 }}>Become a Founding Member →</Link>{' '}
            for continued access.
          </div>
        )}
        {monthlyCount >= 5 ? (
          <div style={{ background: 'var(--cream)', border: '1px solid var(--gray-light)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', margin: '0 0 4px' }}>You've used your 5 free questions this month</p>
            <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '0 0 12px' }}>Founding Members get unlimited access for ₹100 — one-time.</p>
            <Link to="/onboarding" className="ce-btn ce-btn-primary" style={{ display: 'inline-block', padding: '10px 24px', textDecoration: 'none', fontSize: 14 }}>Become a Founding Member →</Link>
          </div>
        ) : (
          <button onClick={submit} disabled={submitting || !text.trim()} className="ce-btn ce-btn-primary ce-btn-full" style={{ padding: 14, opacity: submitting || !text.trim() ? 0.6 : 1 }}>
            {submitting ? <><Loader2 size={16} className="ce-spin" /> Thinking…</> : 'Ask Close Eye →'}
          </button>
        )}
      </div>

      {/* Latest response */}
      {answer && (
        <div className="ce-slide-up" style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--sage)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Logo className="w-5 h-5" />
            <span style={{ fontSize: 13, color: 'var(--gray-mid)' }}>Close Eye</span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--gray-dark)', lineHeight: 1.7, margin: 0 }}>
            {answer.text || 'Thanks — our medical team will review your question and reply shortly. For anything urgent, call 108.'}
          </p>
          <div style={{ marginTop: 12 }}><StatusBadge status={answer.text ? 'ai_answered' : 'pending'} /></div>
          <p style={{ fontSize: 11, color: 'var(--gray-mid)', fontStyle: 'italic', margin: '8px 0 0' }}>General guidance, not a diagnosis. For emergencies or serious concerns, please contact a doctor.</p>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ margin: '16px 16px 0' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.06em', margin: '0 0 8px' }}>PREVIOUS QUESTIONS</p>
          {history.map(q => (
            <div key={q.id} style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: 16, boxShadow: 'var(--shadow-card)', marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', margin: 0 }}>{q.question}</p>
              <p style={{ fontSize: 13, color: 'var(--gray-dark)', lineHeight: 1.6, margin: '8px 0 0' }}>
                {q.answer || q.ai_answer || 'Our medical team is reviewing…'}
              </p>
              <div style={{ marginTop: 10 }}><StatusBadge status={q.status} /></div>
              <p style={{ fontSize: 11, color: 'var(--gray-mid)', fontStyle: 'italic', margin: '8px 0 0' }}>General guidance, not a diagnosis. For emergencies or serious concerns, please contact a doctor.</p>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 && !answer && (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 40 }}>💬</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--black)', margin: '8px 0 0' }}>Ask your first health question</p>
          <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '4px 0 0' }}>Get clear, caring guidance from our medical team — in plain language.</p>
        </div>
      )}
    </div>
  )
}
