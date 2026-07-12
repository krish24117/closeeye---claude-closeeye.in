'use client'

import * as React from 'react'
import { Loader2, Lock, UserPlus, Search, Mail, Phone, MapPin } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminLeads, type AdminLead, type LeadSource } from '@/lib/db/admin'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

type Filter = 'all' | LeadSource

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'waitlist', label: 'Waitlist' },
  { key: 'consultation', label: 'Consultation' },
  { key: 'custom_care', label: 'Custom care' },
  { key: 'survey', label: 'Survey' },
]

export default function AdminLeadsPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [leads, setLeads] = React.useState<AdminLead[] | null>(null)
  const [error, setError] = React.useState(false)
  const [filter, setFilter] = React.useState<Filter>('all')
  const [q, setQ] = React.useState('')

  const load = React.useCallback(() => {
    if (!isAdmin) return
    setError(false)
    fetchAdminLeads().then((x) => { setLeads(x); setError(false) }).catch(() => { setLeads(null); setError(true) })
  }, [isAdmin])

  React.useEffect(() => { load() }, [load])

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Leads</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>

  const all = leads ?? []
  const countBy = (k: Filter) => (k === 'all' ? all.length : all.filter((l) => l.source === k).length)
  const query = q.trim().toLowerCase()
  const list = all
    .filter((l) => (filter === 'all' ? true : l.source === filter))
    .filter((l) => (query ? `${l.name} ${l.email ?? ''} ${l.phone ?? ''} ${l.city ?? ''} ${l.detail}`.toLowerCase().includes(query) : true))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Leads</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Everyone who&rsquo;s raised their hand — waitlist, consultations, custom-care enquiries and surveys. Newest first.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[12rem] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, city, email…"
            className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors',
                filter === key ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink',
              )}
            >
              {label} <span className={cn('ml-1', filter === key ? 'text-ivory/80' : 'text-muted/70')}>{countBy(key)}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState title="Couldn’t load leads" message="A connection error — please retry." onRetry={load} />
      ) : leads === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={all.length === 0 ? 'No leads yet' : 'Nothing matches'}
          hint={all.length === 0 ? 'Waitlist signups, consultation and custom-care requests will appear here.' : 'Try a different search or filter.'}
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {list.map((l) => (
            <li key={l.id} className="flex items-start gap-3.5 rounded-lg border border-line bg-card p-4 shadow-sm">
              <Avatar initials={initialsOf(l.name)} size="sm" tone="solid" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-body-sm font-semibold text-ink">{l.name}</span>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-green">{l.sourceLabel}</span>
                  {l.city && <span className="inline-flex items-center gap-1 text-caption text-muted"><MapPin className="h-3 w-3" strokeWidth={1.75} />{l.city}</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-body-sm text-muted">{l.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption">
                  {l.email && <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 font-medium text-green hover:underline"><Mail className="h-3.5 w-3.5" strokeWidth={1.75} />{l.email}</a>}
                  {l.phone && <a href={`tel:${l.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 font-medium text-green hover:underline"><Phone className="h-3.5 w-3.5" strokeWidth={1.75} />{l.phone}</a>}
                </div>
              </div>
              <span className="shrink-0 text-caption text-muted">{l.at}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
