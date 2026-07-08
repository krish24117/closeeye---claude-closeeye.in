import Link from 'next/link'
import { CalendarCheck, Pill, CalendarClock, HeartHandshake } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { MoodBadge, MedBadge } from '@/components/family/badges'
import { todayStatus } from '@/lib/family-data'

/** Today's Status — the first thing a family sees. Reassurance, at a glance. */
export function StatusCard({ status }: { status: ReturnType<typeof todayStatus> }) {
  const { member } = status
  const stats = [
    { icon: CalendarCheck, label: 'Last visit', value: status.lastVisitLabel },
    { icon: HeartHandshake, label: 'Mood', node: <MoodBadge mood={status.mood} /> },
    { icon: Pill, label: 'Medication', node: <MedBadge state={status.medication} /> },
    { icon: CalendarClock, label: 'Next visit', value: status.nextVisitLabel },
  ]

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm" aria-label="Today's status">
      <div className="flex items-center gap-4 bg-accent-soft/50 px-6 py-6 sm:px-8">
        <Avatar initials={member.initials} size="lg" tone="solid" />
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-widest text-green">Today</p>
          <h2 className="text-h3 text-ink">{status.headline}</h2>
          <p className="mt-0.5 text-body-sm text-muted">
            {member.relationship} · {member.city}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex flex-col gap-2 bg-card px-6 py-5">
              <dt className="flex items-center gap-2 text-caption text-muted">
                <Icon className="h-4 w-4 text-green" strokeWidth={1.5} /> {s.label}
              </dt>
              <dd className="text-body font-semibold text-ink">{s.node ?? s.value}</dd>
            </div>
          )
        })}
      </dl>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4 sm:px-8">
        <p className="text-body-sm text-muted">Everything looks steady. You can rest easy.</p>
        <Link href={`/family/visits/${status.lastVisit?.id ?? ''}`} className="shrink-0 text-body-sm font-semibold text-green hover:underline">
          Latest update →
        </Link>
      </div>
    </section>
  )
}
