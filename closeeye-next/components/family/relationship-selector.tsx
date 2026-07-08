'use client'

import { useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { RELATIONSHIP_OPTIONS } from '@/lib/plans'
import { cn } from '@/lib/utils'

/**
 * Relationship picker — a searchable bottom-sheet (mobile) / dialog (desktop)
 * that mirrors our input fields. Replaces the native <select>; animates via
 * Overlay.
 */
export function RelationshipSelector({
  value,
  onChange,
  placeholder = 'Choose relationship',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const filtered = RELATIONSHIP_OPTIONS.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setQ('') }}
        className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-2xl border border-line bg-ivory px-4 py-3.5 text-left transition-colors hover:border-ink/20 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
      >
        <span className={cn('text-body', value ? 'text-ink' : 'text-muted/70')}>{value || placeholder}</span>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
      </button>

      <Overlay open={open} onClose={() => setOpen(false)}>
        <div className="p-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-ivory px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search relationship"
              className="w-full bg-transparent text-body-sm text-ink placeholder:text-muted/70 focus:outline-none"
            />
          </div>
          <ul className="mt-2 flex max-h-[40vh] flex-col overflow-y-auto">
            {filtered.map((o) => {
              const active = o === value
              return (
                <li key={o}>
                  <button
                    type="button"
                    onClick={() => { onChange(o); setOpen(false) }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-body text-ink transition-colors',
                      active ? 'bg-accent-soft font-medium' : 'hover:bg-accent-soft/40',
                    )}
                  >
                    {o}
                    {active && <Check className="h-4 w-4 shrink-0 text-green" strokeWidth={2.5} />}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && <li className="px-4 py-6 text-center text-body-sm text-muted">No matches.</li>}
          </ul>
        </div>
      </Overlay>
    </>
  )
}
