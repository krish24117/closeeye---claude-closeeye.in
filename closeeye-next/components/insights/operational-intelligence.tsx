import { Lightbulb, TrendingUp } from 'lucide-react'
import { StatusPill } from '@/components/insights/status-pill'
import { operationalIntelligence } from '@/lib/cloza-engine'

/** Operational Intelligence — what's coming, and what to do about it. */
export function OperationalIntelligence() {
  const preds = operationalIntelligence()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {preds.map((p) => (
        <article key={p.id} className="flex flex-col rounded-lg border border-line bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-ink"><TrendingUp className="h-4 w-4 text-green" strokeWidth={1.75} /> {p.title}</span>
            <StatusPill level={p.tone} />
          </div>
          <p className="mt-2 flex-1 text-caption leading-relaxed text-muted">{p.insight}</p>
          <p className="mt-3 flex items-start gap-1.5 rounded-md bg-accent-soft/40 p-2.5 text-caption text-ink">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" strokeWidth={1.75} /> {p.action}
          </p>
        </article>
      ))}
    </div>
  )
}
