'use client'

import * as React from 'react'
import { EscalationCard } from '@/components/console/escalation-card'
import { ESCALATIONS, TODAY_VISITS, type Escalation } from '@/lib/console-data'
import { autoEscalations } from '@/lib/visit-ops'
import { useVisitOps } from '@/features/console/use-visit-ops'

const ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const

export default function EscalationsPage() {
  const { ops } = useVisitOps()
  const all: Escalation[] = [...autoEscalations(TODAY_VISITS, ops), ...ESCALATIONS]
  const open = all.filter((e) => e.status !== 'resolved').sort((a, b) => ORDER[a.priority] - ORDER[b.priority])
  const resolved = all.filter((e) => e.status === 'resolved')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Escalations</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Anything that needs a human decision — with a recommended next step for each. Cancelling a high-priority visit raises one automatically.</p>
      </div>

      <section>
        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Needs attention · {open.length}</p>
        <div className="flex flex-col gap-3">
          {open.length > 0 ? open.map((e) => <EscalationCard key={e.id} escalation={e} />) : <p className="rounded-lg border border-line bg-card p-6 text-center text-body-sm text-muted">Nothing open — every family is accounted for. 💚</p>}
        </div>
      </section>

      {resolved.length > 0 && (
        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Resolved · {resolved.length}</p>
          <div className="flex flex-col gap-3">
            {resolved.map((e) => <EscalationCard key={e.id} escalation={e} />)}
          </div>
        </section>
      )}
    </div>
  )
}
