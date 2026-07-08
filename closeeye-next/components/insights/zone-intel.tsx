import { MapPin } from 'lucide-react'
import { ZONES_INTEL, fmt, type ZoneStatus } from '@/lib/exec-intel'
import { cn } from '@/lib/utils'

const TONE: Record<ZoneStatus, { chip: string; bar: string; label: string }> = {
  healthy: { chip: 'bg-success/12 text-success', bar: 'bg-success', label: 'Healthy' },
  watch: { chip: 'bg-warning/12 text-warning', bar: 'bg-warning', label: 'Watch' },
  critical: { chip: 'bg-error/10 text-error', bar: 'bg-error', label: 'Critical' },
}

/** Zone Intelligence — a city heatmap of demand, supply and risk. */
export function ZoneIntel() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ZONES_INTEL.map((z) => {
        const t = TONE[z.status]
        return (
          <article key={z.zone} className={cn('rounded-lg border bg-card p-4 shadow-sm', z.status === 'critical' ? 'border-error/30' : 'border-line')}>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-ink"><MapPin className="h-4 w-4 text-green" strokeWidth={1.75} /> {z.zone}</span>
              <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-caption font-semibold', t.chip)}>{t.label}</span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-caption"><span className="text-muted">Risk score</span><span className="font-semibold text-ink">{z.risk}/100</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-soft"><div className={cn('h-full rounded-full', t.bar)} style={{ width: `${z.risk}%` }} /></div>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-caption">
              <div><dt className="text-muted">Families</dt><dd className="font-semibold text-ink">{z.families}</dd></div>
              <div><dt className="text-muted">Visits</dt><dd className="font-semibold text-ink">{z.visits}/day</dd></div>
              <div><dt className="text-muted">Cancel</dt><dd className={cn('font-semibold', z.cancelPct >= 15 ? 'text-error' : 'text-ink')}>{z.cancelPct}%</dd></div>
              <div><dt className="text-muted">Guardians</dt><dd className="font-semibold text-ink">{z.guardians}</dd></div>
              <div><dt className="text-muted">Companions</dt><dd className="font-semibold text-ink">{z.companions}</dd></div>
              <div><dt className="text-muted">Revenue</dt><dd className="font-semibold text-ink">{fmt(z.revenue)}</dd></div>
            </dl>

            <p className="mt-3 rounded-md bg-accent-soft/40 px-3 py-2 text-caption text-ink"><span className="font-semibold text-green">Suggested:</span> {z.action}</p>
          </article>
        )
      })}
    </div>
  )
}
