import { ShieldCheck } from 'lucide-react'
import { TRUST_SCORE } from '@/lib/family-data'

/** Relationship confidence — NOT a medical score. Warm, never clinical. */
export function TrustScore() {
  return (
    <section className="rounded-lg border border-line bg-card p-6 shadow-sm" aria-label="Trust score">
      <div className="flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
          <ShieldCheck className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-h2 text-ink">{TRUST_SCORE.overall}</span>
            <span className="text-body-sm text-muted">/ 100 · Trust</span>
          </div>
          <p className="mt-0.5 text-body-sm text-muted">{TRUST_SCORE.label}</p>
        </div>
      </div>

      <ul className="mt-6 flex flex-col gap-4">
        {TRUST_SCORE.factors.map((f) => (
          <li key={f.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-sm font-medium text-ink">{f.label}</span>
              <span className="text-caption font-semibold text-green">{f.value}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-accent-soft">
              <div className="h-full rounded-full bg-green" style={{ width: `${f.value}%` }} />
            </div>
            <p className="mt-1 text-caption text-muted">{f.note}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
