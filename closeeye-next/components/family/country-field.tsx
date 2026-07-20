'use client'

import { Globe } from 'lucide-react'
import { ALL_REGIONS } from '@/lib/platform/regions'

/**
 * Country selector — sets a person's region, which drives the correct LOCAL emergency number
 * (regions.ts). Optional by design: left blank, the person's region stays unknown and the app
 * falls back to the safe "call your local emergency number" behaviour rather than assuming any
 * country. A native <select> so it works identically on every device.
 */
export function CountryField({
  value,
  onChange,
  placeholder = 'Country (optional)',
}: {
  value: string
  onChange: (code: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-line bg-ivory px-4 py-3.5 transition-colors focus-within:border-green focus-within:ring-2 focus-within:ring-green/20">
      <Globe className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.75} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-transparent text-body focus:outline-none ${value ? 'text-ink' : 'text-muted/70'}`}
      >
        <option value="">{placeholder}</option>
        {ALL_REGIONS.map((r) => (
          <option key={r.code} value={r.code} className="text-ink">{r.name}</option>
        ))}
      </select>
    </div>
  )
}
