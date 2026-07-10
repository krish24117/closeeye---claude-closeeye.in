'use client'

import { useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { CITY_SUGGESTIONS } from '@/lib/plans'

/** City input with lightweight autocomplete over common cities; free text allowed. */
export function CityField({
  value,
  onChange,
  placeholder = 'e.g. Hyderabad',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const q = value.trim().toLowerCase()
  const matches = (q.length
    ? CITY_SUGGESTIONS.filter((c) => c.toLowerCase().includes(q) && c.toLowerCase() !== q)
    : CITY_SUGGESTIONS
  ).slice(0, 6)
  const showList = focused && matches.length > 0

  return (
    <div className="relative">
      <div className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-line bg-ivory px-4 py-3.5 transition-colors focus-within:border-green focus-within:ring-2 focus-within:ring-green/20">
        <MapPin className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 120) }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-transparent text-body text-ink placeholder:text-muted/70 focus:outline-none"
        />
      </div>
      {showList && (
        <ul className="ce-fade-in absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-line/70 bg-card py-1 shadow-lg">
          {matches.map((c) => (
            <li key={c}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(c); setFocused(false); if (blurTimer.current) clearTimeout(blurTimer.current) }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-body-sm text-ink transition-colors hover:bg-accent-soft/50"
              >
                <MapPin className="h-4 w-4 text-muted" strokeWidth={1.5} /> {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
