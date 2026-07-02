import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Loader2, ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { LogoLockup } from '@/components/ui/Logo'
import { supabase } from '@/lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu
function stripEmoji(t: string) { return t.replace(EMOJI_RE, '').replace(/ {2,}/g, ' ').trim() }

function MarkdownAnswer({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 14, color: '#2d3a32', lineHeight: 1.7 }}>
      <style>{`
        .ce-pub-md ul { margin: 5px 0 8px; padding-left: 18px; list-style-type: disc; }
        .ce-pub-md ol { margin: 5px 0 8px; padding-left: 18px; list-style-type: decimal; }
        .ce-pub-md li { margin: 4px 0; line-height: 1.55; }
        .ce-pub-md p  { margin: 0 0 8px; }
        .ce-pub-md p:last-child { margin-bottom: 0; }
        .ce-pub-md strong { font-weight: 700; color: #0E2A1F; }
        .ce-pub-md em { color: #7a8c82; font-style: italic; }
      `}</style>
      <div className="ce-pub-md">
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface Msg {
  id: string
  role: 'user' | 'assistant'
  text: string | null
  lane?: 'escalate' | 'service' | 'inform'
  ambulanceNumber?: string
  pending?: boolean
  isFirst?: boolean
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Can my father take paracetamol with his BP medicines?',
  "My mother isn't eating well — what can help?",
  'How many hours should someone in their 70s sleep?',
  'My parent fell yesterday — what should I watch out for?',
]

// ── Main component ────────────────────────────────────────────────────────────

export function PublicAskPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const [answerCount, setAnswerCount] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150)
    return () => clearTimeout(t)
  }, [])

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(preset?: string) {
    const q = (preset ?? input).trim()
    if (!q || thinking) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'

    const thinkingId = `t-${Date.now()}`
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: q },
      { id: thinkingId, role: 'assistant', text: null, pending: true },
    ])
    setThinking(true)

    try {
      const { data, error } = await supabase.functions.invoke('ask-health-public', {
        body: { question: q },
      })
      setThinking(false)
      setMessages(prev => prev.filter(m => m.id !== thinkingId))
      if (error || !data) throw new Error('no response')

      const isFirst = answerCount === 0
      setAnswerCount(c => c + 1)
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.message,
        lane: data.lane,
        ambulanceNumber: data.ambulanceNumber,
        isFirst,
      }])
    } catch {
      setThinking(false)
      setMessages(prev => [
        ...prev.filter(m => m.id !== thinkingId),
        { id: `a-${Date.now()}`, role: 'assistant', text: 'Something went wrong — please try again. For any emergency, call 108.', lane: 'inform' },
      ])
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  const hasMessages = messages.length > 0

  return (
    <div style={{ minHeight: '100svh', background: '#F4F6F4', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        html, body { background: #F4F6F4; }
        @keyframes ce-pub-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ce-pub-dot {
          0%,80%,100% { transform: scale(.7); opacity:.5; }
          40%          { transform: scale(1);  opacity:1; }
        }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(14,42,31,0.08)',
      }}>
        {/* Safe-area spacer for notch */}
        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 56, padding: '0 16px',
          maxWidth: 680, margin: '0 auto', width: '100%', boxSizing: 'border-box',
        }}>
          <Link to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <LogoLockup fontSize={18} color="dark" />
          </Link>
          <Link
            to="/auth?mode=signup"
            style={{
              fontSize: 13, fontWeight: 700, color: '#0E2A1F', textDecoration: 'none',
              background: 'rgba(14,42,31,0.07)', padding: '7px 16px', borderRadius: 100,
            }}
          >
            Sign up free
          </Link>
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{
          maxWidth: 680, margin: '0 auto', width: '100%', boxSizing: 'border-box',
          padding: hasMessages
            ? 'max(16px, 16px) 16px calc(128px + env(safe-area-inset-bottom, 0px))'
            : '0 16px calc(128px + env(safe-area-inset-bottom, 0px))',
        }}>

          {/* ── Empty state ─────────────────────────────────────────────────── */}
          {!hasMessages && (
            <div style={{ paddingTop: 32, paddingBottom: 16 }}>
              <h1 style={{
                fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: '#0E2A1F',
                letterSpacing: '-0.03em', lineHeight: 1.2, margin: '0 0 8px',
              }}>
                Ask Close Eye
              </h1>
              <p style={{ fontSize: 15, color: '#6B7A72', margin: '0 0 24px', lineHeight: 1.6 }}>
                Free guidance on your elderly parent's health and medications. No sign-in needed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: 'left', background: '#fff',
                      border: '1px solid rgba(14,42,31,0.12)', borderRadius: 14,
                      padding: '13px 16px', fontSize: 14, color: '#2d3a32',
                      cursor: 'pointer', lineHeight: 1.5, fontFamily: 'inherit',
                      transition: 'background 140ms ease, border-color 140ms ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EFF8F2'; e.currentTarget.style.borderColor = '#A8D5B5' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(14,42,31,0.12)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Messages ────────────────────────────────────────────────────── */}
          {messages.map(msg => {
            // User bubble
            if (msg.role === 'user') {
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <div style={{
                    background: '#0E2A1F', color: '#FAF7F2',
                    borderRadius: '18px 18px 4px 18px',
                    padding: '12px 16px', maxWidth: '80%',
                    fontSize: 15, lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                </div>
              )
            }

            // Escalation card
            if (msg.lane === 'escalate') {
              const num = msg.ambulanceNumber ?? '108'
              return (
                <div key={msg.id} style={{
                  background: 'linear-gradient(135deg,#fff5f5,#fff9f7)',
                  border: '1.5px solid #e8a090', borderRadius: 18,
                  padding: '18px 18px 16px', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#c0734f',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>⚠</div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#7a1f1f', margin: 0 }}>Urgent attention needed</p>
                      <p style={{ fontSize: 12, color: '#a05540', margin: '2px 0 0' }}>Please act on this immediately</p>
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <MarkdownAnswer text={msg.text ?? ''} />
                  </div>
                  <a
                    href={`tel:${num}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: '#c0734f', color: '#fff', fontWeight: 700, fontSize: 15,
                      padding: '13px 20px', borderRadius: 12, textDecoration: 'none', minHeight: 48,
                    }}
                  >
                    📞 Call {num} now
                  </a>
                </div>
              )
            }

            // Pending / normal assistant bubble
            return (
              <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#0E2A1F',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 2,
                  fontSize: 11, fontWeight: 800, color: '#A8D5B5', letterSpacing: '-.01em',
                }}>
                  CE
                </div>
                <div style={{
                  background: '#fff', borderRadius: '4px 18px 18px 18px',
                  padding: '14px 16px', flex: 1,
                  boxShadow: '0 1px 4px rgba(14,42,31,0.08)',
                  border: '1px solid rgba(14,42,31,0.07)',
                }}>
                  {msg.pending ? (
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '3px 0' }}>
                      {[0, 0.2, 0.4].map((d, i) => (
                        <div key={i} style={{
                          width: 7, height: 7, borderRadius: '50%', background: '#b0c8b8',
                          animation: `ce-pub-dot 1.2s ease-in-out ${d}s infinite`,
                        }} />
                      ))}
                    </div>
                  ) : (
                    <>
                      <MarkdownAnswer text={msg.text ?? ''} />

                      {/* Sign-up nudge after first answer */}
                      {msg.isFirst && (
                        <div style={{
                          marginTop: 14, paddingTop: 12,
                          borderTop: '1px solid rgba(14,42,31,0.07)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                        }}>
                          <p style={{ fontSize: 12, color: '#7a8c82', margin: 0, lineHeight: 1.5, flex: 1 }}>
                            Get answers specific to your parent's conditions and medicines.
                          </p>
                          <Link
                            to="/auth?mode=signup"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                              background: '#0E2A1F', color: '#FAF7F2',
                              fontWeight: 700, fontSize: 12,
                              padding: '8px 16px', borderRadius: 100, textDecoration: 'none',
                            }}
                          >
                            Register free <ArrowRight size={12} />
                          </Link>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Fixed input bar ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderTop: '1px solid rgba(14,42,31,0.09)',
        boxShadow: '0 -4px 24px rgba(14,42,31,0.08)',
        zIndex: 200,
        padding: `12px 14px`,
        paddingBottom: `max(env(safe-area-inset-bottom, 0px), 12px)`,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', maxWidth: 680, margin: '0 auto' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKey}
            placeholder="Ask about your parent's health or medications…"
            rows={1}
            style={{
              flex: 1, resize: 'none', overflow: 'hidden',
              background: '#F4F6F4',
              border: '1.5px solid rgba(14,42,31,0.12)',
              borderRadius: 16, padding: '12px 14px',
              fontSize: 16, fontFamily: 'inherit', lineHeight: 1.5,
              outline: 'none', minHeight: 48, maxHeight: 140,
              color: '#0E2A1F', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#2FA84F' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(14,42,31,0.12)' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            aria-label="Send"
            style={{
              width: 48, height: 48, borderRadius: 14, border: 'none', flexShrink: 0,
              cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
              background: input.trim() && !thinking ? '#0E2A1F' : 'rgba(14,42,31,0.10)',
              color: input.trim() && !thinking ? '#FAF7F2' : '#9aada3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {thinking
              ? <Loader2 size={18} style={{ animation: 'ce-pub-spin 1s linear infinite' }} />
              : <Send size={18} />}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#9aada3', margin: '8px auto 0', textAlign: 'center', maxWidth: 680 }}>
          General guidance only · not a diagnosis · call 108 for emergencies
        </p>
      </div>
    </div>
  )
}
