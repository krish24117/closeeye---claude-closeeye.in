'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, ArrowUpRight, Star, ShieldCheck, BadgeCheck, Clock, Check } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAdminCareTeam, approveApplication, rejectApplication, type AdminCareTeam } from '@/lib/db/admin'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

const APPROVED = 'approved'

export default function AdminCareTeamPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const toast = useToast()
  const [d, setD] = React.useState<AdminCareTeam | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)

  const load = React.useCallback(() => {
    if (!isAdmin) return
    fetchAdminCareTeam().then(setD).catch(() => setD(null))
  }, [isAdmin])

  React.useEffect(() => { load() }, [load])

  async function approve(id: string, name: string) {
    setBusy(id)
    try {
      await approveApplication(id)
      toast(`${name} approved — Guardian login created`, 'success')
      load()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not approve the application.', 'info')
    } finally {
      setBusy(null)
    }
  }

  async function decline(id: string, name: string) {
    setBusy(id)
    try {
      await rejectApplication(id)
      toast(`${name}'s application declined`, 'info')
      load()
    } catch {
      toast('Could not update the application.', 'info')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Care Team</h1><EmptyState icon={Lock} title="Restricted" hint="Available to administrators only." /></div>
  if (d === null) return <div className="flex flex-col gap-8"><h1 className="text-h2">Care Team</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>

  const stats = [
    { l: 'Care Team', v: String(d.companions.length) },
    { l: 'Approved', v: String(d.approved) },
    { l: 'Applications', v: String(d.pendingApplications) },
    { l: 'Avg rating', v: d.avgRating > 0 ? `${d.avgRating}★` : '—' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Care Team</h1>
          <p className="mt-1.5 text-body leading-relaxed text-muted">Guardians and Companions — verification, visits and ratings.</p>
        </div>
        <Link href="/console/guardians" className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
          <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.75} /> Availability (Presence Console)
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-lg border border-line bg-card p-4 shadow-sm"><p className="text-h3 leading-none text-ink">{s.v}</p><p className="mt-1.5 text-caption text-muted">{s.l}</p></div>
        ))}
      </div>

      {d.applications.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3">
            <Clock className="h-4 w-4 text-warning" strokeWidth={2} />
            <h2 className="text-body-sm font-semibold text-ink">Pending applications</h2>
            <span className="rounded-full bg-warning/12 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-warning">{d.applications.length}</span>
            <span className="ml-auto hidden text-caption text-muted sm:block">Approving creates a Guardian login and adds them to the Care Team.</span>
          </div>
          <ul className="divide-y divide-line">
            {d.applications.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar initials={initialsOf(a.name)} size="sm" tone="soft" />
                  <span className="min-w-0">
                    <span className="block truncate text-body-sm font-semibold text-ink">{a.name}</span>
                    <span className="block truncate text-caption text-muted">{[a.area, a.phone, a.email].filter(Boolean).join(' · ') || 'No contact details'}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => decline(a.id, a.name)} disabled={busy === a.id}>Decline</Button>
                  {a.email ? (
                    <Button size="sm" onClick={() => approve(a.id, a.name)} disabled={busy === a.id}>
                      {busy === a.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check className="h-4 w-4" strokeWidth={2} />} Approve
                    </Button>
                  ) : (
                    <span className="text-caption text-muted">Needs an email to approve</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {d.companions.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No Care Team yet" hint="Approved Guardians and Companions will appear here." />
      ) : (
        <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3 text-caption font-semibold uppercase tracking-wide text-muted">
            <span className="flex-1">Member</span>
            <span className="hidden w-28 sm:block">Status</span>
            <span className="hidden w-24 sm:block">Visits</span>
            <span className="w-20 text-right">Rating</span>
          </div>
          <ul className="divide-y divide-line">
            {d.companions.map((c) => {
              const approved = c.status === APPROVED
              return (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar initials={initialsOf(c.name)} size="sm" tone="solid" />
                    <span className="min-w-0"><span className="block truncate text-body-sm font-semibold text-ink">{c.name}</span>{c.city && <span className="block truncate text-caption text-muted">{c.city}</span>}</span>
                  </span>
                  <span className="hidden w-28 sm:block">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', approved ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning')}>
                      {approved && <BadgeCheck className="h-3 w-3" strokeWidth={2} />} {c.status ?? 'pending'}
                    </span>
                  </span>
                  <span className="hidden w-24 text-body-sm text-ink sm:block">{c.visits}</span>
                  <span className="w-20 text-right text-body-sm text-ink">{c.rating != null ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" strokeWidth={0} /> {c.rating}</span> : '—'}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
