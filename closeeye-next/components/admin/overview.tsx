/**
 * Reusable read-only dashboard primitives for the Operations Workspace.
 *
 * A tile is either a LIVE number or an honest "Coming soon" — never an estimate. Set `comingSoon`
 * (with no `value`) to explain what will populate the metric once its signal exists. `OverviewCard`
 * wraps a set of tiles with a deep-link into the console that actually operates on them, so the
 * workspace summarizes without ever replacing the real tools.
 */
import Link from 'next/link'
import { ArrowUpRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Metric {
  label: string
  value?: string | number
  hint?: string
  /** When set and `value` is absent, the tile renders an honest "Coming soon" with this note. */
  comingSoon?: string
}

export function MetricTile({ metric }: { metric: Metric }) {
  const soon = metric.value == null && !!metric.comingSoon
  return (
    <div className={cn('flex flex-col rounded-lg border bg-card p-4 shadow-sm', soon ? 'border-dashed border-line' : 'border-line')}>
      <p className="text-caption font-medium text-muted">{metric.label}</p>
      {soon ? (
        <>
          <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-warning/12 px-2.5 py-1 text-caption font-semibold text-warning">
            <Clock className="h-3 w-3" strokeWidth={2.4} /> Coming soon
          </span>
          <p className="mt-2 text-caption leading-relaxed text-muted">{metric.comingSoon}</p>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-h2 leading-none text-ink">{metric.value ?? '—'}</p>
          {metric.hint && <p className="mt-1.5 text-caption text-muted">{metric.hint}</p>}
        </>
      )}
    </div>
  )
}

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {metrics.map((m) => <MetricTile key={m.label} metric={m} />)}
    </div>
  )
}

export function OverviewCard({ title, subtitle, metrics, action }: {
  title: string
  subtitle?: string
  metrics: Metric[]
  action?: { href: string; label: string }
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-h4 text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-body-sm text-muted">{subtitle}</p>}
        </div>
        {action && (
          <Link href={action.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-line bg-ivory px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
            {action.label} <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.9} />
          </Link>
        )}
      </div>
      <MetricGrid metrics={metrics} />
    </section>
  )
}
