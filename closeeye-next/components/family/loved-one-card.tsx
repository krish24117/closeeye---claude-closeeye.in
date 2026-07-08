'use client'

import Link from 'next/link'
import { Heart, MapPin, Phone, ShieldAlert, Pencil } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import type { LovedOne } from '@/lib/db/types'

/** Initials from a full name (first two words). */
export function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return (p.slice(0, 2).map((s) => s[0]).join('') || '·').toUpperCase()
}

/** A loved one, rendered from real Supabase data, with prompts to complete gaps. */
export function LovedOneCard({ lo }: { lo: LovedOne }) {
  const first = lo.full_name.split(/\s+/)[0]
  const meta = [lo.relationship, lo.age ? `${lo.age}` : null, lo.city].filter(Boolean).join(' · ')
  const rows = [
    lo.city && { icon: MapPin, text: lo.city },
    lo.phone_number && { icon: Phone, text: lo.phone_number },
    lo.medical_notes && { icon: Heart, text: lo.medical_notes },
    lo.emergency_contact_name && { icon: ShieldAlert, text: `${lo.emergency_contact_name}${lo.emergency_contact_phone ? ` · ${lo.emergency_contact_phone}` : ''}` },
  ].filter(Boolean) as { icon: typeof Heart; text: string }[]

  const incomplete = !lo.phone_number || !lo.medical_notes || !lo.emergency_contact_name

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <header className="flex items-center gap-4 border-b border-line px-6 py-5">
        <Avatar initials={initialsOf(lo.full_name)} size="lg" tone="solid" />
        <div className="min-w-0 flex-1">
          <h2 className="text-h4 text-ink">{lo.full_name}</h2>
          {meta && <p className="text-caption text-muted">{meta}</p>}
        </div>
        <Link href="/family/add" aria-label={`Edit ${lo.full_name}`} className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
          <Pencil className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </header>

      <div className="flex flex-col gap-2.5 px-6 py-5">
        {rows.map((r, i) => {
          const Icon = r.icon
          return (
            <p key={i} className="flex items-start gap-2.5 text-body-sm text-ink">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={1.75} /> {r.text}
            </p>
          )
        })}
        {incomplete && (
          <p className="text-body-sm text-muted">
            Add {first}’s health details, phone and emergency contacts to complete their profile.
          </p>
        )}
      </div>
    </article>
  )
}
