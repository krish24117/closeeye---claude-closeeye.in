import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { getPersona, getPersonaCopy } from '@/lib/persona'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string | null
  pending?: boolean
  lane?: string
  ambulanceNumber?: string
}

interface Query {
  id: string; question: string; answer: string | null; ai_answer: string | null
  status: string; created_at: string; reviewed_by: string | null
}

// ── Strip emoji — safety net on top of the "no emojis" system prompt rule ─────
const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu
function stripEmoji(t: string) { return t.replace(EMOJI_RE, '').replace(/ {2,}/g, ' ').trim() }

// ── Markdown renderer — used for all AI answer text ───────────────────────────
function MarkdownAnswer({ text, fontSize = 14 }: { text: string; fontSize?: number }) {
  return (
    <div style={{ fontSize, color: 'var(--gray-dark)', lineHeight: 1.65 }}>
      <ReactMarkdown
        components={{
          p:      ({ children }) => (
            <p style={{ margin: '0 0 7px', lineHeight: 1.65, lastChild: undefined } as React.CSSProperties}>{children}</p>
          ),
          ul:     ({ children }) => (
            <ul style={{ margin: '4px 0 7px', paddingLeft: 20 }}>{children}</ul>
          ),
          ol:     ({ children }) => (
            <ol style={{ margin: '4px 0 7px', paddingLeft: 20 }}>{children}</ol>
          ),
          li:     ({ children }) => (
            <li style={{ margin: '4px 0', lineHeight: 1.55 }}>{children}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: 'var(--black)' }}>{children}</strong>
          ),
          em:     ({ children }) => (
            <em style={{ color: 'var(--gray-mid)', fontStyle: 'italic' }}>{children}</em>
          ),
          // Flatten headings — model shouldn't produce them, but handle gracefully
          h1: ({ children }) => <p style={{ margin: '0 0 7px', fontWeight: 700 }}>{children}</p>,
          h2: ({ children }) => <p style={{ margin: '0 0 7px', fontWeight: 700 }}>{children}</p>,
          h3: ({ children }) => <p style={{ margin: '0 0 5px', fontWeight: 600 }}>{children}</p>,
        }}
      >
        {stripEmoji(text)}
      </ReactMarkdown>
    </div>
  )
}

// ── Tier badge ─────────────────────────────────────────────────────────────────

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
      General guidance ·{' '}
      <Link to="/founding-member" style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'none' }}>
        Unlock personalised →
      </Link>
    </div>
  )
}

// ── Escalation card ────────────────────────────────────────────────────────────

function EscalationCard({ message, ambulanceNumber }: { message: string; ambulanceNumber?: string }) {
  const number = ambulanceNumber ?? '108'
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #c0734f',
      borderRadius: 14, padding: '16px 18px', margin: '4px 0 8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>⚠</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#7a1f1f' }}>This needs urgent attention</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <MarkdownAnswer text={message} fontSize={14} />
      </div>
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

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, reviewedBy }: { status: string; reviewedBy?: string | null }) {
  if (status === 'doctor_reviewed')
    return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: 'var(--forest)', background: 'rgba(14,42,31,0.06)', borderRadius: 100, padding: '4px 12px' }}>✓ Reviewed by {reviewedBy || 'Close Eye medical team'}</span>
  if (status === 'ai_answered')
    return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, color: 'var(--gray-mid)' }}>Guided by our medical team</span>
  return <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 400, color: 'var(--gray-mid)' }}>⏳ Our medical team is reviewing this</span>
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardAsk() {
  const { user, profile } = useAuth()
  const isFounder = !!profile?.is_founding_member
  const isNri     = profile?.user_type === 'nri'

  const [elder, setElder]               = useState<{ id: string; full_name: string; city?: string } | null>(null)
  const [subject, setSubject]           = useState('Myself')
  const [messages, setMessages]         = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [inputText, setInputText]       = useState('')
  const [thinking, setThinking]         = useState(false)
  const [history, setHistory]           = useState<Query[]>([])
  const [monthlyCount, setMonthlyCount] = useState(0)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  const SOCIETY_SUBJECTS = ['Myself', 'My Child', 'My Parent', 'Partner']

  useEffect(() => {
    if (!user) return
    if (isNri) {
      supabase.from('loved_ones').select('id, full_name, city').eq('family_user_id', user.id)
        .order('created_at').limit(1).maybeSingle()
        .then(({ data }) => { if (data) setElder(data as { id: string; full_name: string; city?: string }) })
    }
    loadHistory()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadHistory() {
    if (!user) return
    const { data } = await supabase.from('member_queries')
      .select('id,question,answer,ai_answer,status,reviewed_by,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
    if (data) setHistory(data)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await supabase.from('member_queries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', startOfMonth)
    setMonthlyCount(count ?? 0)
  }

  const atCap       = !isFounder && monthlyCount >= 5
  const nearCap     = !isFounder && monthlyCount === 4
  const subjectLabel = isNri ? (elder?.full_name || 'my parent') : subject

  const persona = isNri ? getPersona(profile?.country, elder?.city) : null
  const pcopy   = isNri && persona
    ? getPersonaCopy(persona, { parentName: elder?.full_name, parentCity: elder?.city, userCity: profile?.country ?? undefined })
    : null

  const placeholder = isNri
    ? (pcopy?.askInputHint || (elder ? `e.g. Is it okay to give ${elder.full_name.split(' ')[0]} paracetamol with BP medicine?` : 'Ask about your parent\'s health…'))
    : `Ask about ${subject.toLowerCase()}'s health…`

  async function sendMessage() {
    if (!user || !inputText.trim() || thinking || atCap) return

    const userText = inputText.trim()
    setInputText('')
    if (inputRef.current) { inputRef.current.style.height = 'auto' }

    const thinkingId = `thinking-${Date.now()}`

    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: userText },
      { id: thinkingId, role: 'assistant', text: null, pending: true },
    ])
    setThinking(true)

    const historyMessages = messages
      .filter(m => m.text && !m.pending && m.lane !== 'escalate')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text as string }))
    historyMessages.push({ role: 'user', content: userText })

    const { data, error } = await supabase.functions.invoke('ask-health', {
      body: {
        question: userText,
        subject_label: subjectLabel,
        loved_one_id: isNri ? elder?.id ?? null : null,
        ...(conversationId ? { conversation_id: conversationId } : {}),
        messages: historyMessages,
      },
    })

    setThinking(false)
    setMessages(prev => prev.filter(m => m.id !== thinkingId))

    if (error) {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: null, pending: true }])
      return
    }

    if (data?.lane === 'escalate') {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`, role: 'assistant',
        text: data.message ?? null, lane: 'escalate',
        ambulanceNumber: data.escalation?.ambulanceNumber,
      }])
    } else {
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`, role: 'assistant',
        text: data?.ai_answer ?? null,
        pending: !data?.ai_answer && !data?.message,
      }])
      if (!conversationId && data?.query_id) setConversationId(data.query_id)
    }

    loadHistory()
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const firstRealAssistantId = messages.find(m => m.role === 'assistant' && !m.pending && m.text)?.id

  return (
    <div style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}>

      {/* Header */}
      <div style={{ margin: '16px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Ask Close Eye</h1>
        <TierBadge isFounder={isFounder} parentName={isNri ? elder?.full_name : null} />
      </div>

      {/* Society subject selector */}
      {!isNri && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 16px', marginBottom: 10 }}>
          {SOCIETY_SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)} style={{
              borderRadius: 100, padding: '7px 15px', fontSize: 13, cursor: 'pointer',
              fontWeight: subject === s ? 600 : 400,
              background: subject === s ? 'var(--forest)' : 'var(--cream)',
              color: subject === s ? '#fff' : 'var(--gray-dark)',
              border: subject === s ? 'none' : '1px solid var(--gray-light)',
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Chat thread */}
      <div style={{ padding: '0 12px' }}>

        {/* Welcome bubble */}
        {messages.length === 0 && (
          <div className="ce-slide-up" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
            <div style={{ flexShrink: 0, marginTop: 3 }}><Logo className="w-5 h-5" /></div>
            <div style={{
              background: '#fff', borderRadius: '4px 18px 18px 18px',
              padding: '13px 16px', boxShadow: 'var(--shadow-card)',
              borderLeft: '3px solid var(--sage)', maxWidth: '85%',
            }}>
              <p style={{ fontSize: 15, color: 'var(--gray-dark)', lineHeight: 1.6, margin: 0 }}>
                {isFounder && elder?.full_name
                  ? `Hi — ask me anything about ${elder.full_name}'s health, medications, or daily wellbeing. I'm here to help.`
                  : 'Hi — ask me anything about your loved one\'s health, medications, or daily wellbeing. I\'m here to help.'}
              </p>
              {!isFounder && (
                <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '8px 0 0' }}>
                  General guidance ·{' '}
                  <Link to="/founding-member" style={{ color: 'var(--forest)', fontWeight: 600 }}>
                    Get personalised answers →
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <div style={{
                  background: 'var(--forest)', color: '#fff',
                  borderRadius: '18px 18px 4px 18px',
                  padding: '11px 16px', maxWidth: '80%', fontSize: 15, lineHeight: 1.5,
                }}>
                  {msg.text}
                </div>
              </div>
            )
          }

          if (msg.lane === 'escalate') {
            return <EscalationCard key={msg.id} message={msg.text ?? ''} ambulanceNumber={msg.ambulanceNumber} />
          }

          return (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
              <div style={{ flexShrink: 0, marginTop: 3 }}><Logo className="w-5 h-5" /></div>
              <div style={{
                background: '#fff', borderRadius: '4px 18px 18px 18px',
                padding: '14px 16px', maxWidth: '85%', boxShadow: 'var(--shadow-card)',
              }}>
                {msg.pending ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Loader2 size={14} className="ce-spin" style={{ color: 'var(--sage)' }} />
                    <span style={{ fontSize: 13, color: 'var(--gray-mid)' }}>Thinking…</span>
                  </div>
                ) : (
                  <>
                    {/* Markdown renders bold bullets, italic disclaimer — no raw asterisks */}
                    <MarkdownAnswer
                      text={msg.text || 'Our medical team will review this shortly. For anything urgent, call 108.'}
                    />
                    {!isFounder && msg.id === firstRealAssistantId && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gray-light)', fontSize: 12.5, color: 'var(--forest)' }}>
                        Want this personalised to your parent's conditions?{' '}
                        <Link to="/founding-member" style={{ fontWeight: 700, color: 'var(--forest)' }}>
                          Founding Member →
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {/* Near-cap warning */}
        {nearCap && messages.length > 0 && (
          <div style={{ background: 'rgba(168,213,181,0.15)', border: '1px solid rgba(168,213,181,0.4)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'var(--forest)', marginBottom: 8 }}>
            <strong>1 question left</strong> this month.{' '}
            <Link to="/founding-member" style={{ color: 'var(--forest)', fontWeight: 600 }}>
              Become a Founding Member →
            </Link>{' '}for unlimited personalised answers.
          </div>
        )}

        {/* Previous questions — visible only in the empty-chat state */}
        {messages.length === 0 && history.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', letterSpacing: '0.06em', margin: '0 4px 10px' }}>
              PREVIOUS QUESTIONS
            </p>
            {history.map(q => (
              <div key={q.id} style={{
                background: '#fff', borderRadius: 'var(--radius-card)',
                padding: '16px 16px 12px', boxShadow: 'var(--shadow-card)', marginBottom: 10,
              }}>
                {/* Question title */}
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', margin: '0 0 10px', lineHeight: 1.4 }}>
                  {q.question}
                </p>
                {/* Answer — rendered as markdown */}
                {(q.answer || q.ai_answer) ? (
                  <MarkdownAnswer text={q.answer || q.ai_answer!} />
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: 0, fontStyle: 'italic' }}>
                    Our medical team is reviewing this…
                  </p>
                )}
                {/* Footer */}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--gray-light)' }}>
                  <StatusBadge status={q.status} reviewedBy={q.reviewed_by} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Fixed input bar ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        background: '#fff',
        borderTop: '1px solid var(--gray-light)',
        padding: '8px 12px 6px',
        zIndex: 200,
        boxShadow: '0 -2px 16px rgba(14,42,31,0.07)',
      }}>
        {atCap ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)', margin: '0 0 5px' }}>
              5 free questions used this month
            </p>
            <Link to="/founding-member" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 700 }}>
              Become a Founding Member for unlimited questions →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={autoResize}
                onKeyDown={handleKey}
                placeholder={placeholder}
                rows={1}
                style={{
                  flex: 1, resize: 'none', overflow: 'hidden',
                  background: 'var(--cream)', border: '1px solid var(--gray-light)',
                  borderRadius: 20, padding: '10px 16px',
                  fontSize: 15, fontFamily: 'inherit', lineHeight: 1.4,
                  outline: 'none', minHeight: 42,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || thinking}
                aria-label="Send"
                style={{
                  width: 42, height: 42, borderRadius: '50%', border: 'none',
                  cursor: inputText.trim() && !thinking ? 'pointer' : 'default',
                  background: inputText.trim() && !thinking ? 'var(--forest)' : 'var(--gray-light)',
                  color: inputText.trim() && !thinking ? '#fff' : 'var(--gray-mid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.18s, color 0.18s', flexShrink: 0,
                }}
              >
                {thinking ? <Loader2 size={18} className="ce-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--gray-mid)', fontStyle: 'italic', margin: '5px 4px 0' }}>
              General guidance only — not a diagnosis. For emergencies, call 108.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
