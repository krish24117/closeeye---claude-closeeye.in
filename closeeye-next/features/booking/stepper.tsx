'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STEPS } from './state'

/** Slim progress indicator across the booking's form steps. */
export function Stepper({ step }: { step: number }) {
  const current = Math.min(step, STEPS.length - 1)
  return (
    <nav aria-label="Booking progress" className="w-full">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  'grid h-7 w-7 shrink-0 place-items-center rounded-full border text-caption font-semibold transition-colors',
                  done && 'border-green bg-green text-ivory',
                  active && 'border-green bg-accent-soft text-green',
                  !done && !active && 'border-line bg-card text-muted',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn(
                  'hidden text-caption font-medium sm:block',
                  active ? 'text-ink' : 'text-muted',
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <span className={cn('h-px flex-1 transition-colors', done ? 'bg-green/40' : 'bg-line')} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
