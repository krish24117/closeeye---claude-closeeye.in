'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
import { GuardianCard } from '@/components/console/guardian-card'
import { GUARDIANS, type CareRole, type GuardianStatus } from '@/lib/console-data'
import { cn } from '@/lib/utils'

type RoleTab = 'all' | CareRole
type Avail = 'all' | GuardianStatus

const TABS: { key: RoleTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'guardian', label: 'Guardians' },
  { key: 'companion', label: 'Companions' },
]
const AVAIL: { key: Avail; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'on-visit', label: 'On visit' },
  { key: 'off', label: 'Off duty' },
]

function expYears(s: string) {
  return parseInt(s, 10) || 0
}

export function CareTeamDirectory() {
  const [tab, setTab] = React.useState<RoleTab>('all')
  const [avail, setAvail] = React.useState<Avail>('all')
  const [area, setArea] = React.useState('all')
  const [minExp, setMinExp] = React.useState(0)
  const [q, setQ] = React.useState('')

  const areas = React.useMemo(() => Array.from(new Set(GUARDIANS.map((g) => g.area))).sort(), [])
  const query = q.trim().toLowerCase()
  const list = GUARDIANS.filter((g) => (tab === 'all' ? true : g.role === tab))
    .filter((g) => (avail === 'all' ? true : g.status === avail))
    .filter((g) => (area === 'all' ? true : g.area === area))
    .filter((g) => expYears(g.experience) >= minExp)
    .filter((g) => (query ? g.name.toLowerCase().includes(query) : true))

  return (
    <div className="flex flex-col gap-5">
      {/* Role tabs */}
      <div className="inline-flex w-full max-w-sm rounded-full border border-line bg-card p-1">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn('flex-1 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors', tab === t.key ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-3 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
        </div>
        <div className="flex items-center gap-1.5">
          {AVAIL.map((a) => (
            <button key={a.key} type="button" onClick={() => setAvail(a.key)} className={cn('rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors', avail === a.key ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink')}>
              {a.label}
            </button>
          ))}
        </div>
        <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-ink focus:border-green focus:outline-none">
          <option value="all">All locations</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={minExp} onChange={(e) => setMinExp(Number(e.target.value))} className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-ink focus:border-green focus:outline-none">
          <option value={0}>Any experience</option>
          <option value={1}>1+ years</option>
          <option value={2}>2+ years</option>
          <option value={3}>3+ years</option>
        </select>
      </div>

      {/* Cards */}
      {list.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => <GuardianCard key={g.id} guardian={g} />)}
        </div>
      ) : (
        <p className="py-10 text-center text-body-sm text-muted">No one matches these filters.</p>
      )}
    </div>
  )
}
