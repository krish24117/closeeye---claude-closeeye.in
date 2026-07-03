import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Send, ChevronDown, ChevronUp } from 'lucide-react'
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

// ── Utilities ──────────────────────────────────────────────────────────────────

const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu
function stripEmoji(t: string) { return t.replace(EMOJI_RE, '').replace(/ {2,}/g, ' ').trim() }

// Strip markdown syntax to produce a plain-text preview — prevents slicing
// through **unclosed bold** or mid-bullet truncation in collapsed cards.
function plainPreview(text: string, maxLen = 240): string {
  const plain = stripEmoji(text)
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')        // *italic* → italic
    .replace(/^[-*]\s+/gm, '• ')        // - bullet → • bullet
    .replace(/#{1,3}\s+/gm, '')         // ## heading → heading
    .replace(/\n{2,}/g, '\n')           // collapse blank lines
    .trim()
  return plain.length > maxLen ? plain.slice(0, maxLen).trimEnd() + '…' : plain
}

function timeAgo(iso: string): string {
  const d = new Date(iso), now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Markdown renderer ──────────────────────────────────────────────────────────

function MarkdownAnswer({ text, size = 14 }: { text: string; size?: number }) {
  return (
    <div style={{ fontSize: size, color: '#2d3a32', lineHeight: 1.7 }}>
      <style>{`
        .ce-md-answer ul { margin: 5px 0 8px; padding-left: 18px; list-style-type: disc; }
        .ce-md-answer ol { margin: 5px 0 8px; padding-left: 18px; list-style-type: decimal; }
        .ce-md-answer li { margin: 4px 0; line-height: 1.55; }
        .ce-md-answer p  { margin: 0 0 8px; }
        .ce-md-answer p:last-child { margin-bottom: 0; }
        .ce-md-answer strong { font-weight: 700; color: #0E2A1F; }
        .ce-md-answer em { color: #7a8c82; font-style: italic; }
      `}</style>
      <div className="ce-md-answer">
        <ReactMarkdown
          components={{
            h1: ({ children }) => <p style={{ fontWeight: 700, marginBottom: 6 }}>{children}</p>,
            h2: ({ children }) => <p style={{ fontWeight: 700, marginBottom: 6 }}>{children}</p>,
            h3: ({ children }) => <p style={{ fontWeight: 600, marginBottom: 4 }}>{children}</p>,
          }}
        >
          {stripEmoji(text)}
        </ReactMarkdown>
      </div>
    </div>
  )
}

// ── Escalation card ────────────────────────────────────────────────────────────

function EscalationCard({ message, ambulanceNumber }: { message: string; ambulanceNumber?: string }) {
  const number = ambulanceNumber ?? '108'
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fff5f5 0%, #fff9f7 100%)',
      border: '1.5px solid #e8a090', borderRadius: 18,
      padding: '18px 18px 16px', margin: '4px 0 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#c0734f', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>⚠️</div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#7a1f1f', margin: 0 }}>Urgent attention needed</p>
          <p style={{ fontSize: 12, color: '#a05540', margin: '2px 0 0' }}>Please act on this immediately</p>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <MarkdownAnswer text={message} size={14} />
      </div>
      <a
        href={`tel:${number}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: '#c0734f', color: '#fff', fontWeight: 700, fontSize: 15,
          padding: '13px 20px', borderRadius: 12, textDecoration: 'none', minHeight: 48,
        }}
      >
        <span style={{ fontSize: 20 }}>📞</span> Call {number} now
      </a>
      <p style={{ fontSize: 11, color: '#9a6050', fontStyle: 'italic', textAlign: 'center', margin: '10px 0 0' }}>
        Don't wait — call now and stay on the line.
      </p>
    </div>
  )
}

// ── History question card ──────────────────────────────────────────────────────

function HistoryCard({ q }: { q: Query }) {
  const [expanded, setExpanded] = useState(false)
  const answerText = q.answer || q.ai_answer || ''
  // Collapsed preview: plain text (no raw asterisks). Expanded: full markdown.
  const isLong = plainPreview(answerText).length >= 240
  const displayText = isLong && !expanded ? null : answerText  // null = show plain preview

  const isReviewed = q.status === 'doctor_reviewed'
  const isPending  = q.status === 'pending'

  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      border: '1px solid rgba(14,42,31,0.08)',
      boxShadow: '0 1px 6px rgba(14,42,31,0.06)',
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Question row */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <p style={{
            fontSize: 14, fontWeight: 700, color: '#0E2A1F',
            margin: 0, lineHeight: 1.4, flex: 1,
          }}>
            {q.question}
          </p>
          <span style={{
            fontSize: 11, color: '#9aada3', fontWeight: 500,
            whiteSpace: 'nowrap', marginTop: 2,
          }}>
            {timeAgo(q.created_at)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(14,42,31,0.06)', margin: '0 16px' }} />

      {/* Answer */}
      <div style={{ padding: '12px 16px 0' }}>
        {isPending ? (
          <p style={{ fontSize: 13, color: '#9aada3', fontStyle: 'italic', margin: 0 }}>
            Being reviewed by our care team…
          </p>
        ) : answerText ? (
          <>
            {/* Collapsed: plain text — no raw asterisks. Expanded: full markdown. */}
            {displayText === null ? (
              <p style={{ fontSize: 13, color: '#2d3a32', lineHeight: 1.65, margin: 0 }}>
                {plainPreview(answerText)}
              </p>
            ) : (
              <MarkdownAnswer text={displayText} size={13} />
            )}
            {isLong && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 600, color: '#2FA84F',
                  background: 'none', border: 'none', padding: '4px 0 0', cursor: 'pointer',
                }}
              >
                {expanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Read full answer</>}
              </button>
            )}
          </>
        ) : null}
      </div>

      {/* Footer strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '10px 16px', marginTop: 12,
        background: isReviewed ? 'rgba(47,168,79,0.06)' : 'rgba(250,247,242,0.9)',
        borderTop: '1px solid rgba(14,42,31,0.06)',
      }}>
        {isReviewed ? (
          <>
            <span style={{ fontSize: 13, color: '#2FA84F' }}>✓</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#2FA84F' }}>
              Reviewed by {q.reviewed_by || 'Close Eye care team'}
            </span>
          </>
        ) : (
          <>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isPending ? '#e8c07a' : '#2FA84F',
            }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#7a8c82' }}>
              {isPending ? 'Pending review' : 'Ask CloseEye AI guidance'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tier badge ─────────────────────────────────────────────────────────────────

function TierBadge({ isFounder, parentName }: { isFounder: boolean; parentName?: string | null }) {
  if (isFounder) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(47,168,79,0.10)', border: '1px solid rgba(47,168,79,0.25)',
        borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#1B7A3E',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2FA84F', flexShrink: 0 }} />
        {parentName ? `For ${parentName}` : 'Founding member'}
      </div>
    )
  }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--cream)', border: '1px solid var(--gray-light)',
      borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--gray-mid)',
    }}>
      Standard ·{' '}
      <Link to="/founding-member/checkout" style={{ color: 'var(--forest)', fontWeight: 700, textDecoration: 'none' }}>
        Upgrade →
      </Link>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardAsk() {
  const { user, profile } = useAuth()
  const isFounder = !!profile?.is_founding_member
  const isNri     = profile?.user_type === 'nri'

  const [elder, setElder]               = useState<{ id: string; full_name: string; city?: string } | null>(null)
  const [subject, setSubject]           = useState('My Parent')
  const [messages, setMessages]         = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [inputText, setInputText]       = useState('')
  const [thinking, setThinking]         = useState(false)
  const [history, setHistory]           = useState<Query[]>([])
  const [monthlyCount, setMonthlyCount] = useState(0)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)

  const SOCIETY_SUBJECTS = ['Myself', 'My Parent', 'Partner', 'Other']

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
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
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

  const firstName = profile?.full_name?.split(' ')[0] || ''
  const placeholder = isNri
    ? (pcopy?.askInputHint || (elder ? `e.g. Can ${elder.full_name.split(' ')[0]} take paracetamol with BP meds?` : 'Ask about your parent\'s health…'))
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
      const errText = !navigator.onLine
        ? 'No internet connection. Please check your connection and try again.'
        : "Something went wrong. Please try again in a moment."
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: errText }])
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 'calc(152px + env(safe-area-inset-bottom))', minHeight: '100%', background: '#f4f6f4' }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        padding: '14px 16px 14px',
        borderBottom: '1px solid rgba(14,42,31,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0E2A1F', margin: 0, letterSpacing: '-0.01em' }}>
            Ask Close Eye
          </h1>
          {firstName && (
            <p style={{ fontSize: 12, color: '#7a8c82', margin: '2px 0 0' }}>
              {isFounder ? `Personalised guidance for your family` : `General guidance · 5 questions/month`}
            </p>
          )}
        </div>
        <TierBadge isFounder={isFounder} parentName={isNri ? elder?.full_name : null} />
      </div>

      {/* ── Subject selector (society users) ────────────────────────────────── */}
      {!isNri && (
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0', overflowX: 'auto' }}>
          {SOCIETY_SUBJECTS.map(s => (
            <button key={s} onClick={() => setSubject(s)} style={{
              borderRadius: 100, padding: '7px 16px', fontSize: 13,
              cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: subject === s ? 700 : 400,
              background: subject === s ? '#0E2A1F' : '#fff',
              color: subject === s ? '#fff' : '#4a6255',
              border: subject === s ? 'none' : '1px solid rgba(14,42,31,0.15)',
              flexShrink: 0,
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* ── Chat thread ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 14px 0' }}>

        {/* Welcome bubble — before first message */}
        {messages.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: '#0E2A1F',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ filter: 'brightness(0) invert(1)' }}><Logo className="w-4 h-4" /></div>
            </div>
            <div style={{
              background: '#fff', borderRadius: '4px 18px 18px 18px',
              padding: '13px 16px', flex: 1,
              boxShadow: '0 1px 4px rgba(14,42,31,0.08)',
              border: '1px solid rgba(14,42,31,0.07)',
            }}>
              <p style={{ fontSize: 14, color: '#2d3a32', lineHeight: 1.6, margin: 0 }}>
                {isFounder && elder?.full_name
                  ? `Hi — ask me anything about ${elder.full_name}'s wellbeing, daily routine, or any concerns. I'll give you a clear, direct answer.`
                  : `Hi${firstName ? ` ${firstName}` : ''} — ask me about your loved one's wellbeing or daily routine. I give clear, concise guidance.`}
              </p>
              {!isFounder && (
                <div style={{
                  marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(14,42,31,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 12, color: '#9aada3' }}>
                    {5 - monthlyCount} of 5 questions remaining
                  </span>
                  <Link to="/founding-member/checkout" style={{ fontSize: 12, fontWeight: 700, color: '#2FA84F', textDecoration: 'none' }}>
                    Get unlimited →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(msg => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <div style={{
                  background: '#0E2A1F', color: '#FAF7F2',
                  borderRadius: '18px 18px 4px 18px',
                  padding: '11px 16px', maxWidth: '78%',
                  fontSize: 15, lineHeight: 1.5,
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
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', background: '#0E2A1F',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
              }}>
                <div style={{ filter: 'brightness(0) invert(1)' }}><Logo className="w-4 h-4" /></div>
              </div>
              <div style={{
                background: '#fff', borderRadius: '4px 18px 18px 18px',
                padding: '14px 16px', maxWidth: '83%',
                boxShadow: '0 1px 4px rgba(14,42,31,0.08)',
                border: '1px solid rgba(14,42,31,0.07)',
              }}>
                {msg.pending ? (
                  /* Typing indicator */
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#b0c8b8',
                        animation: `ce-dot-bounce 1.2s ease-in-out ${d}s infinite`,
                      }} />
                    ))}
                    <style>{`
                      @keyframes ce-dot-bounce {
                        0%,80%,100% { transform: scale(.7); opacity:.5; }
                        40%         { transform: scale(1);   opacity:1; }
                      }
                    `}</style>
                  </div>
                ) : (
                  <>
                    <MarkdownAnswer text={msg.text || 'Something went wrong. Please try again. For anything urgent, call 108.'} />
                    {!isFounder && msg.id === firstRealAssistantId && (
                      <div style={{
                        marginTop: 12, paddingTop: 10,
                        borderTop: '1px solid rgba(14,42,31,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: 12, color: '#7a8c82' }}>Personalise this for your parent</span>
                        <Link to="/founding-member/checkout" style={{ fontSize: 12, fontWeight: 700, color: '#2FA84F', textDecoration: 'none' }}>
                          Upgrade →
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
          <div style={{
            background: 'rgba(47,168,79,0.08)', borderRadius: 14,
            padding: '12px 16px', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, color: '#1B7A3E', fontWeight: 600 }}>Last free question this month</span>
            <Link to="/founding-member/checkout" style={{ fontSize: 13, fontWeight: 700, color: '#1B7A3E', textDecoration: 'none' }}>
              Upgrade →
            </Link>
          </div>
        )}

        {/* ── Recent history — shown in empty state ────────────────────────── */}
        {messages.length === 0 && history.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(14,42,31,0.10)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9aada3', letterSpacing: '0.06em' }}>
                RECENT QUESTIONS
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(14,42,31,0.10)' }} />
            </div>
            {history.map(q => <HistoryCard key={q.id} q={q} />)}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Fixed input bar ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(60px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        background: '#fff',
        borderTop: '1px solid rgba(14,42,31,0.09)',
        padding: '10px 14px 8px',
        zIndex: 200,
        boxShadow: '0 -4px 24px rgba(14,42,31,0.08)',
      }}>
        {atCap ? (
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0E2A1F', margin: '0 0 6px' }}>
              5 free questions used this month
            </p>
            <p style={{ fontSize: 12, color: '#7a8c82', margin: '0 0 8px' }}>
              Renew on the 1st, or unlock unlimited now.
            </p>
            <Link to="/founding-member/checkout" style={{
              display: 'inline-block', background: '#0E2A1F', color: '#FAF7F2',
              fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 999,
              textDecoration: 'none',
            }}>
              Become a Founding Member →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={autoResize}
                onKeyDown={handleKey}
                placeholder={placeholder}
                rows={2}
                style={{
                  flex: 1, resize: 'none', overflow: 'hidden',
                  background: '#f4f6f4',
                  border: '1.5px solid rgba(14,42,31,0.12)',
                  borderRadius: 16, padding: '14px 16px',
                  fontSize: 16, fontFamily: 'inherit', lineHeight: 1.5,
                  outline: 'none', minHeight: 64, color: '#0E2A1F',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#2FA84F' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(14,42,31,0.12)' }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || thinking}
                aria-label="Send"
                style={{
                  width: 52, height: 52, borderRadius: 14, border: 'none',
                  cursor: inputText.trim() && !thinking ? 'pointer' : 'not-allowed',
                  background: inputText.trim() && !thinking ? '#0E2A1F' : 'rgba(14,42,31,0.10)',
                  color: inputText.trim() && !thinking ? '#FAF7F2' : '#9aada3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s, color 0.15s', flexShrink: 0,
                }}
              >
                {thinking ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9aada3', margin: '7px 2px 0', textAlign: 'center' }}>
              General guidance only · always call 108 in an emergency
            </p>
          </>
        )}
      </div>
    </div>
  )
}
