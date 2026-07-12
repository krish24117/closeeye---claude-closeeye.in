'use client'

import * as React from 'react'
import { HeartHandshake } from 'lucide-react'
import { fetchElderProfile, type ElderProfileForm } from '@/lib/db/family'

/**
 * "What you told us" — reflects the family-entered wellbeing profile back inside the
 * Presence Story, so the family sees that what they shared actually reached the visit
 * (the Guardian's brief includes this profile). Honest by design: it acknowledges what
 * the family told us; it never claims the visit confirmed something it didn't. Renders
 * nothing when the profile is empty.
 */
export function WhatYouToldUs({ lovedOneId, name }: { lovedOneId: string; name: string }) {
  const [items, setItems] = React.useState<{ label: string; value: string }[] | null>(null)

  React.useEffect(() => {
    let alive = true
    fetchElderProfile(lovedOneId)
      .then((ep) => { if (alive) setItems(buildItems(ep)) })
      .catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [lovedOneId])

  if (!items || items.length === 0) return null

  const first = name.trim().split(/\s+/)[0] || name
  return (
    <section className="rounded-lg border border-green/20 bg-accent-soft/40 p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-h4 text-ink">
        <HeartHandshake className="h-5 w-5 text-green" strokeWidth={1.5} /> What you told us
      </h2>
      <p className="mt-1 text-body-sm text-muted">
        The little things you shared about {first} — we kept them close during this visit.
      </p>
      <dl className="mt-4 divide-y divide-line/70">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-caption font-semibold uppercase tracking-wide text-green">{it.label}</dt>
            <dd className="text-body-sm text-ink sm:text-right">{it.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function buildItems(ep: ElderProfileForm): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = []
  if (ep.current_medications.length) items.push({ label: 'Medications', value: ep.current_medications.join(', ') })
  if (ep.medical_conditions.trim()) items.push({ label: 'To keep in mind', value: ep.medical_conditions.trim() })
  if (ep.things_to_avoid.trim()) items.push({ label: 'To avoid', value: ep.things_to_avoid.trim() })
  if (ep.conversation_interests.trim()) items.push({ label: 'Loves talking about', value: ep.conversation_interests.trim() })
  if (ep.daily_routine.trim()) items.push({ label: 'Daily routine', value: ep.daily_routine.trim() })
  if (ep.food_preferences.trim()) items.push({ label: 'Food', value: ep.food_preferences.trim() })
  return items
}
