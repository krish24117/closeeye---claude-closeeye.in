import Link from 'next/link'
import { Navigation, Phone, Headset, Clock, MapPin, ChevronRight, Home, HeartPulse, Sparkles, Car, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { StatusBadge, type StatusTone } from '@/components/family/badges'
import { PRESENCE_MANAGER, type GuardianVisit } from '@/lib/guardian-data'
import { cn } from '@/lib/utils'

const STATUS: Record<GuardianVisit['status'], { tone: StatusTone; label: string }> = {
  upcoming: { tone: 'info', label: 'Upcoming' },
  'en-route': { tone: 'info', label: 'En route' },
  'in-progress': { tone: 'attention', label: 'In progress' },
  completed: { tone: 'positive', label: 'Completed' },
}

/** Restrained visit-type badge — icon differentiates, colour stays in the green family. */
function visitType(service: string): { label: string; icon: LucideIcon } {
  const s = service.toLowerCase()
  if (s.includes('hospital')) return { label: 'Hospital Companion', icon: HeartPulse }
  if (s.includes('custom')) return { label: 'Custom Request', icon: Sparkles }
  return { label: 'Wellbeing Visit', icon: Home }
}

const mapsLink = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`

export function VisitCard({ visit }: { visit: GuardianVisit }) {
  const s = STATUS[visit.status]
  const type = visitType(visit.service)
  const familyPhone = visit.emergencyContacts[0]?.phone
  const done = visit.status === 'completed'

  return (
    <article className={cn('overflow-hidden rounded-lg border border-line bg-card shadow-sm transition-shadow', !done && 'hover:shadow-md', done && 'opacity-75')}>
      <Link href={`/guardian/visits/${visit.id}`} className="block p-5 transition-colors hover:bg-accent-soft/30">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-baseline gap-1.5">
            <Clock className="h-4 w-4 shrink-0 translate-y-0.5 text-green" strokeWidth={2} />
            <span className="text-body font-bold text-ink">{visit.timeLabel}</span>
            <span className="text-caption text-muted">· {visit.durationLabel}</span>
          </span>
          <StatusBadge label={s.label} tone={s.tone} dot={false} />
        </div>

        <div className="mt-4 flex items-center gap-3.5">
          <Avatar initials={visit.memberInitials} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-h4 leading-snug text-ink">{visit.memberName}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-semibold text-green">
              <type.icon className="h-3.5 w-3.5" strokeWidth={1.75} /> {type.label}
            </span>
            <p className="mt-1.5 text-caption text-muted">{visit.relationship} · {visit.age} · {visit.familyName}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.5} />
        </div>

        <div className="mt-3.5 flex flex-col gap-1.5 text-body-sm text-muted">
          <span className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={1.5} /> {visit.address}
          </span>
          {!done && (
            <span className="flex items-center gap-2 pl-6 text-caption">
              <Car className="h-3.5 w-3.5 text-green" strokeWidth={1.75} />
              <span className="font-semibold text-ink">{visit.distanceLabel}</span>
              {visit.driveLabel && <span>· {visit.driveLabel}</span>}
            </span>
          )}
        </div>
      </Link>

      {done ? (
        <p className="flex items-center justify-center gap-1.5 border-t border-line py-3.5 text-body-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> Visit completed
        </p>
      ) : (
        <div className="flex flex-col gap-2.5 border-t border-line p-3">
          <a
            href={mapsLink(visit.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-sm bg-ink text-ivory text-body font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          >
            <Navigation className="h-5 w-5" strokeWidth={1.75} /> Navigate
          </a>
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={familyPhone ? `tel:${familyPhone.replace(/\s/g, '')}` : undefined}
              className="flex min-h-[3rem] items-center justify-center gap-2 rounded-sm border border-ink/15 text-body-sm font-semibold text-ink transition-colors hover:border-ink/35 hover:bg-ink/[0.03]"
            >
              <Phone className="h-4 w-4" strokeWidth={1.75} /> Call family
            </a>
            <a
              href={`tel:${PRESENCE_MANAGER.phone.replace(/\s/g, '')}`}
              className="flex min-h-[3rem] items-center justify-center gap-2 rounded-sm border border-ink/15 text-body-sm font-semibold text-ink transition-colors hover:border-ink/35 hover:bg-ink/[0.03]"
            >
              <Headset className="h-4 w-4" strokeWidth={1.75} /> Call PM
            </a>
          </div>
        </div>
      )}
    </article>
  )
}
