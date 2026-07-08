import { cn } from '@/lib/utils'
import type { Mood, MedicationState, VisitStatus } from '@/lib/family-data'

/**
 * ONE status system for Family Space. Every status/mood/state chip shares the
 * same height, padding, radius, typography and dot — only the tone changes.
 * Reassurance-first: warm greens for good states, amber for gentle attention,
 * muted for inactive. Red is never used for status.
 */
export type StatusTone = 'positive' | 'info' | 'attention' | 'neutral'

const TONES: Record<StatusTone, { chip: string; dot: string }> = {
  positive: { chip: 'bg-success/12 text-success', dot: 'bg-success' },
  info: { chip: 'bg-accent-soft text-green', dot: 'bg-green' },
  attention: { chip: 'bg-warning/12 text-warning', dot: 'bg-warning' },
  neutral: { chip: 'bg-muted/12 text-muted', dot: 'bg-muted' },
}

export function StatusBadge({
  label,
  tone,
  dot = true,
  className,
}: {
  label: string
  tone: StatusTone
  dot?: boolean
  className?: string
}) {
  const t = TONES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold leading-none',
        t.chip,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
      {label}
    </span>
  )
}

/* ── Semantic wrappers — all delegate to StatusBadge (identical dimensions) ─ */

const MOOD_TONE: Record<Mood, StatusTone> = {
  Good: 'positive',
  Calm: 'positive',
  Cheerful: 'positive',
  Tired: 'attention',
  Low: 'attention',
}
export function MoodBadge({ mood }: { mood: Mood }) {
  return <StatusBadge label={mood} tone={MOOD_TONE[mood]} />
}

const MED_TONE: Record<MedicationState, StatusTone> = {
  Completed: 'positive',
  Pending: 'attention',
  'Not required': 'neutral',
}
export function MedBadge({ state }: { state: MedicationState }) {
  return <StatusBadge label={state} tone={MED_TONE[state]} dot={false} />
}

const VISIT_TONE: Record<VisitStatus, StatusTone> = {
  upcoming: 'info',
  completed: 'positive',
  cancelled: 'neutral',
}
const VISIT_LABEL: Record<VisitStatus, string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
}
export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return <StatusBadge label={VISIT_LABEL[status]} tone={VISIT_TONE[status]} dot={false} />
}
