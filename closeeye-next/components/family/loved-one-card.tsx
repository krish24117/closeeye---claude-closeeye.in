'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { getLocalPhoto } from '@/lib/local-photos'
import type { LovedOne } from '@/lib/db/types'
import { cn } from '@/lib/utils'

/** Initials from a full name (first two words). */
export function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return (p.slice(0, 2).map((s) => s[0]).join('') || '·').toUpperCase()
}

type Tone = 'ok' | 'warn' | 'muted'

function StatusRow({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <span className="text-body-sm text-muted">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold',
          tone === 'ok' ? 'bg-success/12 text-success' : tone === 'warn' ? 'bg-warning/12 text-warning' : 'bg-ink/[0.05] text-muted',
        )}
      >
        <span className={cn('h-1.5 w-1.5 rounded-full', tone === 'ok' ? 'bg-success' : tone === 'warn' ? 'bg-warning' : 'bg-muted')} />
        {value}
      </span>
    </div>
  )
}

/** A family member, from real Supabase data, with at-a-glance status. */
export function LovedOneCard({ lo }: { lo: LovedOne }) {
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => { setPhoto(getLocalPhoto(lo.id)) }, [lo.id])

  const healthComplete = Boolean(lo.medical_notes?.trim() && lo.phone_number?.trim() && lo.emergency_contact_name?.trim())
  const meta = [lo.relationship, lo.city].filter(Boolean).join(' · ')

  return (
    <article className="overflow-hidden rounded-[20px] border border-line bg-card shadow-sm">
      <header className="flex items-center gap-4 px-6 py-6">
        <Avatar initials={initialsOf(lo.full_name)} src={photo} alt={lo.full_name} size="lg" tone="solid" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-h4 text-ink">{lo.full_name}</h2>
          {meta && <p className="truncate text-body-sm text-muted">{meta}</p>}
        </div>
        <Link href="/family/add" aria-label={`Edit ${lo.full_name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink">
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </header>
      <div className="divide-y divide-line border-t border-line px-6">
        <StatusRow label="Membership" value="Not activated" tone="warn" />
        <StatusRow label="Health profile" value={healthComplete ? 'Complete' : 'Incomplete'} tone={healthComplete ? 'ok' : 'warn'} />
        <StatusRow label="Next visit" value="Not scheduled" tone="muted" />
      </div>
    </article>
  )
}
