import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Location', 'Account', 'Welcome', 'Plan'] as const

/**
 * Progress rail for the pre-launch Founder journey (Location → Account → Welcome
 * → Plan → done). Mirrors the membership FunnelSteps so the family always knows
 * they're inside one short, continuous task with a clear end.
 */
export function FounderSteps({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex items-center justify-center gap-1.5 sm:gap-2.5" aria-label={`Step ${step} of ${STEPS.length}`}>
      {STEPS.map((label, i) => {
        const n = i + 1
        const state = n < step ? 'done' : n === step ? 'current' : 'todo'
        return (
          <li key={label} className="flex items-center gap-1.5 sm:gap-2.5">
            <span className={cn('inline-flex items-center gap-1.5 text-caption font-medium', state === 'todo' ? 'text-muted/60' : 'text-green')}>
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold',
                  state === 'done' ? 'bg-green text-ivory' : state === 'current' ? 'bg-accent-soft text-green ring-1 ring-green' : 'bg-ink/[0.06] text-muted',
                )}
              >
                {state === 'done' ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            {n < STEPS.length && <span className={cn('h-px w-4 sm:w-8', n < step ? 'bg-green' : 'bg-line')} />}
          </li>
        )
      })}
    </ol>
  )
}
