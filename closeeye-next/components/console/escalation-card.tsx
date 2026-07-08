'use client'

import * as React from 'react'
import Link from 'next/link'
import { Phone, ArrowRight, Check, Lightbulb } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { familyById, guardianById, type Escalation, type EscalationPriority } from '@/lib/console-data'
import { cn } from '@/lib/utils'

const PRIORITY: Record<EscalationPriority, { label: string; chip: string }> = {
  low: { label: 'Low', chip: 'bg-accent-soft text-green' },
  medium: { label: 'Medium', chip: 'bg-warning/12 text-warning' },
  high: { label: 'High', chip: 'bg-error/10 text-error' },
  critical: { label: 'Critical', chip: 'bg-error text-ivory' },
}
const STATUS_LABEL: Record<Escalation['status'], string> = { open: 'Open', 'in-progress': 'In progress', resolved: 'Resolved' }

/** EscalationCard — one issue: priority, who, recommended action, resolution. */
export function EscalationCard({ escalation }: { escalation: Escalation }) {
  const toast = useToast()
  const [resolved, setResolved] = React.useState(escalation.status === 'resolved')
  const family = familyById(escalation.familyId)
  const guardian = escalation.guardianId ? guardianById(escalation.guardianId) : undefined
  const p = PRIORITY[escalation.priority]

  return (
    <article className={cn('rounded-lg border bg-card p-5 shadow-sm', resolved ? 'border-line opacity-75' : escalation.priority === 'critical' || escalation.priority === 'high' ? 'border-error/30' : 'border-line')}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('rounded-full px-2.5 py-0.5 text-caption font-bold uppercase tracking-wide', p.chip)}>{p.label}</span>
        <span className="text-caption text-muted">{escalation.createdLabel}</span>
      </div>

      <p className="mt-3 text-body font-semibold text-ink">{escalation.issue}</p>
      <p className="mt-1 text-caption text-muted">
        {family?.memberName} · {family?.familyName}{guardian ? ` · Guardian ${guardian.name.split(' ')[0]}` : ''} · Assigned to {escalation.assignedTo}
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-md bg-accent-soft/40 p-3 text-body-sm text-ink">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={1.75} />
        <span><span className="font-semibold">Recommended:</span> {escalation.recommendedAction}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {resolved ? (
          <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-success"><Check className="h-4 w-4" strokeWidth={2.5} /> {STATUS_LABEL.resolved}</span>
        ) : (
          <>
            <a href={`tel:${family?.phone.replace(/\s/g, '')}`} className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-sm border border-ink/15 px-3.5 text-body-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><Phone className="h-4 w-4 text-green" strokeWidth={1.75} /> Call family</a>
            <button type="button" onClick={() => { setResolved(true); toast('Escalation resolved.') }} className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-sm bg-ink px-3.5 text-body-sm font-semibold text-ivory transition-colors hover:bg-green-hover"><Check className="h-4 w-4" strokeWidth={2} /> Resolve</button>
            <span className="ml-1 text-caption text-muted">{STATUS_LABEL[escalation.status]}</span>
          </>
        )}
        <Link href={`/console/families/${escalation.familyId}`} className="ml-auto inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">Open profile <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
      </div>
    </article>
  )
}
