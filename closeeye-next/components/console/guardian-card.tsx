'use client'

import { Star, Phone, MessageCircle, MapPin } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { useToast } from '@/components/ui/toast'
import type { ConsoleGuardian, GuardianStatus } from '@/lib/console-data'
import { cn } from '@/lib/utils'

const STATUS: Record<GuardianStatus, { label: string; dot: string; text: string }> = {
  'on-visit': { label: 'On a visit', dot: 'bg-green', text: 'text-green' },
  available: { label: 'Available', dot: 'bg-success', text: 'text-success' },
  off: { label: 'Off today', dot: 'bg-muted', text: 'text-muted' },
}

/** GuardianCard — one Guardian in the directory: status, load, rating, training. */
export function GuardianCard({ guardian }: { guardian: ConsoleGuardian }) {
  const toast = useToast()
  const s = STATUS[guardian.status]
  return (
    <article className="flex flex-col rounded-lg border border-line bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <Avatar initials={guardian.initials} size="md" />
          <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card', s.dot)} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{guardian.name}</p>
          <span className={cn('mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide', guardian.role === 'companion' ? 'bg-success/12 text-success' : 'bg-accent-soft text-green')}>
            {guardian.role === 'companion' ? 'Companion' : 'Guardian'}
          </span>
          <p className={cn('mt-1 inline-flex items-center gap-1.5 text-caption font-medium', s.text)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} /> {guardian.availabilityLabel}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-green">
          <Star className="h-3 w-3 fill-current" strokeWidth={0} /> {guardian.rating}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center text-caption">
        <div><dt className="text-muted">Today</dt><dd className="font-semibold text-ink">{guardian.visitsToday}</dd></div>
        <div><dt className="text-muted">On-time</dt><dd className="font-semibold text-ink">{guardian.onTimeRate}</dd></div>
        <div><dt className="text-muted">Exp.</dt><dd className="font-semibold text-ink">{guardian.experience}</dd></div>
      </dl>

      {guardian.currentFamily && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-caption text-muted">
          <MapPin className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> With the {guardian.currentFamily}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {guardian.training.map((t) => (
          <span key={t} className="rounded-full border border-line px-2 py-0.5 text-[0.65rem] font-medium text-muted">{t}</span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href={`tel:${guardian.phone.replace(/\s/g, '')}`} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><Phone className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Call</a>
        <button type="button" onClick={() => toast(`Message sent to ${guardian.name.split(' ')[0]}.`)} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"><MessageCircle className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> Message</button>
        <button type="button" onClick={() => toast(`${guardian.name.split(' ')[0]} assigned to the next open visit.`)} disabled={guardian.status === 'off'} className="flex min-h-[2.5rem] items-center justify-center gap-1.5 rounded-sm border border-ink/15 text-caption font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-ink/[0.03] disabled:opacity-40">Assign</button>
      </div>
    </article>
  )
}
