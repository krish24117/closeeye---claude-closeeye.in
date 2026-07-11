'use client'

import * as React from 'react'
import { Loader2, Lock, ShieldCheck, Phone, MapPin, Search } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { EmptyState } from '@/components/ui/states'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleGuardians, type ConsoleGuardianLive } from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'
import { cn } from '@/lib/utils'

const AVAILABLE = new Set(['available', 'active', 'online'])

export default function CareTeamPage() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [guardians, setGuardians] = React.useState<ConsoleGuardianLive[] | null>(null)
  const [q, setQ] = React.useState('')

  React.useEffect(() => {
    if (!isStaff) return
    fetchConsoleGuardians()
      .then(setGuardians)
      .catch(() => setGuardians([]))
  }, [isStaff])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Care Team</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This is only available to Close Eye team members." />
      </div>
    )
  }

  const query = q.trim().toLowerCase()
  const list = (guardians ?? []).filter((g) => (query ? `${g.name} ${g.city ?? ''}`.toLowerCase().includes(query) : true))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Care Team</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">The Guardians who bring Presence to your families.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a Guardian or a city…"
          className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
        />
      </div>

      {guardians === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={(guardians ?? []).length === 0 ? 'No Guardians visible' : 'Nothing here'}
          hint={(guardians ?? []).length === 0 ? 'Guardian profiles are visible to admins today.' : 'No Guardians match your search.'}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => {
            const online = g.status ? AVAILABLE.has(g.status.toLowerCase()) : false
            return (
              <div key={g.id} className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar initials={initialsOf(g.name)} size="md" tone="solid" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-bold text-ink">{g.name}</p>
                    {g.city && <p className="inline-flex items-center gap-1 truncate text-caption text-muted"><MapPin className="h-3 w-3" strokeWidth={1.75} /> {g.city}</p>}
                  </div>
                  {g.status && (
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold', online ? 'bg-success/12 text-success' : 'bg-muted/12 text-muted')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-success' : 'bg-muted/60')} /> {g.status}
                    </span>
                  )}
                </div>
                {g.phone && (
                  <a href={`tel:${g.phone.replace(/\s/g, '')}`} className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-line py-2 text-caption font-bold text-ink transition-colors hover:border-green/50 hover:text-green">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> Call {g.name.split(' ')[0]}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
