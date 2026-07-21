'use client'

/**
 * The ONE reusable Cloza UI — an executive-analyst surface, not a chatbot. No message stream, no
 * "typing" theatre: you ask (or pick a suggested question) and Cloza returns a titled analyst note
 * whose every line is tagged Verified / Recommendation / Prediction / Not available. It talks only to
 * the engine, so it mounts unchanged for any role once that role's provider exists.
 */
import * as React from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import { clozaQuestions, clozaAnswer, clozaAsk, type ClozaContext } from '@/lib/cloza/engine'
import { EPISTEMIC_LABEL, type ClozaAnswer, type Epistemic } from '@/lib/cloza/types'
import { cn } from '@/lib/utils'

const serif = { fontFamily: 'var(--font-newsreader), Georgia, "Times New Roman", serif' } as const

const TAG_STYLE: Record<Epistemic, string> = {
  fact: 'bg-accent-soft text-green',
  recommendation: 'bg-surface-inverse text-content-inverse',
  prediction: 'bg-warning/12 text-warning',
  unavailable: 'bg-line text-muted',
}

/** A single Cloza answer, rendered as an analyst note with epistemic tags per line. */
export function ClozaAnswerCard({ answer }: { answer: ClozaAnswer }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <p style={serif} className="text-h4 text-ink">{answer.title}</p>
      <div className="mt-4 flex flex-col gap-3">
        {answer.segments.map((seg, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={cn('mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-caption font-bold', TAG_STYLE[seg.kind])}>{EPISTEMIC_LABEL[seg.kind]}</span>
            <p className="min-w-0 flex-1 text-body-sm leading-relaxed text-ink">{seg.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line/70 pt-3 text-caption text-muted">{answer.source}</p>
    </div>
  )
}

export function ClozaPanel({ ctx }: { ctx: ClozaContext }) {
  const questions = clozaQuestions(ctx)
  const [answer, setAnswer] = React.useState<ClozaAnswer | null>(null)
  const [q, setQ] = React.useState('')

  const ask = () => {
    const text = q.trim()
    if (text) setAnswer(clozaAsk(ctx, text))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 shadow-sm focus-within:border-green/50">
        <Sparkles className="h-4 w-4 shrink-0 text-green" strokeWidth={1.9} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="Ask Cloza about the business…"
          className="flex-1 bg-transparent text-body-sm text-ink placeholder:text-muted focus:outline-none"
        />
        <button onClick={ask} aria-label="Ask Cloza" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-inverse text-content-inverse transition-opacity hover:opacity-90">
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {questions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {questions.map((qq) => (
            <button key={qq.id} onClick={() => { setQ(''); setAnswer(clozaAnswer(ctx, qq.id)) }}
              className="rounded-full border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
              {qq.label}
            </button>
          ))}
        </div>
      )}

      {answer && <ClozaAnswerCard answer={answer} />}
    </div>
  )
}
