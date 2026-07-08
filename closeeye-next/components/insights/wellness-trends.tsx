'use client'

import * as React from 'react'
import { StatusPill } from '@/components/insights/status-pill'
import { wellnessTrends, type WellnessPeriod, type Level } from '@/lib/cloza-engine'
import { cn } from '@/lib/utils'

const PERIODS: WellnessPeriod[] = [7, 30, 90]

function Spark({ points, level }: { points: number[]; level: Level }) {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * 100},${(26 - ((p - min) / span) * 22).toFixed(1)}`).join(' ')
  const stroke = level === 'attention' ? 'stroke-warning' : level === 'improving' ? 'stroke-success' : 'stroke-green'
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 w-24" aria-hidden>
      <path d={d} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className={stroke} />
    </svg>
  )
}

/** Wellness Trends — the Family Wellness Index, read across 7 / 30 / 90 days. */
export function WellnessTrends() {
  const [period, setPeriod] = React.useState<WellnessPeriod>(30)
  const w = wellnessTrends(period)

  return (
    <section className="rounded-lg border border-line bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-h4">Wellness trends</h2>
          <p className="text-caption text-muted">{w.headline}</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-card p-1">
          {PERIODS.map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(p)} className={cn('rounded-full px-3.5 py-1.5 text-caption font-semibold transition-colors', period === p ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>
              {p} days
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line">
        {w.dims.map((d) => (
          <li key={d.key} className="flex items-center gap-3 px-5 py-3">
            <span className="w-28 shrink-0 text-body-sm font-medium text-ink">{d.label}</span>
            <span className="hidden min-w-0 flex-1 truncate text-caption text-muted sm:block">{d.note}</span>
            <Spark points={d.series} level={d.status} />
            <StatusPill level={d.status} />
          </li>
        ))}
      </ul>
    </section>
  )
}
