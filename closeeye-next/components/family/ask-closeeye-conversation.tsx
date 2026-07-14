'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarPlus, Loader2, MessageCircle, Send, Sparkles, Phone, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/choice'
import { Overlay } from '@/components/family/overlay'
import { MarkdownAnswer } from '@/components/family/markdown-answer'
import { askCloseEye, fetchAskHistory, type AskTurn, type AskHistoryItem } from '@/lib/db/ask'
import { cn } from '@/lib/utils'

const ACK_KEY = 'ce_ask_privacy_ack_v1'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  text: string | null
  pending?: boolean
  escalate?: boolean
  ambulanceNumber?: string
  /** A plain system line (cap / pending / error) — rendered without markdown chrome. */
  notice?: boolean
}

export function AskCloseEyeConversation({ initialQuestion }: { initialQuestion?: string }) {
  const { user } = useAuth()
  const { lovedOnes } = useFamilyData()

  const [subjectId, setSubjectId] = React.useState<string | null>(null) // loved_one id, or null = general
  const [msgs, setMsgs] = React.useState<ChatMsg[]>([])
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [input, setInput] = React.useState('')
  const [thinking, setThinking] = React.useState(false)
  const [history, setHistory] = React.useState<AskHistoryItem[]>([])
  const [ackOpen, setAckOpen] = React.useState(false)

  const idRef = React.useRef(0)
  const pendingSend = React.useRef<string | null>(null)
  const startedRef = React.useRef(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const nextId = () => `m${idRef.current++}`

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function doSend(raw: string) {
    const q = raw.trim()
    if (!q || thinking || !user?.id) return

    // Privacy notice before the first medical question.
    if (typeof window !== 'undefined' && !localStorage.getItem(ACK_KEY)) {
      pendingSend.current = q
      setAckOpen(true)
      return
    }

    setInput('')
    const priorTurns: AskTurn[] = msgs
      .filter((m) => m.text && !m.pending && !m.escalate && !m.notice)
      .map((m) => ({ role: m.role, content: m.text as string }))

    const thinkingId = nextId()
    setMsgs((p) => [
      ...p,
      { id: nextId(), role: 'user', text: q },
      { id: thinkingId, role: 'assistant', text: null, pending: true },
    ])
    setThinking(true)

    // Patient context is now built server-side in ask-health (trusted, always present),
    // so the client only needs to name the subject.
    const lovedOneId = subjectId
    const subjectLabel = subjectId ? (lovedOnes.find((l) => l.id === subjectId)?.full_name ?? null) : null

    const res = await askCloseEye({ question: q, subjectLabel, lovedOneId, conversationId, priorTurns })

    setThinking(false)
    setMsgs((p) => p.filter((m) => m.id !== thinkingId))

    if (res.kind === 'escalate') {
      setMsgs((p) => [...p, { id: nextId(), role: 'assistant', text: res.text, escalate: true, ambulanceNumber: res.ambulanceNumber }])
    } else if (res.kind === 'answer') {
      setMsgs((p) => [...p, { id: nextId(), role: 'assistant', text: res.text }])
      if (!conversationId && res.queryId) setConversationId(res.queryId)
    } else if (res.kind === 'pending') {
      setMsgs((p) => [
        ...p,
        { id: nextId(), role: 'assistant', notice: true, text: 'Thank you — someone from Close Eye will review this and follow up shortly. For anything urgent, call 108.' },
      ])
      if (!conversationId && res.queryId) setConversationId(res.queryId)
    } else {
      // capped or error — both carry a friendly notice.
      setMsgs((p) => [...p, { id: nextId(), role: 'assistant', notice: true, text: res.notice ?? 'Something went wrong. Please try again.' }])
    }

    if (user?.id) fetchAskHistory(user.id).then(setHistory).catch(() => {})
  }

  function acknowledgePrivacy() {
    try {
      localStorage.setItem(ACK_KEY, '1')
    } catch {
      /* ignore */
    }
    setAckOpen(false)
    const q = pendingSend.current
    pendingSend.current = null
    if (q) void doSend(q)
  }

  // Load history + auto-send the queued question once we have a user.
  React.useEffect(() => {
    if (!user?.id || startedRef.current) return
    startedRef.current = true
    fetchAskHistory(user.id).then(setHistory).catch(() => {})
    if (initialQuestion?.trim()) void doSend(initialQuestion.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const empty = msgs.length === 0
  // The most recent real answer — where we offer the "next steps" (integration
  // hooks into the existing Book-a-visit + care-team conversation).
  const lastAnswerId = (() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (m && m.role === 'assistant' && !m.pending && !m.notice && !m.escalate && m.text) return m.id
    }
    return null
  })()

  return (
    <div className="flex flex-col gap-4">
      {/* Who is this about? */}
      {lovedOnes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-semibold uppercase tracking-widest text-muted">About</span>
          <Chip selected={subjectId === null} onClick={() => setSubjectId(null)} className="px-3.5 py-2 text-caption">
            General
          </Chip>
          {lovedOnes.map((lo) => (
            <Chip key={lo.id} selected={subjectId === lo.id} onClick={() => setSubjectId(lo.id)} className="px-3.5 py-2 text-caption">
              {lo.full_name.split(/\s+/)[0]}
            </Chip>
          ))}
        </div>
      )}

      {/* Thread */}
      <div className="flex flex-col gap-3.5">
        {empty && (
          <AssistantBubble>
            <p className="text-body-sm leading-relaxed text-ink">
              Hi — I&apos;m here for the people you love. Ask me anything about how they&apos;re doing, their day, their
              health, or arranging care. Pick who it&apos;s about above so I can be specific.
            </p>
          </AssistantBubble>
        )}

        {msgs.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[82%] rounded-[18px_18px_4px_18px] bg-ink px-4 py-2.5 text-body-sm leading-relaxed text-ivory">
                  {m.text}
                </div>
              </div>
            )
          }
          if (m.escalate) {
            return <EscalationCard key={m.id} message={m.text ?? ''} ambulanceNumber={m.ambulanceNumber} />
          }
          return (
            <React.Fragment key={m.id}>
              <AssistantBubble>
                {m.pending ? (
                  <TypingDots />
                ) : m.notice ? (
                  <p className="text-body-sm leading-relaxed text-muted">{m.text}</p>
                ) : (
                  <MarkdownAnswer text={m.text ?? ''} className="flex flex-col gap-1.5" />
                )}
              </AssistantBubble>
              {!m.pending && !m.notice && m.id === lastAnswerId && (
                <div className="ml-[2.625rem] flex flex-wrap gap-2">
                  <NextStepChip href="/family/book" icon={CalendarPlus}>Book a visit</NextStepChip>
                  <NextStepChip href={subjectId ? `/family/connect/${subjectId}` : '/family/connect'} icon={MessageCircle}>
                    Message your Presence Manager
                  </NextStepChip>
                </div>
              )}
            </React.Fragment>
          )
        })}

        {/* Recent questions — empty state only */}
        {empty && history.length > 0 && (
          <div className="mt-2">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="h-px flex-1 bg-line" />
              <span className="text-caption font-semibold uppercase tracking-widest text-muted">Recent questions</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <ul className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
              {history.map((h, i) => (
                <li key={h.id} className={cn('px-4 py-3', i > 0 && 'border-t border-line')}>
                  <p className="truncate text-body-sm font-medium text-ink">{h.question}</p>
                  {h.answer && <p className="mt-0.5 truncate text-caption text-muted">{plainPreview(h.answer)}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-2 mt-1 rounded-lg border border-line/70 bg-card p-2.5 shadow-md">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void doSend(input)
              }
            }}
            rows={1}
            placeholder="Ask about the people you love…"
            aria-label="Your question"
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-sm bg-ivory px-3.5 py-2.5 text-body text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-green/25"
          />
          <Button
            size="sm"
            className="h-11 w-11 shrink-0 !px-0"
            disabled={!input.trim() || thinking}
            onClick={() => void doSend(input)}
            aria-label="Send"
          >
            {thinking ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : <Send className="h-5 w-5" strokeWidth={2} />}
          </Button>
        </div>
        <p className="mt-2 text-center text-caption text-muted">General guidance only · always call 108 in an emergency.</p>
      </div>

      {/* Privacy notice — shown before the first question */}
      <Overlay open={ackOpen} onClose={() => setAckOpen(false)}>
        <div className="flex flex-col gap-4 px-6 py-6">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-green">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-h4 text-ink">Before you ask</h2>
            <p className="mt-2 text-body-sm leading-relaxed text-muted">
              Close Eye Connect gives general guidance to help you care for your family — it is <strong className="text-ink">not a diagnosis</strong> and
              not a substitute for a doctor. In an emergency, always call <strong className="text-ink">108</strong>. To help us answer, your
              question and your family member&apos;s relevant details are shared securely with our care system.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button size="md" className="w-full sm:w-auto" onClick={acknowledgePrivacy}>
              I understand — continue
            </Button>
            <Button variant="secondary" size="md" className="w-full sm:w-auto" onClick={() => setAckOpen(false)}>
              Not now
            </Button>
          </div>
        </div>
      </Overlay>
    </div>
  )
}

function NextStepChip({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-card px-3.5 py-2 text-caption font-medium text-ink transition-colors hover:border-green hover:text-green"
    >
      <Icon className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> {children}
    </Link>
  )
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green text-ivory">
        <Sparkles className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="max-w-[86%] rounded-[4px_18px_18px_18px] border border-line/70 bg-card px-4 py-3 shadow-sm">{children}</div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Thinking">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-green/60"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

function EscalationCard({ message, ambulanceNumber }: { message: string; ambulanceNumber?: string }) {
  const number = ambulanceNumber ?? '108'
  return (
    <div className="rounded-lg border border-error/40 bg-error/5 p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-error text-ivory">
          <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-body-sm font-bold text-error">Urgent attention needed</p>
          <p className="text-caption text-error/80">Please act on this immediately</p>
        </div>
      </div>
      <div className="mt-3">
        <MarkdownAnswer text={message} className="flex flex-col gap-1.5" />
      </div>
      <a
        href={`tel:${number}`}
        className="mt-4 flex items-center justify-center gap-2 rounded-sm bg-error py-3.5 text-body font-semibold text-ivory transition-opacity hover:opacity-90"
      >
        <Phone className="h-5 w-5" strokeWidth={1.75} /> Call {number} now
      </a>
      <p className="mt-2.5 text-center text-caption italic text-error/80">Don&apos;t wait — call now and stay on the line.</p>
    </div>
  )
}

const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu
function plainPreview(text: string, maxLen = 120): string {
  const plain = text
    .replace(EMOJI_RE, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
  return plain.length > maxLen ? `${plain.slice(0, maxLen).trimEnd()}…` : plain
}
