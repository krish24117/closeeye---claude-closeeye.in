'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarClock, Clock, Loader2, MapPin } from 'lucide-react'
import { Greeting } from '@/components/family/greeting'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { EmptyState } from '@/components/ui/states'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchGuardianVisits, type GuardianVisit } from '@/lib/db/guardian'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Assigned',
  companion_assigned: 'Assigned',
  on_the_way: 'On the way',
  in_progress: 'In progress',
  pending: 'Pending',
  requested: 'Requested',
}

function fmtWhen(iso: string | null): string {
  if (!iso) return 'Time to be confirmed'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
    })
  } catch {
    return '—'
  }
}

export default function GuardianHome() {
  const { user } = useAuth()
  const [visits, setVisits] = React.useState<GuardianVisit[] | null>(null)

  React.useEffect(() => {
    if (!user?.id) {
      setVisits([])
      return
    }
    fetchGuardianVisits(user.id)
      .then(setVisits)
      .catch(() => setVisits([]))
  }, [user?.id])

  return (
    <div className="flex flex-col gap-6">
      <Greeting subtitle="Thank you for caring today." />

      {visits === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      ) : visits.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No visits assigned yet"
          hint="When a family's visit is assigned to you, it will appear here with everything you need."
        />
      ) : (
        <>
          <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
            <p className="text-h4 text-ink">{visits.length} {visits.length === 1 ? 'visit' : 'visits'} ahead</p>
            <p className="mt-1 text-body-sm leading-relaxed text-muted">You&apos;re making a real difference — one visit at a time.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-caption text-muted">
              <Clock className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Next · {fmtWhen(visits[0]!.scheduledAt)} with {visits[0]!.memberName}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h4">Your visits</h2>
            {visits.map((v) => (
              <Link
                key={v.id}
                href={`/guardian/visits/${v.id}`}
                className="flex items-center gap-3.5 rounded-lg border border-line bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
              >
                <Avatar initials={initialsOf(v.memberName)} size="lg" tone="solid" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{v.memberName}</p>
                  <p className="truncate text-caption text-muted">{v.service} · {fmtWhen(v.scheduledAt)}</p>
                  {v.address && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-caption text-muted">
                      <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} /> {v.address}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-caption font-semibold text-green">
                  {STATUS_LABEL[v.status] ?? v.status}
                </span>
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
