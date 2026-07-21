/**
 * Cloza's reserved home — the executive intelligence copilot (built in Phase ③).
 *
 * Rendered in ONE consistent location across every workspace (the shell rail) so the real Cloza
 * launcher can drop in later without touching a single layout. Today it is an honest placeholder,
 * never a fake answer box. Keep this the single source of Cloza's placement.
 */
import { Sparkles } from 'lucide-react'

export function ClozaSlot() {
  return (
    <div className="rounded-md border border-dashed border-green/30 bg-accent-soft/30 p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft">
          <Sparkles className="h-3.5 w-3.5 text-green" strokeWidth={2} />
        </span>
        <p className="text-caption font-semibold text-ink">Cloza</p>
        <span className="ms-auto rounded-full bg-warning/12 px-2 py-0.5 text-caption font-bold text-warning">Soon</span>
      </div>
      <p className="mt-1.5 text-caption leading-relaxed text-muted">Your executive copilot — ask about the business in plain language. Arriving next phase.</p>
    </div>
  )
}
