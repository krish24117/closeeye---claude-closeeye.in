/**
 * The epistemic tag — the shared visual vocabulary of the Cloza platform: Verified / Recommendation /
 * Prediction / Not available. Used by the staff Cloza panel AND by customer-facing Connect, so both
 * speak the same honesty language while keeping their own engines. One component, one meaning.
 */
import { EPISTEMIC_LABEL, type Epistemic } from '@/lib/cloza/types'
import { cn } from '@/lib/utils'

const TAG_STYLE: Record<Epistemic, string> = {
  fact: 'bg-accent-soft text-green',
  recommendation: 'bg-surface-inverse text-content-inverse',
  prediction: 'bg-warning/12 text-warning',
  unavailable: 'bg-line text-muted',
}

export function EpistemicTag({ kind, className }: { kind: Epistemic; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-caption font-bold', TAG_STYLE[kind], className)}>
      {EPISTEMIC_LABEL[kind]}
    </span>
  )
}
