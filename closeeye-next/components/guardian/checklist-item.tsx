'use client'

import * as React from 'react'
import { Check, Plus, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ChecklistItem — one reusable row for every Guardian checklist.
 *
 * Two modes:
 *  • scale  — pass `options`; the Guardian taps a chip. Completes when a value is
 *             chosen. An optional note can be added (never "Save" — it auto-saves).
 *  • check  — omit `options`; a simple tap-to-confirm row (used for "Before You Enter").
 *
 * `concernValues` may tint a chip toward warning IF chosen — but no scores, no red
 * alarms; concern reads as gentle amber, everything else stays in the green family.
 */
export interface ChecklistItemProps {
  label: string
  hint?: string
  icon?: LucideIcon
  /** scale mode */
  options?: string[]
  value?: string
  onSelect?: (v: string) => void
  concernValues?: Set<string>
  /** note (both modes) */
  note?: string
  onNote?: (v: string) => void
  /** check mode */
  checked?: boolean
  onToggle?: () => void
}

export function ChecklistItem(props: ChecklistItemProps) {
  const { label, hint, icon: Icon, options, value, onSelect, concernValues, note, onNote, checked, onToggle } = props
  const isScale = Array.isArray(options)
  const [noteOpen, setNoteOpen] = React.useState(Boolean(note))
  const complete = isScale ? Boolean(value) : Boolean(checked)

  if (!isScale) {
    // ── check mode ──────────────────────────────────────────────
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3.5 rounded-md border p-4 text-left transition-colors',
          complete ? 'border-green/30 bg-accent-soft/50' : 'border-line bg-card hover:border-ink/20',
        )}
      >
        <span
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors',
            complete ? 'border-green bg-green text-ivory' : 'border-line text-transparent',
          )}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-body font-medium', complete ? 'text-ink' : 'text-ink')}>{label}</span>
          {hint && <span className="mt-0.5 block text-caption text-muted">{hint}</span>}
        </span>
      </button>
    )
  }

  // ── scale mode ────────────────────────────────────────────────
  return (
    <div className={cn('rounded-md border p-4 transition-colors', complete ? 'border-green/30 bg-accent-soft/40' : 'border-line bg-card')}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors',
            complete ? 'bg-green text-ivory' : 'border border-line text-transparent',
          )}
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} />}
        <span className="text-body font-medium text-ink">{label}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {options!.map((opt) => {
          const active = value === opt
          const concern = concernValues?.has(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect?.(active ? '' : opt)}
              aria-pressed={active}
              className={cn(
                'min-h-[2.25rem] rounded-full border px-3.5 text-body-sm font-medium transition-colors',
                active
                  ? concern
                    ? 'border-warning bg-warning/10 text-warning'
                    : 'border-green bg-green text-ivory'
                  : 'border-line bg-card text-muted hover:border-ink/25 hover:text-ink',
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {onNote &&
        (noteOpen ? (
          <div className="mt-3">
            <div className="relative">
              <textarea
                value={note ?? ''}
                onChange={(e) => onNote(e.target.value)}
                rows={2}
                placeholder="Anything worth remembering…"
                className="w-full resize-none rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
              />
              <button
                type="button"
                onClick={() => {
                  onNote('')
                  setNoteOpen(false)
                }}
                className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
                aria-label="Remove note"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 text-caption font-semibold text-green hover:underline"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add a note
          </button>
        ))}
    </div>
  )
}
