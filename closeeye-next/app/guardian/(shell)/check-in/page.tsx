'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, CheckCircle2, Clock, Loader2, MapPin, Navigation } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchGuardianVisits, type GuardianVisit } from '@/lib/db/guardian'

const mapsLink = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

function fmtTime(iso: string | null): string {
  if (!iso) return 'Time to be confirmed'
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return '—'
  }
}

/** Check In tab — the launchpad into your next real visit. */
export default function CheckInPage() {
  const { user } = useAuth()
  const [visits, setVisits] = React.useState<GuardianVisit[] | undefined>(undefined)

  React.useEffect(() => {
    if (!user?.id) {
      setVisits([])
      return
    }
    fetchGuardianVisits(user.id).then(setVisits).catch(() => setVisits([]))
  }, [user?.id])

  if (visits === undefined) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  const active = visits.filter((v) => v.status !== 'completed' && v.status !== 'cancelled')
  const next = active[0]
  const later = active.slice(1)

  if (!next) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 py-8 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-success/12 text-success">
          <CheckCircle2 className="h-10 w-10" strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="text-h2 text-ink">No visit to check into</h1>
          <p className="mt-2 text-body leading-relaxed text-muted">When a visit is assigned to you, it&apos;ll appear here ready to begin.</p>
        </div>
        <Button asChild variant="secondary" size="lg">
          <Link href="/guardian"><CalendarDays className="h-5 w-5" strokeWidth={1.75} /> Back to today</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-ink">Ready when you are</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Your next visit is below. Begin whenever you reach the door.</p>
      </div>

      {/* Next visit — hero */}
      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <div className="bg-accent-soft/40 px-5 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-green">
            <Clock className="h-3.5 w-3.5" strokeWidth={2} /> Next · {fmtTime(next.scheduledAt)}
          </span>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3.5">
            <Avatar initials={initialsOf(next.memberName)} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-h3 leading-snug text-ink">{next.memberName}</p>
              <p className="mt-1 text-caption text-muted">{next.service}</p>
            </div>
          </div>
          {next.address && (
            <p className="mt-4 flex items-center gap-2 text-body-sm text-muted">
              <MapPin className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} /><span>{next.address}</span>
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2.5">
            <Button asChild size="lg" className="w-full">
              <Link href={`/guardian/visits/${next.id}`}>Begin check-in <ArrowRight className="h-5 w-5" strokeWidth={2} /></Link>
            </Button>
            {next.address && (
              <Button asChild variant="secondary" size="sm">
                <a href={mapsLink(next.address)} target="_blank" rel="noopener noreferrer"><Navigation className="h-4 w-4" strokeWidth={1.75} /> Directions</a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Later today */}
      {later.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-h4">Later today</h2>
          {later.map((v) => (
            <Link key={v.id} href={`/guardian/visits/${v.id}`} className="flex items-center gap-3.5 rounded-lg border border-line bg-card p-4 shadow-sm transition-colors hover:border-accent">
              <Avatar initials={initialsOf(v.memberName)} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-semibold text-ink">{v.memberName}</p>
                <p className="text-caption text-muted">{fmtTime(v.scheduledAt)} · {v.service}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
