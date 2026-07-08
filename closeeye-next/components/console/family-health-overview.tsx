'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLiveFamilies } from '@/features/console/use-live'

/** Compact Family Health Overview — the same stacked-bar styling as Reports.
 *  A five-second read of On track / Follow-up / Immediate attention. */
export function FamilyHealthOverview() {
  const families = useLiveFamilies()
  const total = families.length || 1
  const green = families.filter((f) => f.liveStatus === 'green').length
  const yellow = families.filter((f) => f.liveStatus === 'yellow').length
  const red = families.filter((f) => f.liveStatus === 'red').length

  const rows = [
    { label: 'On track', value: green, dot: 'bg-success', text: 'text-success' },
    { label: 'Follow-up recommended', value: yellow, dot: 'bg-warning', text: 'text-warning' },
    { label: 'Immediate attention', value: red, dot: 'bg-error', text: 'text-error' },
  ]

  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-h4">Family health overview</h2>
        <Link href="/console/families" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">All <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full">
        <span className="bg-success" style={{ width: `${(green / total) * 100}%` }} />
        <span className="bg-warning" style={{ width: `${(yellow / total) * 100}%` }} />
        <span className="bg-error" style={{ width: `${(red / total) * 100}%` }} />
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-body-sm text-ink">
              <span className={`h-2 w-2 rounded-full ${r.dot}`} /> {r.label}
            </span>
            <span className={`text-body-sm font-bold ${r.text}`}>{r.value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
