import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'

interface Query {
  id: string; question: string; answer: string | null; ai_answer: string | null
  status: string; created_at: string; reviewed_by: string | null
}

// ── Tier badge ─────────────────────────────────────────────────────────────

function TierBadge({ isFounder, parentName }: { isFounder: boolean; parentName?: string | null }) {
  if (isFounder) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'rgba(14,42,31,.06)', border: '1px solid rgba(168,213,181,.5)',
        borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 600, color: 'var(--forest)',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage-2)', flexShrink: 0 }} />
        {parentName ? `Personalised for ${parentName}` : 'Personalised · Founding member'}
      </div>
    )
  }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      background: 'var(--cream)', border: '1px solid var(--gray-light)',
      borderRadius: 999, padding: '5px 13px', fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)',
    }}>
      General guidance ·
      <Link to="/founding-member" style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'none' }}>
        Unlock personalised →
      </Link>
    </div>
  )
}

// ── Escalation response ────────────────────────────────────────────────────

function EscalationCard({ message, ambulanceNumber }: { message: string; ambulanceNumber?: string }) {
  const number = ambulanceNumber ?? '108'
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #c0734f',
      borderRadius: 14, padding: '16px 18px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>⚠</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#7a1f1f' }}>This needs urgent attention</span>
      </div>
      <p style={{ fontSize: 14, color: '#3d1010', lineHeight: 1.6, margin: '0 0 14px' }}
        dangerouslySetInnerHTML={{ __html: message.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
      />
      <a
        href={`tel:${number}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: '#c0734f', color: '#fff', fontWeight: 700, fontSize: 14,
          padding: '11px 20px', borderRadius: 999, textDecoration: 'none', minHeight: 44,
        }}
      >
        Call {number} — Ambulance
      </a>
      <p style={{ fontSize: 11, color: '#7a4a32', fontStyle: 'italic', marginTop: 10, marginBottom: 0 }}>
        For any emergency, call professional help immediately. Don't wait.
      </p>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status, reviewedBy }: { status: string; reviewedBy?: string | null }) {
  if (status === 'doctor_reviewed')
    return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--forest)', background: 'rgba(14,42,31,0.06)', borderRadius: 100, padding: '4px 12px' }}>✓ Reviewed by {reviewedBy || 'Close Eye medical team'}</span>
  if (status === 'ai_answered')
    return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, color: 'var(--gray-mid)' }}>AI guidance — guided by our medical team</span>
  return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 400, color: 'var(--gray-mid)' }}>⏳ Our medical team is reviewing this</span>
}

// ── Main component ────────────────────────────────────────────────────────

export function DashboardAsk() {
  const { user, profile } = useAuth()
  const isFounder = !!profile?.is_founding_member
  const isNri     = profile?.user_type === 'nri'

  const [elder, setElder]         = useState<{ id: string; full_name: string } | null>(null)
  const [subject, setSubject]     = useState('Myself')
  const [text, setText]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [answer, setAnswer]       = useState<{
    text: string | null; pending: boolean; lane?: string; ambulanceNumber?: string
  } | null>(null)
  const [history, setHistory]     = useState<Query[]>([])
  const [monthlyCount, setMonthlyCount] = useState(0)

  const SOCIETY_SUBJECTS = ['Myself', 'My Child', 'My Parent', 'Partner']

  useEffect(() => {
    if (!user) return
    if (isNri) {
      supabase.from('loved_ones').select('id, full_name').eq('family_user_id', user.id)
        .order('created_at').limit(1).maybeSingle()
        .then(({ data }) => { if (data) setElder(data) })
    }
    loadHistory()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadHistory() {
    if (!user) return
    const { data } = await supabase.from('member_queries')
      .select('id,question,answer,ai_answer,status,reviewed_by,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    if (data) setHistory(data)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await supabase.from('member_queries')
      .select('id', { count: 'exact', head: true })
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
    if (error) {
      setAnswer({ text: null, pending: true })
      return
    }
    // Handle escalation responses
    if (data?.lane === 'escalate') {
      setAnswer({ text: data.message ?? null, pending: false, lane: 'escalate', ambulanceNumber: data.escalation?.ambulanceNumber })
    } else {
      setAnswer({ text: data?.ai_answer ?? data?.message ?? null, pending: !data?.ai_answer && !data?.message })
    }
    setText('')
    loadHistory()
  }

  // Free cap: 5/month for non-founders; founders have no cap (edge function handles it)
  const atCap = !isFounder && monthlyCount >= 5
  const nearCap = !isFounder && monthlyCount === 4

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 8 }}>

      {/* Header + tier badge */}
      <div style={{ margin: '16px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Ask Close Eye</h1>
        <TierBadge isFounder={isFounder} parentName={isNri ? elder?.full_name : null} />
      </div>

      {/* Ask box */}
      <div style={{ margin: '0 16px', background: '#fff', borderRadius: 'var(--radius-card)', padding: 16, boxShadow: 'var(--shadow-card)' }}>

        {/* Tier context */}
        {isNri && elder ? (
          <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 10px' }}>
            {isFounder
              ? `Asking about ${elder.full_name} — personalised to their history`
              : `General guidance about ${elder.full_name} · Register as a Founding Member for personalised answers`}
          </p>
        ) : !isNri && (
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
          placeholder={isNri
            ? (elder ? `e.g. Is it okay to give ${elder.full_name.split(' ')[0]} paracetamol with BP medicine?` : 'e.g. Is it okay to give paracetamol with BP medicine?')
            : 'e.g. My child has had a fever for 2 days…'
          }
          disabled={atCap}
          style={{ width: '100%', minHeight: 90, resize: 'none', background: 'var(--cream)', border: '1px solid var(--gray-light)', borderRadius: 12, padding: '14px 16px', fontSize: 16, fontFamily: 'inherit', opacity: atCap ? 0.6 : 1 }}
        />
        <p style={{ fontSize: 11, color: 'var(--gray-mid)', fontStyle: 'italic', margin: '8px 0 12px' }}>
          General guidance only — not a diagnosis. For emergencies, call 108.
        </p>

        {/* Near-cap warning */}
        {nearCap && (
          <div style={{ background: 'rgba(168,213,181,0.15)', border: '1px solid rgba(168,213,181,0.4)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--forest)', marginBottom: 10 }}>
            You have <strong>1 question left</strong> this month.{' '}
            <Link to="/founding-member" style={{ color: 'var(--forest)', fontWeight: 600 }}>Become a Founding Member →</Link>{' '}
            for unlimited personalised answers.
          </div>
        )}

        {/* Cap reached */}
        {atCap ? (
          <div style={{ background: 'var(--cream)', border: '1px solid var(--gray-light)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', margin: '0 0 4px' }}>
              You've used your 5 free questions this month
            </p>
            <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Founding Members get personalised answers, unlimited questions, and priority care — for ₹100 once.
            </p>
            <Link to="/founding-member" className="ce-btn ce-btn-primary" style={{ display: 'inline-block', padding: '10px 24px', textDecoration: 'none', fontSize: 14 }}>
              Become a Founding Member →
            </Link>
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={submitting || !text.trim()}
            className="ce-btn ce-btn-primary ce-btn-full"
            style={{ padding: 14, opacity: submitting || !text.trim() ? 0.6 : 1 }}
          >
            {submitting ? <><Loader2 size={16} className="ce-spin" /> Thinking…</> : 'Ask Close Eye →'}
          </button>
        )}
      </div>

      {/* Latest response */}
      {answer && (
        <div className="ce-slide-up" style={{ margin: '12px 16px 0' }}>
          {answer.lane === 'escalate' ? (
            <EscalationCard message={answer.text ?? ''} ambulanceNumber={answer.ambulanceNumber} />
          ) : (
            <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)', borderLeft: '3px solid var(--sage)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Logo className="w-5 h-5" />
                <span style={{ fontSize: 13, color: 'var(--gray-mid)' }}>
                  Close Eye{isFounder && elder ? ` · for ${elder.full_name}` : ''}
                </span>
              </div>
              <p style={{ fontSize: 15, color: 'var(--gray-dark)', lineHeight: 1.7, margin: 0 }}>
                {answer.text || 'Thanks — our medical team will review your question and reply shortly. For anything urgent, call 108.'}
              </p>
              <div style={{ marginTop: 12 }}>
                <StatusBadge status={answer.text ? 'ai_answered' : 'pending'} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--gray-mid)', fontStyle: 'italic', margin: '8px 0 0' }}>
                General guidance, not a diagnosis. For emergencies or serious concerns, please contact a doctor.
              </p>
              {/* Upgrade nudge for non-founders */}
              {!isFounder && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(168,213,181,.1)', border: '1px solid rgba(168,213,181,.4)', borderRadius: 10, fontSize: 12.5, color: 'var(--forest)' }}>
                  Want this answer personalised to your parent's conditions and medicines?{' '}
                  <Link to="/founding-member" style={{ fontWeight: 700, color: 'var(--forest)' }}>
                    Become a Founding Member for ₹100 →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ margin: '16px 16px 0' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.06em', margin: '0 0 8px' }}>PREVIOUS QUESTIONS</p>
          {history.map(q => (
            <div key={q.id} style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: 16, boxShadow: 'var(--shadow-card)', marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', margin: 0 }}>{q.question}</p>
              <p style={{ fontSize: 13, color: 'var(--gray-dark)', lineHeight: 1.6, margin: '8px 0 0' }}>
                {q.answer || q.ai_answer || 'Our medical team is reviewing…'}
              </p>
              <div style={{ marginTop: 10 }}><StatusBadge status={q.status} reviewedBy={q.reviewed_by} /></div>
              <p style={{ fontSize: 11, color: 'var(--gray-mid)', fontStyle: 'italic', margin: '8px 0 0' }}>General guidance, not a diagnosis.</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && !answer && (
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: 40 }}>💬</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--black)', margin: '8px 0 0' }}>Ask your first health question</p>
          <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '4px 0 0' }}>
            {isFounder
              ? `Personalised guidance for ${elder?.full_name ?? 'your loved one'}, in plain language.`
              : 'Get clear, caring guidance from our medical team — in plain language.'}
          </p>
        </div>
      )}
    </div>
  )
}
