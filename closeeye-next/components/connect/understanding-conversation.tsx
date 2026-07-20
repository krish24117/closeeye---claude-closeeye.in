'use client'

/**
 * Connect — the signed-in conversation. CloseEye's promise, made real and VISIBLE:
 * Understand → Reason → Answer. Every turn briefly shows what CloseEye understood from the family's
 * own information (Decision 1 — the trust step stays visible, never a dead end), then the grounded
 * answer. Crisis interrupts with the existing safety flow. Conversations are durable: reopen a past
 * thread and continue it across days (Decision 2). The answer is grounded in the Family Graph
 * (Decision 3) — all composed from proven modules (lib/connect/answer).
 */
import * as React from 'react'
import Link from 'next/link'
import { Sparkles, ShieldAlert, HeartHandshake, MessageSquarePlus, History, ArrowUp, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { answerFamilyQuestion, type ConnectKind, type LovedOneRef } from '@/lib/connect/answer'
import { track } from '@/lib/analytics'
import { createConversation, appendMessage, fetchConversations, fetchConversation, type ConversationSummary } from '@/lib/db/conversations'
import { MarkdownAnswer } from '@/components/family/markdown-answer'
import type { Understanding } from '@/lib/connect/comprehension'
import type { AskTurn } from '@/lib/db/ask'

type Turn =
  | { role: 'user'; content: string }
  | { role: 'assistant'; kind: ConnectKind; text: string | null; understanding: Understanding | null; ambulanceNumber?: string | null; notice?: string | null }

export function UnderstandingConversation({ seed }: { seed?: string } = {}) {
  const [input, setInput] = React.useState('')
  const [thinking, setThinking] = React.useState(false)
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [conversationId, setConversationId] = React.useState<string | null>(null) // durable UI thread
  const [askThreadId, setAskThreadId] = React.useState<string | null>(null) // ask-health's own thread
  const [subjectId, setSubjectId] = React.useState<string | null>(null) // the resolved loved one, for follow-up grounding
  const [lovedOnes, setLovedOnes] = React.useState<LovedOneRef[]>([])
  const [history, setHistory] = React.useState<ConversationSummary[]>([])
  const [showHistory, setShowHistory] = React.useState(false)
  const endRef = React.useRef<HTMLDivElement>(null)

  const refreshHistory = React.useCallback(async () => setHistory(await fetchConversations()), [])

  React.useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('loved_ones').select('id, full_name, relationship')
      setLovedOnes((data as LovedOneRef[]) ?? [])
    })()
    void refreshHistory()
  }, [refreshHistory])

  React.useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [turns, thinking])

  async function ask(text: string) {
    const q = text.trim()
    if (!q || thinking) return
    const isFollowUp = !!askThreadId // captured before the thread id is set below
    setInput('')
    setShowHistory(false)
    const priorTurns: AskTurn[] = turns
      .filter((t) => (t.role === 'user') || (t.role === 'assistant' && !!t.text))
      .map((t) => (t.role === 'user' ? { role: 'user' as const, content: t.content } : { role: 'assistant' as const, content: t.text ?? '' }))

    setTurns((prev) => [...prev, { role: 'user', content: q }])
    setThinking(true)
    // PMF funnel — event only, never the question text.
    track(isFollowUp ? 'follow_up_asked' : 'first_question_asked')

    // Persist the thread (best-effort; no-ops until the conversations migration is applied).
    let convId = conversationId
    if (!convId) { convId = await createConversation({ title: q }); if (convId) setConversationId(convId) }
    if (convId) void appendMessage(convId, { role: 'user', content: q })

    try {
      const res = await answerFamilyQuestion({ question: q, lovedOnes, askThreadId, subjectId, priorTurns })
      if (res.queryId && !askThreadId) setAskThreadId(res.queryId)
      if (res.lovedOneId && !subjectId) setSubjectId(res.lovedOneId)
      setTurns((prev) => [...prev, { role: 'assistant', kind: res.kind, text: res.text, understanding: res.understanding, ambulanceNumber: res.ambulanceNumber, notice: res.notice }])
      track('answer_received', { kind: res.kind, grounded: !!(res.lovedOneId || subjectId) })
      if (convId) void appendMessage(convId, { role: 'assistant', content: res.text ?? '', kind: res.kind === 'clarify' || res.kind === 'decline' || res.kind === 'medical' ? 'answer' : (res.kind === 'error' ? 'pending' : res.kind), understanding: res.understanding, ambulanceNumber: res.ambulanceNumber })
      void refreshHistory()
    } finally {
      setThinking(false)
    }
  }

  async function reopen(id: string) {
    const thread = await fetchConversation(id)
    if (!thread) return
    setConversationId(thread.id)
    setAskThreadId(null) // fresh ask-health thread; the reopened turns carry context via priorTurns
    setSubjectId(thread.lovedOneId ?? null)
    setTurns(thread.messages.map((m) => m.role === 'user'
      ? { role: 'user', content: m.content }
      : { role: 'assistant', kind: m.kind as ConnectKind, text: m.content, understanding: m.understanding, ambulanceNumber: m.ambulanceNumber }))
    setShowHistory(false)
    track('conversation_reopened')
  }

  function newConversation() { setTurns([]); setConversationId(null); setAskThreadId(null); setSubjectId(null); setShowHistory(false); setInput('') }

  const seededRef = React.useRef(false)
  React.useEffect(() => {
    const q = (seed ?? '').trim()
    if (!q || seededRef.current || !lovedOnes) return
    seededRef.current = true
    void ask(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, lovedOnes])

  return (
    <div className="flex flex-col gap-5">
      {/* Controls — new conversation + reopen a past one */}
      <div className="flex items-center gap-2">
        <button onClick={newConversation} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-ink transition-colors hover:border-green/40">
          <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={2} /> New
        </button>
        {history.length > 0 && (
          <button onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-ink transition-colors hover:border-green/40">
            <History className="h-3.5 w-3.5" strokeWidth={2} /> Past conversations
          </button>
        )}
      </div>

      {showHistory && (
        <section className="flex flex-col gap-2 rounded-lg border border-line/70 bg-card p-3 shadow-sm">
          <p className="px-1 text-caption font-semibold uppercase tracking-widest text-muted">Reopen a conversation</p>
          {history.map((c) => (
            <button key={c.id} onClick={() => reopen(c.id)} className="flex flex-col items-start gap-0.5 rounded-md px-3 py-2 text-start transition-colors hover:bg-accent-soft/50">
              <span className="line-clamp-1 text-body-sm font-medium text-ink">{c.title}</span>
              <span className="text-caption text-muted">{new Date(c.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}{c.subjectLabel ? ` · ${c.subjectLabel}` : ''}</span>
            </button>
          ))}
        </section>
      )}

      {/* The thread */}
      {turns.length === 0 && !thinking && (
        <p className="px-1 text-body-sm text-muted">Ask about someone you love — CloseEye answers using what your family has shared.</p>
      )}
      <div className="flex flex-col gap-4">
        {turns.map((t, i) => t.role === 'user' ? (
          <div key={i} className="flex items-start justify-end gap-2.5">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-body-sm text-ivory">{t.content}</div>
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><User className="h-4 w-4" strokeWidth={1.75} /></span>
          </div>
        ) : (
          <AssistantTurn key={i} turn={t} />
        ))}
        {thinking && <p className="flex items-center gap-2 px-1 text-body-sm text-muted"><Sparkles className="h-4 w-4 animate-pulse text-green" strokeWidth={1.75} /> Understanding, then finding your answer…</p>}
        <div ref={endRef} />
      </div>

      {/* Input — always present, to continue the conversation naturally */}
      <div className="sticky bottom-0 rounded-lg border border-line/70 bg-card p-3 shadow-sm">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(input) } }}
            placeholder={turns.length ? 'Continue the conversation…' : 'Ask about someone you love…'}
            className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-body-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button onClick={() => void ask(input)} disabled={!input.trim() || thinking} aria-label="Ask" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-ivory transition-opacity hover:opacity-90 disabled:opacity-40">
            <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-caption italic text-muted">Private to your family. Not medical advice.</p>
      </div>
    </div>
  )
}

function AssistantTurn({ turn }: { turn: Extract<Turn, { role: 'assistant' }> }) {
  const { kind, text, understanding, ambulanceNumber } = turn

  if (kind === 'escalate') {
    return (
      <section className="rounded-lg border border-error/40 bg-error/5 p-5">
        <p className="flex items-center gap-2 text-body-sm font-bold text-error"><ShieldAlert className="h-5 w-5" strokeWidth={1.75} /> This sounds urgent</p>
        {text && <div className="mt-2"><MarkdownAnswer text={text} /></div>}
        {ambulanceNumber
          ? <a href={`tel:${ambulanceNumber}`} className="mt-4 block rounded-sm bg-error py-3 text-center text-body font-semibold text-ivory">Call {ambulanceNumber} now</a>
          : <p className="mt-4 rounded-sm bg-error py-3 text-center text-body font-semibold text-ivory">Call your local emergency number now</p>}
      </section>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green text-ivory"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></span>
      <div className="min-w-0 flex-1 flex flex-col gap-2.5">
        {understanding && <UnderstoodLine u={understanding} />}
        <div className="rounded-2xl rounded-tl-sm border border-line/70 bg-card px-4 py-3 shadow-sm">
          {kind === 'answer' && text && <MarkdownAnswer text={text} />}
          {kind === 'clarify' && <p className="text-body-sm text-ink">{text || 'Tell me a little more about them, and I’ll understand.'}</p>}
          {kind === 'decline' && <p className="text-body-sm text-ink">Hello — I’m here for the people you love. Tell me about one of them, or ask me anything.</p>}
          {kind === 'medical' && <p className="text-body-sm text-ink"><strong>CloseEye doesn’t give medical advice.</strong> For anything clinical — a symptom, a dose, a reading — a doctor is the right person. What CloseEye can do is bring a trusted person to check in, and reach someone now for anything urgent.</p>}
          {kind === 'pending' && <p className="text-body-sm text-ink">I couldn’t compose an answer just now — your care team will follow up. Please try again in a moment.</p>}
          {kind === 'error' && <p className="text-body-sm text-muted">{turn.notice || 'Something went wrong. Please try again in a moment.'}</p>}
        </div>
        {kind === 'answer' && (
          <Link href="/space/people" className="inline-flex w-fit items-center gap-1.5 text-caption font-semibold text-green hover:text-green/80">
            <HeartHandshake className="h-3.5 w-3.5" strokeWidth={2} /> See everyone you love
          </Link>
        )}
      </div>
    </div>
  )
}

/** The brief, visible "what I understood" — the trust step. Never dominates; never a dead end. */
function UnderstoodLine({ u }: { u: Understanding }) {
  const known = (s: string | undefined) => !!s && s !== 'unknown' && s !== 'none_stated'
  const bits: string[] = []
  if (known(u.subject?.who)) bits.push(`about ${u.subject.who}`)
  if (known(u.situation)) bits.push(u.situation)
  const line = bits.length ? bits.join(' · ') : 'your family'
  return (
    <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-accent-soft/60 px-3 py-1 text-caption text-muted">
      <Sparkles className="h-3 w-3 text-green" strokeWidth={2} />
      <span>Understood: <span className="font-medium text-ink">{line}</span> — grounded in your family’s information</span>
    </p>
  )
}
