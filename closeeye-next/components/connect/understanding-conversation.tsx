'use client'

/**
 * Connect — the signed-in conversation. Close Eye's promise, made real and VISIBLE:
 * Understand → Reason → Answer. Every turn briefly shows what Close Eye understood from the family's
 * own information (Decision 1 — the trust step stays visible, never a dead end), then the grounded
 * answer. Crisis interrupts with the existing safety flow. Conversations are durable: reopen a past
 * thread and continue it across days (Decision 2). The answer is grounded in the Family Graph
 * (Decision 3) — all composed from proven modules (lib/connect/answer).
 */
import * as React from 'react'
import Link from 'next/link'
import { Sparkles, ShieldAlert, HeartHandshake, MessageSquarePlus, History, ArrowUp, User, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { answerFamilyQuestion, type ConnectKind, type LovedOneRef } from '@/lib/connect/answer'
import { track } from '@/lib/analytics'
import { hasActiveConsent, recordConsent } from '@/lib/db/consent'
import { ConsentPrompt } from '@/components/connect/consent-prompt'
import { createConversation, appendMessage, fetchConversations, fetchConversation, type ConversationSummary } from '@/lib/db/conversations'
import { MarkdownAnswer } from '@/components/family/markdown-answer'
import { RecommendedNextSteps } from '@/components/family/recommended-next-steps'
import { fetchTrustedNetworkSeeded } from '@/lib/db/collaboration'
import type { ObjectRef, TrustedIdentity } from '@/lib/collaboration/types'
import { EpistemicTag } from '@/components/cloza/epistemic-tag'
import { SuggestedQuestions } from '@/components/cloza/suggested-questions'
import type { Understanding } from '@/lib/connect/comprehension'
import type { AskTurn } from '@/lib/db/ask'
import { cn } from '@/lib/utils'
import { titleCase } from '@/lib/family/relationship-words'

const cap1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** The Close Eye orb — the voice of Connect. A dark sphere with a luminous, gently pulsing green core. */
function Orb({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
  const dot = size === 'lg' ? 'h-3 w-3' : size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-ink', box)}>
      <span className={cn('ce-orb-core', dot)} />
    </span>
  )
}

/** Display name for a loved one: "your mother" → "Mother"; a real name → its first word. */
function dispName(lo: LovedOneRef): string {
  const f = (lo.full_name || '').trim()
  if (/^your\s/i.test(f)) return titleCase(f.replace(/^your\s+/i, ''))
  return f.split(/\s+/)[0] || (lo.relationship ? titleCase(lo.relationship) : 'them')
}

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
  const [network, setNetwork] = React.useState<TrustedIdentity[]>([]) // the family's trusted people, for next-step actions
  // Consent gate (Phase 3): null = still checking, false = must consent before we process anything.
  const [consented, setConsented] = React.useState<boolean | null>(null)
  const [showConsent, setShowConsent] = React.useState(false)
  const pendingQ = React.useRef<string | null>(null)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { void hasActiveConsent().then(setConsented) }, [])

  const refreshHistory = React.useCallback(async () => setHistory(await fetchConversations()), [])

  React.useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('loved_ones').select('id, full_name, relationship')
      setLovedOnes((data as LovedOneRef[]) ?? [])
    })()
    void refreshHistory()
    void fetchTrustedNetworkSeeded().then((n) => setNetwork(n.groups.flatMap((g) => g.members))).catch(() => {})
  }, [refreshHistory])

  React.useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [turns, thinking])

  async function ask(text: string, opts?: { consentOk?: boolean }) {
    const q = text.trim()
    if (!q || thinking) return
    // Consent gate — Close Eye must not process family information until consent is granted (Phase 3).
    // Server enforcement in ask-health is the source of truth; this is the respectful client moment.
    // Skipped right after an explicit agree (state hasn't re-rendered yet — avoid a stale-closure loop).
    if (!opts?.consentOk) {
      if (consented === false) { pendingQ.current = q; setShowConsent(true); return }
      if (consented === null) {
        const ok = await hasActiveConsent(); setConsented(ok)
        if (!ok) { pendingQ.current = q; setShowConsent(true); return }
      }
    }
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
      // Server said consent is required (e.g. it was withdrawn) — surface the consent card, don't answer.
      if (res.kind === 'consent') {
        setConsented(false); pendingQ.current = q; setShowConsent(true)
        setTurns((prev) => prev.slice(0, -1)) // remove the just-added question; re-added on re-ask
        return
      }
      if (res.queryId && !askThreadId) setAskThreadId(res.queryId)
      if (res.lovedOneId && !subjectId) {
        setSubjectId(res.lovedOneId)
      } else if (!res.lovedOneId && !subjectId && res.understanding?.subject?.who) {
        // Backend identified a person by name but didn't return a lovedOneId — resolve via name match
        // so follow-up chips reference the right member (not always lovedOnes[0]).
        const who = res.understanding.subject.who.toLowerCase().replace(/^your\s+/i, '').trim()
        const match = lovedOnes.find((l) => { const n = dispName(l).toLowerCase(); return n === who || who.startsWith(n) || n.startsWith(who) })
        if (match) setSubjectId(match.id)
      }
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

  // The family agreed to the trust promise — record it (server gate reads this), then continue.
  async function agreeConsent() {
    await recordConsent({ granted: true }) // throws on failure → the card stays and the user can retry
    setConsented(true)
    setShowConsent(false)
    const q = pendingQ.current; pendingQ.current = null
    if (q) void ask(q, { consentOk: true }) // bypass the just-set (not-yet-rendered) consent state
  }

  const seededRef = React.useRef(false)
  React.useEffect(() => {
    const q = (seed ?? '').trim()
    if (!q || seededRef.current || !lovedOnes) return
    seededRef.current = true
    void ask(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, lovedOnes])

  // Warm first-ask — real, family-drawn prompts about the primary loved one (never invented).
  const primary = lovedOnes[0]
  const primaryName = primary ? dispName(primary) : ''
  const suggestions = primary ? [
    `How has ${primaryName} been lately?`,
    `What medicines is ${primaryName} taking?`,
    `Who’s nearby if ${primaryName} needs someone?`,
  ] : []

  // Platform capabilities in Connect (never the internal name): after a grounded answer, offer
  // suggested follow-ups and — when there's a real person in view — a structured recommendation into
  // Care. The subject is the one Connect actually resolved this thread to (never invented).
  const subjectLo = subjectId ? lovedOnes.find((l) => l.id === subjectId) : null
  const subjectName = subjectLo ? dispName(subjectLo) : primaryName
  const lastTurn = turns[turns.length - 1]
  const showFollowUps = !thinking && lastTurn?.role === 'assistant' && lastTurn.kind === 'answer'
  // The person an answer's next steps attach to (only when Connect actually resolved someone).
  const answerObject: ObjectRef | null = subjectLo
    ? { type: 'person', id: subjectLo.id, label: subjectName, domain: 'health', space: 'family' }
    : null
  const followUps = subjectName
    ? [`What should I keep an eye on for ${subjectName}?`, `Who can help if ${subjectName} needs someone?`, `How can I support ${subjectName} day to day?`]
    : ['What can you help me with?', 'Who’s in my family space?']

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

      {/* The thread — a warm first-ask when empty */}
      {turns.length === 0 && !thinking && !showHistory && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <Orb size="lg" />
          <div>
            <p className="font-display text-h3 text-ink">Ask me anything{primaryName ? ` about ${primaryName}` : ''}.</p>
            <p className="mt-2 text-body-sm text-muted">I’ll answer from what your family has shared — never a guess.</p>
          </div>
          {suggestions.length > 0 && (
            <div className="flex w-full flex-col gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => void ask(s)} className="flex items-center gap-2.5 rounded-xl bg-accent-soft/60 px-4 py-3 text-start text-body-sm text-ink transition-colors hover:bg-accent-soft">
                  <Sparkles className="h-4 w-4 shrink-0 text-green" strokeWidth={2} /><span className="min-w-0">{s}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
        {thinking && <div className="flex items-center gap-2.5 px-1 text-body-sm text-muted"><Orb size="sm" /> Understanding, then finding your answer…</div>}
        <div ref={endRef} />
      </div>

      {/* After a grounded answer — a structured recommendation into Care (when a real person is in
          view) and suggested follow-ups. Reuses the platform's UI; never shows the internal name. */}
      {showFollowUps && (
        <div className="ce-fade-in flex flex-col gap-3">
          {subjectLo && (
            <div className="rounded-2xl border border-line/70 bg-card px-4 py-3 shadow-sm">
              <EpistemicTag kind="recommendation" />
              <p className="mt-2 text-body-sm text-ink">When {subjectName} needs real-world presence, Close Eye can bring a trusted person to them.</p>
              <Link href="/space/care" className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-caption font-semibold text-ivory transition-opacity hover:opacity-90">
                <HeartHandshake className="h-3.5 w-3.5" strokeWidth={2} /> Explore Close Eye Care
              </Link>
            </div>
          )}
          {answerObject && (
            <RecommendedNextSteps
              object={answerObject}
              network={network}
              receiveItems={['Health summary', 'Medication list', 'Recent visit summary']}
              onChanged={() => void refreshHistory()}
            />
          )}
          <SuggestedQuestions label="Ask a follow-up" questions={followUps} onPick={(q) => void ask(q)} />
        </div>
      )}

      {/* Consent moment — shown in place of the input until the family agrees the trust promise. */}
      {showConsent ? (
        <ConsentPrompt onAgree={agreeConsent} />
      ) : (
        /* Input — always present, to continue the conversation naturally */
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
      )}
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
      <div className="mt-0.5"><Orb /></div>
      <div className="min-w-0 flex-1 flex flex-col gap-2.5">
        {understanding && <UnderstoodLine u={understanding} />}
        <div className="rounded-2xl rounded-tl-sm border border-line/70 bg-card px-4 py-3 shadow-sm">
          {kind === 'answer' && text && <MarkdownAnswer text={text} />}
          {kind === 'clarify' && <p className="text-body-sm text-ink">{text || 'Tell me a little more about them, and I’ll understand.'}</p>}
          {kind === 'decline' && <p className="text-body-sm text-ink">Hello — I’m here for the people you love. Tell me about one of them, or ask me anything.</p>}
          {kind === 'medical' && <p className="text-body-sm text-ink"><strong>Close Eye doesn’t give medical advice.</strong> For anything clinical — a symptom, a dose, a reading — a doctor is the right person. What Close Eye can do is remember what matters and help you prepare for that conversation.</p>}
          {kind === 'pending' && <p className="text-body-sm text-ink">I couldn’t compose an answer just now. Please try again in a moment.</p>}
          {kind === 'error' && <p className="text-body-sm text-muted">{turn.notice || 'Something went wrong. Please try again in a moment.'}</p>}
        </div>
      </div>
    </div>
  )
}

/** The visible "what I understood" — the trust step, and the differentiator. Elevated, never a
 *  dead end, never fabricated: it reflects only the engine's Understanding of the family's words. */
function UnderstoodLine({ u }: { u: Understanding }) {
  const known = (s: string | undefined) => !!s && s !== 'unknown' && s !== 'none_stated'
  const who = u.subject?.who
  const whoDisp = who && known(who) ? (/^your\s/i.test(who) ? titleCase(who.replace(/^your\s+/i, '')) : cap1(who)) : ''
  const bits: string[] = []
  if (whoDisp) bits.push(whoDisp)
  if (known(u.situation)) bits.push(u.situation!)
  const line = bits.length ? bits.join(' · ') : 'Your family'
  return (
    <div className="rounded-2xl border border-green/20 bg-accent-soft/70 px-4 py-3">
      <p className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-wide text-green"><Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Understood</p>
      <p className="font-display mt-1.5 text-body leading-snug text-ink">{line}</p>
      <p className="mt-1.5 flex items-center gap-1.5 text-caption text-muted"><EpistemicTag kind="fact" /> Grounded in what your family has shared</p>
    </div>
  )
}
