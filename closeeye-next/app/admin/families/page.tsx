'use client'

import * as React from 'react'
import { Loader2, Lock, Search, Users } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminFamilies, type AdminFamily } from '@/lib/db/admin'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'members' | 'none'
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'members', label: 'Active membership' },
  { key: 'none', label: 'No plan' },
]

export default function AdminFamiliesPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [families, setFamilies] = React.useState<AdminFamily[] | null>(null)
  const [error, setError] = React.useState(false)
  const [tab, setTab] = React.useState<Tab>('all')
  const [q, setQ] = React.useState('')

  const load = React.useCallback(() => {
    if (!isAdmin) return
    setError(false)
    fetchAdminFamilies().then((x) => { setFamilies(x); setError(false) }).catch(() => { setFamilies(null); setError(true) })
  }, [isAdmin])

  React.useEffect(() => { load() }, [load])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Families</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>

  const query = q.trim().toLowerCase()
  const list = (families ?? [])
    .filter((f) => (tab === 'members' ? f.active : tab === 'none' ? !f.active : true))
    .filter((f) => (query ? `${f.name} ${f.city ?? ''}`.toLowerCase().includes(query) : true))
  const activeCount = (families ?? []).filter((f) => f.active).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Families</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          Every family, by membership status.
          {families && <> {families.length} total · <span className="font-semibold text-success">{activeCount} on a plan</span>.</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-card p-1">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn('rounded-full px-3.5 py-1.5 text-caption font-semibold transition-colors', tab === t.key ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>{t.label}</button>
          ))}
        </div>
        <div className="relative min-w-[12rem] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search families or a city…" className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
        </div>
      </div>

      {error ? (
        <ErrorState title="Couldn’t load families" message="A connection error — please retry." onRetry={load} />
      ) : families === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title={(families ?? []).length === 0 ? 'No families yet' : 'Nothing here'} hint={(families ?? []).length === 0 ? 'Families will appear here as they sign up.' : 'No families match your search or filter.'} />
      ) : (
        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3 text-caption font-semibold uppercase tracking-wide text-muted">
            <span className="flex-1">Family</span>
            <span className="hidden w-24 sm:block">Members</span>
            <span className="hidden w-28 sm:block">Membership</span>
            <span className="w-28 text-right">Joined</span>
          </div>
          <ul className="divide-y divide-line">
            {list.map((f) => (
              <li key={f.userId} className="flex items-center gap-3 px-5 py-3">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar initials={initialsOf(f.name)} size="sm" tone="solid" />
                  <span className="min-w-0"><span className="block truncate text-body-sm font-semibold text-ink">{f.name}</span>{f.city && <span className="block truncate text-caption text-muted">{f.city}</span>}</span>
                </span>
                <span className="hidden w-24 text-body-sm text-ink sm:block">{f.members}</span>
                <span className="hidden w-28 sm:block">
                  <span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', f.active ? 'bg-success/12 text-success' : 'bg-muted/12 text-muted')}>{f.active ? f.membership : '—'}</span>
                </span>
                <span className="w-28 text-right text-caption text-muted">{f.joined}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
