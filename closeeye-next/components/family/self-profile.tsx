'use client'

/**
 * SelfProfile — the "You" grouped-list profile (Family tab frame 3, founder-approved
 * mockup, 2026-07-24). The self person's page speaks TO you, in the Apple grouped-list
 * language Settings already uses: Essentials (phone · where you live · YOUR emergency
 * contact), Health basics, and Family role ("You look after …"). Every row links into
 * the existing complete-profile / health forms — presentation only, zero new data paths.
 */
import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { fetchHealthLiteMap, computeCompleteness, EMPTY_HEALTH, type HealthLite } from '@/lib/db/profile'
import type { LovedOne } from '@/lib/db/types'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()
const isSelfRel = (rel: string | null) => (rel ?? '').trim().toLowerCase() === 'self'

function Row({ emoji, title, sub, added, href }: { emoji: string; title: string; sub: string; added: boolean; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 border-t border-line/70 px-4 py-3.5 transition-colors first:border-t-0 hover:bg-accent-soft/20">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-body">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-caption text-muted">{sub}</span>
      </span>
      <span className={added ? 'shrink-0 text-caption font-bold text-green' : 'shrink-0 text-caption font-bold text-warning'}>{added ? 'Added' : 'Add'}</span>
    </Link>
  )
}

export function SelfProfile({ me }: { me: LovedOne }) {
  const { lovedOnes } = useLovedOnes()
  const [health, setHealth] = React.useState<HealthLite>(EMPTY_HEALTH)
  React.useEffect(() => {
    let active = true
    void fetchHealthLiteMap([me.id]).then((m) => { if (active) setHealth(m[me.id] ?? EMPTY_HEALTH) })
    return () => { active = false }
  }, [me.id])

  const c = computeCompleteness(me, health)
  const others = lovedOnes.filter((l) => !isSelfRel(l.relationship))
  const othersLabel = others.map((l) => (/^your\s/i.test(l.full_name) ? l.full_name.replace(/^your\s+/i, '').replace(/^\w/, (ch) => ch.toUpperCase()) : l.full_name.split(/\s+/)[0])).join(' · ')
  const place = [me.city, me.region_code === 'IN' ? 'India' : me.region_code].filter(Boolean).join(', ')
  const maskedPhone = me.phone_number ? `${me.phone_number.slice(0, 3)} •••• ${me.phone_number.slice(-3)}` : ''

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Link href="/space/people" className="inline-flex items-center gap-1.5 self-start text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Family
      </Link>

      <div className="flex flex-col items-center text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-accent-soft font-display text-h2 text-green">{initial(me.full_name)}</span>
        <h1 className="mt-3 font-display text-h3 text-ink">{me.full_name}</h1>
        <p className="mt-1 text-caption font-semibold text-muted">You{me.city ? ` · ${me.city}` : ''} · {c.pct}% complete</p>
      </div>

      <section>
        <p className="mb-2 text-caption font-bold uppercase tracking-widest text-muted">Essentials</p>
        <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-sm">
          <Row emoji="📞" title="Phone & WhatsApp" sub={maskedPhone || 'So your family and Presence Manager can reach you'} added={!!me.phone_number} href={`/space/people/${me.id}/add`} />
          <Row emoji="📍" title="Where you live" sub={place || 'Your city and country'} added={!!me.city} href={`/space/people/${me.id}/add`} />
          <Row emoji="🚨" title="Your emergency contact" sub="Who we call if something happens to you" added={!!me.emergency_contact_name && !!me.emergency_contact_phone} href={`/space/people/${me.id}/add`} />
        </div>
      </section>

      <section>
        <p className="mb-2 text-caption font-bold uppercase tracking-widest text-muted">Health basics</p>
        <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-sm">
          <Row emoji="🩺" title="Conditions & medication" sub="Private to your family" added={!!health.medical_conditions || health.current_medications.length > 0} href={`/space/people/${me.id}/health`} />
          <Row emoji="🩸" title="Allergies" sub="Ready if ever needed" added={!!health.allergies} href={`/space/people/${me.id}/health`} />
        </div>
      </section>

      {others.length > 0 && (
        <section>
          <p className="mb-2 text-caption font-bold uppercase tracking-widest text-muted">Family role</p>
          <Link href="/space/people" className="flex items-center gap-3 rounded-lg border border-line/70 bg-card px-4 py-3.5 shadow-sm transition-colors hover:bg-accent-soft/20">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-body">🫶</span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-semibold text-ink">You look after</span>
              <span className="block truncate text-caption text-muted">{othersLabel}</span>
            </span>
            <span className="shrink-0 text-caption font-bold text-green">{others.length}</span>
          </Link>
        </section>
      )}
    </div>
  )
}
