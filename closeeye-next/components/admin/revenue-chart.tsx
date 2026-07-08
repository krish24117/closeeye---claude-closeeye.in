'use client'

import * as React from 'react'
import { BarChart } from '@/components/admin/charts'
import { REVENUE_SERIES, fmtINR, type Period } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
]

export function RevenueChart() {
  const [period, setPeriod] = React.useState<Period>('monthly')
  const data = REVENUE_SERIES[period]
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-h4">Revenue</h2>
          <p className="text-caption text-muted">{fmtINR(total)} over the period</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-card p-1">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" onClick={() => setPeriod(p.key)} className={cn('rounded-full px-3.5 py-1.5 text-caption font-semibold transition-colors', period === p.key ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <BarChart data={data} format={(n) => fmtINR(n)} />
      </div>
    </section>
  )
}
