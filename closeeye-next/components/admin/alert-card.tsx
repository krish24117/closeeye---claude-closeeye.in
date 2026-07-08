import Link from 'next/link'
import { TriangleAlert, Lightbulb, ArrowRight } from 'lucide-react'
import type { AdminAlert, AlertSeverity } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const SEV: Record<AlertSeverity, { label: string; chip: string; border: string }> = {
  high: { label: 'High', chip: 'bg-error/10 text-error', border: 'border-error/25' },
  medium: { label: 'Medium', chip: 'bg-warning/12 text-warning', border: 'border-line' },
  low: { label: 'Low', chip: 'bg-accent-soft text-green', border: 'border-line' },
}

/** AlertCard — one item in the Attention Center, with a recommended action. */
export function AlertCard({ alert }: { alert: AdminAlert }) {
  const s = SEV[alert.severity]
  return (
    <article className={cn('rounded-lg border bg-card p-4 shadow-sm', s.border)}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-ink">
          <TriangleAlert className={cn('h-4 w-4', alert.severity === 'high' ? 'text-error' : 'text-warning')} strokeWidth={1.75} /> {alert.title}
        </span>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase', s.chip)}>{s.label}</span>
      </div>
      <p className="mt-2 text-caption leading-relaxed text-muted">{alert.detail}</p>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-accent-soft/40 px-3 py-2">
        <span className="inline-flex items-start gap-1.5 text-caption text-ink">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" strokeWidth={1.75} /> {alert.action}
        </span>
        {alert.href && (
          <Link href={alert.href} className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-green hover:underline">
            Act <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
      </div>
    </article>
  )
}
