'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/** Accessible switch — inherits brand green. Local state (backend-ready). */
export function SettingsToggle({ label, hint, defaultOn = false }: { label: string; hint?: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-caption text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2',
          on ? 'bg-green' : 'bg-line',
        )}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-all', on ? 'left-[1.375rem]' : 'left-0.5')} />
      </button>
    </div>
  )
}
