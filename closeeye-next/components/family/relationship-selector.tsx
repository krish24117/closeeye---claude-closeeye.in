'use client'

import { useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { RELATIONSHIP_OPTIONS } from '@/lib/plans'
import { cn } from '@/lib/utils'

/**
 * Relationship picker — a searchable bottom-sheet (mobile) / dialog (desktop)
 * with an icon per option. Replaces the native <select>; animates via Overlay.
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
  const selected = RELATIONSHIP_OPTIONS.find((o) => o.key === value)
  const filtered = RELATIONSHIP_OPTIONS.filter((o) => o.key.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setQ('') }}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-ivory px-4 py-3.5 text-left transition-colors hover:border-ink/20 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
      >
        {selected ? (
          <span className="flex items-center gap-2.5 text-body text-ink"><span className="text-lg" aria-hidden>{selected.emoji}</span> {selected.key}</span>
        ) : (
          <span className="text-body text-muted/70">{placeholder}</span>
        )}
        <ChevronDown className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
      </button>

      <Overlay open={open} onClose={() => setOpen(false)}>
        <div className="p-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
          <h3 className="px-1 text-h4 text-ink">Relationship</h3>
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-ivory px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full bg-transparent text-body-sm text-ink placeholder:text-muted/70 focus:outline-none" />
          </div>
          <ul className="mt-3 flex max-h-[46vh] flex-col gap-1 overflow-y-auto pb-2">
            {filtered.map((o) => {
              const active = o.key === value
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    onClick={() => { onChange(o.key); setOpen(false) }}
                    className={cn('flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors', active ? 'bg-accent-soft' : 'hover:bg-accent-soft/40')}
                  >
                    <span className="text-xl" aria-hidden>{o.emoji}</span>
                    <span className="flex-1 text-body font-medium text-ink">{o.key}</span>
                    {active && <Check className="h-5 w-5 text-green" strokeWidth={2.25} />}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && <li className="px-3.5 py-6 text-center text-body-sm text-muted">No matches.</li>}
          </ul>
        </div>
      </Overlay>
    </>
  )
}
