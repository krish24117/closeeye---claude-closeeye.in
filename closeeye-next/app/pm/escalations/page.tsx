'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, TriangleAlert, MessageCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleEscalations, type ConsoleTriageItem } from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'
import { cn } from '@/lib/utils'

export default function EscalationsPage() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [items, setItems] = React.useState<ConsoleTriageItem[] | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(() => {
    if (!isStaff) return
    setError(false)
    fetchConsoleEscalations()
      .then((r) => { setItems(r); setError(false) })
      .catch(() => { setItems(null); setError(true) })
  }, [isStaff])

  React.useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Escalations</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This is only available to Close Eye team members." />
      </div>
    )
  }

  const reds = (items ?? []).filter((t) => t.tone === 'red').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Escalations</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          Anything that needs a human decision — an urgent health question, a visit that needs attention, or a family waiting for a reply.
          {reds > 0 && <span className="font-semibold text-error"> {reds} urgent.</span>}
        </p>
      </div>

      {error ? (
        <ErrorState title="Couldn’t load escalations" message="This is a connection error — NOT an all-clear. An urgent item could be waiting. Please retry." onRetry={load} />
      ) : items === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nothing open" hint="Every family is accounted for. 💚" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          {items.map((t, i) => {
            const red = t.tone === 'red'
            const Icon = t.kind === 'message' ? MessageCircle : TriangleAlert
            return (
              <Link key={t.id} href={t.href} className={cn('flex gap-3.5 border-l-4 p-4 transition-colors hover:bg-accent-soft/20', red ? 'border-l-error bg-error/[0.03]' : 'border-l-warning', i > 0 && 'border-t border-t-line')}>
                <span className={cn('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md', red ? 'bg-error/10 text-error' : 'bg-warning/12 text-warning')}><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body-sm font-bold text-ink">{t.memberName}</p>
                    <span className={cn('rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide', red ? 'bg-error/12 text-error' : 'bg-warning/15 text-warning')}>{t.tag}</span>
                  </div>
                  <p className="mt-1 text-body-sm text-ink">{t.text}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-caption font-bold text-green">Open the family <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
