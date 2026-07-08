'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { getLocalPhoto } from '@/lib/local-photos'
import type { LovedOne } from '@/lib/db/types'
import { cn } from '@/lib/utils'

/** Initials from a full name (first two words) — the default avatar. */
export function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return (p.slice(0, 2).map((s) => s[0]).join('') || '·').toUpperCase()
}

type BadgeTone = 'grey' | 'green' | 'yellow'

function Badge({ value, tone }: { value: string; tone: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold',
        tone === 'green' ? 'bg-success/12 text-success' : tone === 'yellow' ? 'bg-warning/12 text-warning' : 'bg-ink/[0.06] text-muted',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'green' ? 'bg-success' : tone === 'yellow' ? 'bg-warning' : 'bg-muted/60')} />
      {value}
    </span>
  )
}

/** A family member, from real Supabase data, with at-a-glance status badges. */
export function LovedOneCard({ lo }: { lo: LovedOne }) {
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => { setPhoto(getLocalPhoto(lo.id)) }, [lo.id])

  const healthComplete = Boolean(lo.medical_notes?.trim() && lo.phone_number?.trim() && lo.emergency_contact_name?.trim())
  const meta = [lo.relationship, lo.city].filter(Boolean).join(' · ')

  const rows: { label: string; value: string; tone: BadgeTone }[] = [
    { label: 'Membership', value: 'Inactive', tone: 'grey' },
    { label: 'Health profile', value: healthComplete ? 'Complete' : 'Incomplete', tone: healthComplete ? 'green' : 'yellow' },
    { label: 'Next visit', value: 'Not scheduled', tone: 'grey' },
  ]

  return (
    <article className="ce-fade-in overflow-hidden rounded-[20px] border border-line bg-card shadow-sm">
      <header className="flex items-center gap-5 px-7 pb-6 pt-7">
        <Avatar initials={initialsOf(lo.full_name)} src={photo} alt={lo.full_name} size="xl" tone="solid" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-h3 leading-tight text-ink">{lo.full_name}</h2>
          {meta && <p className="mt-1 truncate text-body-sm text-muted">{meta}</p>}
        </div>
        <Link
          href="/family/add"
          aria-label={`Edit ${lo.full_name}`}
          className="grid h-9 w-9 shrink-0 -mt-1 self-start place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </header>
      <dl className="divide-y divide-line border-t border-line px-7">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 py-3.5">
            <dt className="text-body-sm text-muted">{r.label}</dt>
            <dd><Badge value={r.value} tone={r.tone} /></dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
