/**
 * Suggested follow-up questions — a shared platform capability (staff Cloza and customer Connect both
 * use it). Brand-neutral by design: it renders questions, never the platform's internal name. The host
 * decides what a "pick" does (ask the question, seed the input, etc.).
 */
'use client'

export function SuggestedQuestions({ questions, onPick, label }: { questions: string[]; onPick: (q: string) => void; label?: string }) {
  if (!questions.length) return null
  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-caption font-semibold uppercase tracking-wide text-muted">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button key={q} onClick={() => onPick(q)} className="rounded-full border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
