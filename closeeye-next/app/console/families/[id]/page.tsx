'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Lock, Users, Phone } from 'lucide-react'
import { AdminMessageThread } from '@/components/console/admin-message-thread'
import { Avatar } from '@/components/family/avatar'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchConsoleFamilyDetail, type ConsoleFamilyDetail } from '@/lib/db/console'
import { canUseConsole } from '@/lib/roles'

export default function ConsoleFamilyWorkspace() {
  const params = useParams<{ id: string }>()
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [detail, setDetail] = React.useState<ConsoleFamilyDetail | null | undefined>(undefined)

  React.useEffect(() => {
    if (!isStaff || !params.id) return
    fetchConsoleFamilyDetail(params.id)
      .then(setDetail)
      .catch(() => setDetail(null))
  }, [isStaff, params.id])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }
  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">In your care</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This is only available to Close Eye team members." />
      </div>
    )
  }

  const back = (
    <Link href="/console/families" className="inline-flex items-center gap-1.5 self-start text-caption font-semibold text-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> In your care
    </Link>
  )

  if (detail === undefined) {
    return <div className="flex flex-col gap-5">{back}<div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>
  }
  if (detail === null) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <EmptyState icon={Users} title="Family not found" hint="This family member may have been removed." action={<Button asChild><Link href="/console/families">Back to families</Link></Button>} />
      </div>
    )
  }

  const metaLine = [detail.relationship, detail.age ? `${detail.age}` : null, detail.city].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-5">
      {back}

      <header className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-card p-5 shadow-sm">
        <Avatar initials={initialsOf(detail.meta.lovedOneName)} size="lg" tone="solid" />
        <div className="min-w-0 flex-1">
          <h1 className="text-h3">{detail.meta.lovedOneName}</h1>
          <p className="mt-0.5 text-body-sm text-muted">{detail.meta.familyName}{metaLine ? ` · ${metaLine}` : ''}</p>
        </div>
        {detail.phone && (
          <Button asChild variant="secondary" size="sm">
            <a href={`tel:${detail.phone.replace(/\s/g, '')}`}><Phone className="h-4 w-4" strokeWidth={1.75} /> Call family</a>
          </Button>
        )}
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminMessageThread thread={detail.meta} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
            <p className="text-caption font-bold uppercase tracking-widest text-green">Next Presence</p>
            <p className="mt-2 text-body-sm font-semibold text-ink">{detail.nextVisitLabel ?? 'No visit scheduled'}</p>
            {detail.nextGuardian && <p className="mt-0.5 text-caption text-muted">{detail.nextGuardian} · in person</p>}
          </div>

          {detail.glance.length > 0 && (
            <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
              <p className="text-caption font-bold uppercase tracking-widest text-green">At a glance</p>
              <dl className="mt-2 flex flex-col">
                {detail.glance.map((g) => (
                  <div key={g.label} className="flex justify-between gap-4 border-t border-line py-2 text-caption first:border-t-0">
                    <dt className="shrink-0 text-muted">{g.label}</dt>
                    <dd className="text-right font-semibold text-ink">{g.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
