'use client'

import * as React from 'react'
import { Loader2, Lock, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminFamilies, type AdminFamily } from '@/lib/db/admin'
import {
  fetchPresenceManagers,
  fetchFamilyManagerMap,
  setFamilyManager,
  promotePresenceManager,
  demotePresenceManager,
  type PresenceManagerLite,
} from '@/lib/db/assignments'
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
  const toast = useToast()
  const [families, setFamilies] = React.useState<AdminFamily[] | null>(null)
  const [error, setError] = React.useState(false)
  const [tab, setTab] = React.useState<Tab>('all')
  const [q, setQ] = React.useState('')
  const [managers, setManagers] = React.useState<PresenceManagerLite[]>([])
  const [managerMap, setManagerMap] = React.useState<Map<string, string>>(new Map())
  const [saving, setSaving] = React.useState<string | null>(null)
  const [pmEmail, setPmEmail] = React.useState('')
  const [pmBusy, setPmBusy] = React.useState(false)

  const load = React.useCallback(() => {
    if (!isAdmin) return
    setError(false)
    fetchAdminFamilies().then((x) => { setFamilies(x); setError(false) }).catch(() => { setFamilies(null); setError(true) })
    fetchPresenceManagers().then(setManagers).catch(() => setManagers([]))
    fetchFamilyManagerMap().then(setManagerMap).catch(() => setManagerMap(new Map()))
  }, [isAdmin])

  React.useEffect(() => { load() }, [load])

  // Assign / reassign / clear a family's Presence Manager. Optimistic; reverts on failure.
  const changePM = React.useCallback(async (familyUserId: string, newPmId: string | null) => {
    const prev = managerMap.get(familyUserId) ?? null
    if (prev === newPmId) return
    setSaving(familyUserId)
    setManagerMap((m) => {
      const n = new Map(m)
      if (newPmId) n.set(familyUserId, newPmId); else n.delete(familyUserId)
      return n
    })
    try {
      await setFamilyManager(familyUserId, newPmId, prev, profile?.id)
    } catch {
      setManagerMap((m) => {
        const n = new Map(m)
        if (prev) n.set(familyUserId, prev); else n.delete(familyUserId)
        return n
      })
    } finally {
      setSaving(null)
    }
  }, [managerMap, profile?.id])

  const reloadPMs = React.useCallback(() => {
    fetchPresenceManagers().then(setManagers).catch(() => {})
    fetchFamilyManagerMap().then(setManagerMap).catch(() => {})
  }, [])

  const addPM = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = pmEmail.trim()
    if (!email || pmBusy) return
    setPmBusy(true)
    try {
      const r = await promotePresenceManager(email)
      toast(`${r.fullName || email} is now a Presence Manager`, 'success')
      setPmEmail('')
      reloadPMs()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add this Presence Manager.', 'info')
    } finally {
      setPmBusy(false)
    }
  }

  const removePM = async (id: string, name: string) => {
    if (pmBusy) return
    setPmBusy(true)
    try {
      await demotePresenceManager(id)
      toast(`${name ? name + ' is' : 'They are'} no longer a Presence Manager`, 'info')
      reloadPMs()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove this Presence Manager.', 'info')
    } finally {
      setPmBusy(false)
    }
  }

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

      <section className="rounded-lg border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green" strokeWidth={2} />
          <h2 className="text-body-sm font-semibold text-ink">Presence Managers</h2>
          <span className="text-caption text-muted">· {managers.length}</span>
        </div>
        <p className="mt-1 text-caption text-muted">The staff who look after families. Add someone by the email on their CloseEye account; removing them also unassigns their families.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {managers.length === 0 ? (
            <span className="text-caption text-muted">None yet.</span>
          ) : (
            managers.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-accent-soft/40 py-1 pl-3 pr-1 text-caption font-medium text-ink">
                {m.full_name || 'Unnamed'}
                <button type="button" onClick={() => void removePM(m.id, m.full_name || '')} disabled={pmBusy} aria-label={`Remove ${m.full_name || 'this manager'}`} className="grid h-5 w-5 place-items-center rounded-full text-muted transition-colors hover:bg-ink/10 hover:text-ink disabled:opacity-50">
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </span>
            ))
          )}
        </div>
        <form onSubmit={addPM} className="mt-3 flex flex-wrap items-center gap-2">
          <input value={pmEmail} onChange={(e) => setPmEmail(e.target.value)} type="email" placeholder="name@email.com" className="min-w-[14rem] flex-1 rounded-lg border border-line bg-card px-3 py-2 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
          <Button type="submit" size="sm" disabled={pmBusy || !pmEmail.trim()}>
            {pmBusy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <UserPlus className="h-4 w-4" strokeWidth={2} />} Make PM
          </Button>
        </form>
      </section>

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

      {families !== null && managers.length === 0 && (
        <p className="rounded-lg border border-line bg-accent-soft/40 px-4 py-2.5 text-caption text-muted">
          No Presence Managers yet — assignment stays disabled until you make a staff member a PM in <span className="font-semibold text-ink">Care Team</span>.
        </p>
      )}

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
            <span className="w-40 sm:w-52">Presence Manager</span>
            <span className="hidden w-24 md:block">Membership</span>
            <span className="hidden w-24 text-right lg:block">Joined</span>
          </div>
          <ul className="divide-y divide-line">
            {list.map((f) => (
              <li key={f.userId} className="flex items-center gap-3 px-5 py-3">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar initials={initialsOf(f.name)} size="sm" tone="solid" />
                  <span className="min-w-0"><span className="block truncate text-body-sm font-semibold text-ink">{f.name}</span>{f.city && <span className="block truncate text-caption text-muted">{f.city}</span>}</span>
                </span>
                <span className="flex w-40 items-center gap-1.5 sm:w-52">
                  <select
                    value={managerMap.get(f.userId) ?? ''}
                    onChange={(e) => void changePM(f.userId, e.target.value || null)}
                    disabled={saving === f.userId || managers.length === 0}
                    aria-label={`Presence Manager for ${f.name}`}
                    className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-caption text-ink focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20 disabled:opacity-60"
                  >
                    <option value="">Unassigned</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name || 'Unnamed PM'}</option>
                    ))}
                  </select>
                  {saving === f.userId && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-green" strokeWidth={2} />}
                </span>
                <span className="hidden w-24 md:block">
                  <span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', f.active ? 'bg-success/12 text-success' : 'bg-muted/12 text-muted')}>{f.active ? f.membership : '—'}</span>
                </span>
                <span className="hidden w-24 text-right text-caption text-muted lg:block">{f.joined}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
