'use client'

import * as React from 'react'
import { IndianRupee, ShieldCheck, Users, Cog, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AUDIT, type AuditEntry } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const KIND_ICON: Record<AuditEntry['kind'], LucideIcon> = { finance: IndianRupee, care: ShieldCheck, family: Users, system: Cog, content: FileText }
type Filter = 'all' | AuditEntry['kind']
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'finance', label: 'Finance' }, { key: 'care', label: 'Care' }, { key: 'family', label: 'Family' }, { key: 'system', label: 'System' }, { key: 'content', label: 'Content' },
]

export default function AuditPage() {
  const [filter, setFilter] = React.useState<Filter>('all')
  const list = AUDIT.filter((a) => (filter === 'all' ? true : a.kind === filter))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Audit logs</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Every operational action, who did it and when — a complete, trustworthy trail.</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn('rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors', filter === f.key ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink')}>{f.label}</button>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <ul className="divide-y divide-line">
          {list.map((a) => {
            const Icon = KIND_ICON[a.kind]
            return (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm text-ink"><span className="font-semibold">{a.actor}</span> {a.action}</span>
                  <span className="block truncate text-caption text-muted">{a.target}</span>
                </span>
                <span className="shrink-0 text-caption text-muted">{a.time}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
