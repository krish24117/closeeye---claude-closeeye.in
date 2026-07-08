'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * VitalInput — a large, touch-friendly reading input. Only shown when a family
 * or physician has requested it; never mandatory. Big tap target, numeric
 * keypad, unit shown inline. Reusable for any measured reading.
 */
export function VitalInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
  icon: Icon,
  requested,
  inputMode = 'decimal',
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  icon?: LucideIcon
  requested?: boolean
  inputMode?: 'decimal' | 'numeric' | 'text'
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-4 rounded-md border bg-card p-4 transition-colors focus-within:border-green',
        requested ? 'border-green/40' : 'border-line',
      )}
    >
      {Icon && (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">{label}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="text-caption text-muted">{unit}</span>
          {requested && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-green">Requested</span>}
        </span>
      </span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-24 shrink-0 rounded-sm border border-line bg-ivory px-3 py-2.5 text-center text-h4 tabular-nums text-ink placeholder:text-muted/50 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
      />
    </label>
  )
}
