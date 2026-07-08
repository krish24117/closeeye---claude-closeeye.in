'use client'

import * as React from 'react'
import { Search, Mail, Bell, Download } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { useToast } from '@/components/ui/toast'
import { FAMILIES } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

type Membership = 'active' | 'trial' | 'expired'
type Tab = 'all' | 'active' | 'trial' | 'expired' | 'priority' | 'renewals'

// Derive a business membership status from the operational roster.
function membershipOf(i: number): Membership {
  if (i === 3) return 'trial'
  if (i === 6) return 'expired'
  return 'active'
}
const M_TONE: Record<Membership, string> = { active: 'bg-success/12 text-success', trial: 'bg-accent-soft text-green', expired: 'bg-error/10 text-error' }

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'trial', label: 'Trial' },
  { key: 'expired', label: 'Expired' }, { key: 'priority', label: 'High priority' }, { key: 'renewals', label: 'Renewals' },
]

export default function AdminFamiliesPage() {
  const toast = useToast()
  const rows = FAMILIES.map((f, i) => ({ ...f, membership: membershipOf(i), renewal: i % 3 === 0 }))
  const [tab, setTab] = React.useState<Tab>('all')
  const [q, setQ] = React.useState('')
  const [sel, setSel] = React.useState<string[]>([])

  const query = q.trim().toLowerCase()
  const list = rows
    .filter((f) => {
      if (tab === 'priority') return f.status === 'red' || f.status === 'yellow'
      if (tab === 'renewals') return f.renewal
      if (tab === 'active' || tab === 'trial' || tab === 'expired') return f.membership === tab
      return true
    })
    .filter((f) => (query ? `${f.familyName} ${f.memberName} ${f.area}`.toLowerCase().includes(query) : true))

  const allSel = list.length > 0 && list.every((f) => sel.includes(f.id))
  function toggleAll() { setSel(allSel ? [] : list.map((f) => f.id)) }
  function toggle(id: string) { setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])) }
  function bulk(label: string) { toast(`${label} sent to ${sel.length} ${sel.length === 1 ? 'family' : 'families'}.`); setSel([]) }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Families</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Every family, by membership status. Search, filter and act in bulk.</p>
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-card p-1">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn('rounded-full px-3.5 py-1.5 text-caption font-semibold transition-colors', tab === t.key ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>{t.label}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search families…" className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
        </div>
        {sel.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-caption font-semibold text-muted">{sel.length} selected</span>
            <button type="button" onClick={() => bulk('Renewal reminder')} className="inline-flex items-center gap-1.5 rounded-sm border border-ink/15 px-3 py-2 text-caption font-semibold text-ink hover:bg-ink/[0.03]"><Bell className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Renewal reminder</button>
            <button type="button" onClick={() => bulk('Email')} className="inline-flex items-center gap-1.5 rounded-sm border border-ink/15 px-3 py-2 text-caption font-semibold text-ink hover:bg-ink/[0.03]"><Mail className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Email</button>
            <button type="button" onClick={() => bulk('Export')} className="inline-flex items-center gap-1.5 rounded-sm border border-ink/15 px-3 py-2 text-caption font-semibold text-ink hover:bg-ink/[0.03]"><Download className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Export</button>
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3 text-caption font-semibold uppercase tracking-wide text-muted">
          <input type="checkbox" checked={allSel} onChange={toggleAll} className="h-4 w-4 accent-green" aria-label="Select all" />
          <span className="flex-1">Family</span>
          <span className="hidden w-28 sm:block">Membership</span>
          <span className="hidden w-24 sm:block">Satisfaction</span>
          <span className="w-20 text-right">Renewal</span>
        </div>
        <ul className="divide-y divide-line">
          {list.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-5 py-3">
              <input type="checkbox" checked={sel.includes(f.id)} onChange={() => toggle(f.id)} className="h-4 w-4 accent-green" aria-label={`Select ${f.memberName}`} />
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar initials={f.memberInitials} size="sm" />
                <span className="min-w-0"><span className="block truncate text-body-sm font-semibold text-ink">{f.memberName}</span><span className="block truncate text-caption text-muted">{f.familyName} · {f.area}</span></span>
              </span>
              <span className="hidden w-28 sm:block"><span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', M_TONE[f.membership])}>{f.membership}</span></span>
              <span className="hidden w-24 text-body-sm font-medium text-ink sm:block">{f.satisfaction}%</span>
              <span className="w-20 text-right text-caption text-muted">{f.renewal ? 'Due soon' : '—'}</span>
            </li>
          ))}
          {list.length === 0 && <li className="px-5 py-8 text-center text-body-sm text-muted">No families match.</li>}
        </ul>
      </section>
    </div>
  )
}
