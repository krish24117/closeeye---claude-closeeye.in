'use client'

/**
 * The ONE reusable Cloza UI — an executive-analyst surface, not a chatbot. It shows the CONTEXT Cloza
 * already knows, lets you ask (or pick a suggested question), and keeps the CONVERSATION so follow-ups
 * ("break that down by city") work. Each answer is an analyst note whose every line is tagged
 * Verified / Recommendation / Prediction / Not available, and which can carry ACTIONS — navigate now,
 * tasks shown honestly as "soon". It talks only to the engine, so it mounts unchanged for any role.
 */
import * as React from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, MapPin } from 'lucide-react'
import { clozaQuestions, clozaCapability, clozaAsk, type ClozaContext } from '@/lib/cloza/engine'
import { type ClozaAnswer, type ClozaTurn } from '@/lib/cloza/types'
import { EpistemicTag } from '@/components/cloza/epistemic-tag'
import { cn } from '@/lib/utils'

const serif = { fontFamily: 'var(--font-newsreader), Georgia, "Times New Roman", serif' } as const
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function ClozaAnswerCard({ answer }: { answer: ClozaAnswer }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <p style={serif} className="text-h4 text-ink">{answer.title}</p>
      <div className="mt-4 flex flex-col gap-3">
        {answer.segments.map((seg, i) => (
          <div key={i} className="flex items-start gap-3">
            <EpistemicTag kind={seg.kind} className="mt-0.5" />
            <p className="min-w-0 flex-1 text-body-sm leading-relaxed text-ink">{seg.text}</p>
          </div>
        ))}
      </div>
      {answer.actions && answer.actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {answer.actions.map((a, i) =>
            a.available && a.href ? (
              <Link key={i} href={a.href} className="inline-flex items-center gap-1.5 rounded-full bg-surface-inverse px-3.5 py-1.5 text-caption font-semibold text-content-inverse transition-opacity hover:opacity-90">
                {a.label} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            ) : (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-caption font-semibold text-muted">{a.label} · soon</span>
            ),
          )}
        </div>
      )}
      <p className="mt-4 border-t border-line/70 pt-3 text-caption text-muted">{answer.source}</p>
    </div>
  )
}

export function ClozaPanel({ ctx }: { ctx: ClozaContext }) {
  const questions = clozaQuestions(ctx)
  const [history, setHistory] = React.useState<ClozaTurn[]>([])
  const [q, setQ] = React.useState('')

  const push = (question: string, answer: ClozaAnswer) => setHistory((h) => [...h, { question, answer }])

  const ask = () => {
    const text = q.trim()
    if (!text) return
    push(text, clozaAsk(ctx, text, history))
    setQ('')
  }

  const contextLine = [cap(ctx.scope.role.replace(/_/g, ' ')), ctx.scope.dateRange?.label ?? 'today', ctx.scope.city ?? 'all cities'].join(' · ')

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-1.5 text-caption text-muted">
        <MapPin className="h-3.5 w-3.5 text-green" strokeWidth={1.9} /> Cloza knows where you are · <span className="font-semibold text-ink">{contextLine}</span>
      </p>

      <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 shadow-sm focus-within:border-green/50">
        <Sparkles className="h-4 w-4 shrink-0 text-green" strokeWidth={1.9} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask Cloza — try a follow-up like “break that down by city”"
          className="flex-1 bg-transparent text-body-sm text-ink placeholder:text-muted focus:outline-none"
        />
        <button onClick={ask} aria-label="Ask Cloza" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-inverse text-content-inverse transition-opacity hover:opacity-90">
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {questions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {questions.map((qq) => (
            <button key={qq.id} onClick={() => push(qq.label, clozaCapability(ctx, qq.id))}
              className="rounded-full border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
              {qq.label}
            </button>
          ))}
        </div>
      )}

      {/* The conversation — newest first, so the latest answer sits under the ask bar. */}
      {history.length > 0 && (
        <div className="mt-1 flex flex-col gap-4">
          {history.slice().reverse().map((turn, i) => (
            <div key={history.length - 1 - i} className="flex flex-col gap-2">
              <p className="text-caption text-muted">You asked · <span className="font-semibold text-ink">{turn.question}</span></p>
              <ClozaAnswerCard answer={turn.answer} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
