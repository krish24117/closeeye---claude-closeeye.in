'use client'

/**
 * Track 2, Step 5 — the Connect UI. "Show the understanding before the answer." The user says one
 * thing; Close Eye shows what it understood — as the family's own words, with what it still
 * doesn't know left open — and never a guess dressed as a fact. Renders the Decision from
 * /api/understand (lib/connect/understand-client) across its lanes: escalate · ask · care · answer.
 *
 * Lives in the Workspace (.wsp scope), so it inherits the Connect design language automatically.
 */
import * as React from 'react'
import Link from 'next/link'
import { Sparkles, ShieldAlert, HeartHandshake, ArrowRight } from 'lucide-react'
import { requestUnderstanding } from '@/lib/connect/understand-client'
import type { Decision } from '@/lib/connect/pipeline'
import type { Understanding } from '@/lib/connect/comprehension'

const KNOWN = (s: string | undefined) => !!s && s !== 'unknown' && s !== 'none_stated'

export function UnderstandingConversation({ seed }: { seed?: string } = {}) {
  const [input, setInput] = React.useState('')
  const [thinking, setThinking] = React.useState(false)
  const [decision, setDecision] = React.useState<Decision | null>(null)

  async function ask(text: string) {
    const q = text.trim()
    if (!q || thinking) return
    setThinking(true)
    setDecision(null)
    try {
      setDecision(await requestUnderstanding(q))
    } finally {
      setThinking(false)
    }
  }

  // Seeded from the orb's Connect sheet (?q=…): show the question in the field and ask it once, so
  // the fast lane escalates into the real engine without the person retyping. Guarded against
  // React's double-invoke so we never ask twice.
  const seededRef = React.useRef(false)
  React.useEffect(() => {
    const q = (seed ?? '').trim()
    if (!q || seededRef.current) return
    seededRef.current = true
    setInput(q)
    void ask(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  return (
    <div className="flex flex-col gap-6">
      {/* The input — always present, so a person can refine or start again. */}
      <div className="rounded-lg border border-line/70 bg-card p-4 shadow-sm">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(input) } }}
          placeholder="Tell me about someone you love — or ask about them…"
          className="w-full resize-none bg-transparent text-body text-ink placeholder:text-muted focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-caption italic text-muted">Private. One sentence is enough.</span>
          <button
            type="button"
            onClick={() => void ask(input)}
            disabled={!input.trim() || thinking}
            className="rounded-full bg-ink px-4 py-2 text-body-sm font-semibold text-ivory disabled:opacity-40"
          >
            {thinking ? 'Reading you…' : 'Let Connect understand'}
          </button>
        </div>
      </div>

      {decision && <Outcome decision={decision} onAnswer={ask} />}
    </div>
  )
}

function Outcome({ decision, onAnswer }: { decision: Decision; onAnswer: (q: string) => void }) {
  if (decision.lane === 'escalate') {
    const n = decision.safety.ambulanceNumber
    return (
      <section className="rounded-lg border border-error/40 bg-error/5 p-5">
        <p className="flex items-center gap-2 text-body-sm font-bold text-error"><ShieldAlert className="h-5 w-5" strokeWidth={1.75} /> This sounds urgent</p>
        <p className="mt-2 text-body-sm text-ink">{decision.safety.message}</p>
        {n
          ? <a href={`tel:${n}`} className="mt-4 block rounded-sm bg-error py-3 text-center text-body font-semibold text-ivory">Call {n} now</a>
          : <p className="mt-4 rounded-sm bg-error py-3 text-center text-body font-semibold text-ivory">Call your local emergency number now</p>}
      </section>
    )
  }

  if (decision.lane === 'ask') {
    return (
      <AssistantCard>
        <p className="text-body text-ink">{decision.question}</p>
        <p className="mt-2 text-caption text-muted">Tell me a little more above, and I’ll understand.</p>
      </AssistantCard>
    )
  }

  if (decision.lane === 'decline') {
    return <AssistantCard><p className="text-body text-ink">Hello — I’m here for the people you love. Tell me about one of them, or ask me anything.</p></AssistantCard>
  }

  if (decision.lane === 'medical') {
    return (
      <AssistantCard>
        <p className="text-body text-ink"><strong>Close Eye doesn’t give medical advice.</strong> For anything clinical — a symptom, a dose, a reading, a medication — a doctor is the right person. What Close Eye can do is bring a trusted person to check in, and reach someone now for anything urgent.</p>
      </AssistantCard>
    )
  }

  // care / answer — both carry the understanding; show it, then the next move.
  const u = decision.understanding
  return (
    <div className="flex flex-col gap-4">
      {u && <Ledger u={u} />}
      {decision.lane === 'care' && (
        <Link href="/space/care" className="flex items-center justify-between gap-3 rounded-lg border border-green/30 bg-accent-soft p-4 transition-colors hover:border-green/50">
          <span className="flex items-center gap-2 text-body-sm font-semibold text-ink"><HeartHandshake className="h-5 w-5 text-green" strokeWidth={1.75} /> It sounds like you’d like someone there. Let’s arrange it.</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-green" strokeWidth={2} />
        </Link>
      )}
    </div>
  )
}

/** The Understanding Ledger — provenance always visible. ✓ = their words · ○ = still to know. */
function Ledger({ u }: { u: Understanding }) {
  const rows: { mark: '✓' | '○'; label: string; value: string; open?: boolean }[] = []
  if (KNOWN(u.subject.who)) rows.push({ mark: '✓', label: 'Someone you love', value: u.subject.who })
  else rows.push({ mark: '○', label: 'Who this is', value: 'still to know', open: true })
  if (KNOWN(u.situation)) rows.push({ mark: '✓', label: 'What’s happening', value: u.situation })
  const loc = [u.locations.from && `from ${u.locations.from}`, u.locations.to && `to ${u.locations.to}`, u.locations.lives_in && `lives in ${u.locations.lives_in}`].filter(Boolean).join(' · ')
  if (loc) rows.push({ mark: '✓', label: 'Where', value: loc })
  for (const f of u.facts) rows.push({ mark: '✓', label: f.label, value: f.value })

  const allStated = rows.every((r) => r.mark === '✓')

  return (
    <section className="rounded-lg border border-line/70 bg-card p-5 shadow-sm">
      <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-muted"><Sparkles className="h-3.5 w-3.5 text-green" strokeWidth={2} /> What I understand</p>
      <div className="mt-3 flex flex-col gap-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className={r.mark === '✓' ? 'text-green' : 'text-muted/60'}>{r.mark}</span>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold uppercase tracking-wide text-muted">{r.label}</p>
              <p className={r.open ? 'text-body-sm italic text-muted' : 'text-body-sm text-ink'}>{r.value}</p>
            </div>
            <span className="shrink-0 text-caption text-muted/70">{r.mark === '✓' ? 'from your words' : 'tell me'}</span>
          </div>
        ))}
      </div>
      {allStated && <p className="mt-4 text-caption italic text-muted">Everything above is your words. Nothing is assumed.</p>}
    </section>
  )
}

function AssistantCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green text-ivory"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></span>
      <div className="flex-1 rounded-[4px_16px_16px_16px] border border-line/70 bg-card px-4 py-3 shadow-sm">{children}</div>
    </div>
  )
}
