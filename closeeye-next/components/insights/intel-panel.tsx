import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Section wrapper for an intelligence dashboard — same card language as the rest. */
export function IntelCard({ icon: Icon, title, sub, action, children }: { icon: LucideIcon; title: string; sub?: string; action?: { label: string; href: string }; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
          <div><h2 className="text-h4">{title}</h2>{sub && <p className="text-caption text-muted">{sub}</p>}</div>
        </div>
        {action && <Link href={action.href} className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-green hover:underline">{action.label} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>}
      </div>
      {children}
    </section>
  )
}

const TONE: Record<string, string> = { positive: 'text-success', warning: 'text-warning', error: 'text-error', neutral: 'text-ink' }

export interface MetricItem { label: string; value: string | number; tone?: 'neutral' | 'positive' | 'warning' | 'error' }

export function Metric({ label, value, tone = 'neutral' }: MetricItem) {
  return (
    <div className="rounded-md border border-line bg-ivory p-3">
      <p className={cn('text-h4 leading-none', TONE[tone])}>{value}</p>
      <p className="mt-1 text-caption text-muted">{label}</p>
    </div>
  )
}

export function MetricGrid({ items, className }: { items: MetricItem[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {items.map((m) => <Metric key={m.label} {...m} />)}
    </div>
  )
}
