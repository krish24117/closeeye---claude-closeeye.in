'use client'

/**
 * Family (Owner: Family, /space/people) — renamed from "People" (founder 2026-07-24):
 * the roster of everyone Close Eye looks after — INCLUDING YOU. The user's own profile
 * leads the list as the dark YOU card (their details matter in an emergency too), then
 * every loved one with the same completeness language, then a dashed "Add a family
 * member" door that opens the one-question WHO sheet (Myself · A parent · Partner ·
 * A child · Someone else). Self = the loved_ones row with relationship 'Self' — the
 * exact row onboarding's "Myself" journey already creates.
 */
import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Check, Network, Plus } from 'lucide-react'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { Overlay } from '@/components/family/overlay'
import { titleCase } from '@/lib/family/relationship-words'
import { computeCompleteness, fetchHealthLiteMap, EMPTY_HEALTH, type HealthLite } from '@/lib/db/profile'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()
const isSelf = (rel: string | null) => (rel ?? '').trim().toLowerCase() === 'self'

/** Relationship-only people are stored as "your mother" — show the relationship as the name
 *  ("Mother") and drop the subline that would just repeat it. A real name shows name + role. */
function nameFor(fullName: string, relationship: string | null, city: string | null) {
  const relOnly = /^your\s/i.test(fullName)
  if (relOnly) {
    const rel = titleCase(fullName.replace(/^your\s+/i, ''))
    return { name: rel, sub: city || 'Family' }
  }
  // Never repeat the name as its own relationship line ("Mother · Mother").
  const relLabel = titleCase(relationship ?? '')
  const rel = relLabel.toLowerCase() === fullName.toLowerCase() ? '' : relLabel
  return { name: fullName, sub: [rel, city].filter(Boolean).join(' · ') || 'Family' }
}

/** The WHO sheet rows — the same relationships as onboarding, plus Myself and Someone else. */
const WHO_ROWS = [
  { key: 'self', label: 'Myself', sub: 'Your own profile — helps in an emergency', href: '/space/people/add?rel=Self', emoji: '🙋', dark: true },
  { key: 'parent', label: 'A parent', sub: 'Mother or father', href: '/space/people/add', emoji: '🌸', dark: false },
  { key: 'partner', label: 'Partner', sub: 'Spouse or partner', href: '/space/people/add?rel=Spouse', emoji: '💛', dark: false },
  { key: 'child', label: 'A child', sub: 'Son or daughter', href: '/space/people/add', emoji: '🧒', dark: false },
  { key: 'other', label: 'Someone else', sub: 'Grandparent, sibling, friend…', href: '/space/people/add?rel=Other', emoji: '🤝', dark: false },
] as const

export default function FamilyPage() {
  const { lovedOnes, loading, error } = useLovedOnes()
  const [health, setHealth] = React.useState<Record<string, HealthLite>>({})
  const [whoOpen, setWhoOpen] = React.useState(false)

  const ids = lovedOnes.map((l) => l.id).join(',')
  React.useEffect(() => {
    if (!lovedOnes.length) return
    let active = true
    void fetchHealthLiteMap(lovedOnes.map((l) => l.id)).then((m) => { if (active) setHealth(m) })
    return () => { active = false }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps

  const me = lovedOnes.find((l) => isSelf(l.relationship))
  const family = lovedOnes.filter((l) => !isSelf(l.relationship))
  const myC = me ? computeCompleteness(me, health[me.id] ?? EMPTY_HEALTH) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h2 text-ink">Family</h1>
        <Link href="/space/network" title="People authorised to coordinate your family's care" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
          <Network className="h-4 w-4" strokeWidth={1.75} /> Trusted Network
        </Link>
      </div>

      {!loading && !error && (
        <p className="-mt-1 text-body-sm leading-relaxed text-muted">Everyone Close Eye looks after — including you.</p>
      )}

      {loading && <p className="py-12 text-center text-caption text-muted">Loading your family…</p>}
      {error && <p className="py-12 text-center text-body-sm text-error">We couldn’t load your family just now.</p>}

      {!loading && !error && (
        <div className="flex flex-col gap-3">
          {/* ── YOU — your own profile leads the family (dark card) ── */}
          {me && myC ? (
            <Link href={`/space/people/${me.id}`} className="wsp-you-card flex flex-col gap-3 rounded-lg p-4 shadow-sm transition-opacity hover:opacity-95">
              <span className="self-start rounded-full bg-content-inverse/15 px-2.5 py-0.5 text-caption font-semibold uppercase tracking-wider text-accent-soft">You</span>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-content-inverse/10 font-display text-lead text-accent-soft">{initial(me.full_name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-content-inverse">{me.full_name}</p>
                  <p className="truncate text-caption text-content-inverse/70">{me.city ? `Living in ${me.city} · your details help in an emergency` : 'Your details help in an emergency'}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-content-inverse/60" strokeWidth={1.75} />
              </div>
              {myC.pct >= 100 ? (
                <p className="inline-flex items-center gap-1.5 text-caption font-semibold text-accent-soft"><Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Fully known</p>
              ) : (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-content-inverse/15">
                    <span className="block h-full rounded-full bg-accent-soft transition-[width] duration-500" style={{ width: `${Math.max(myC.pct, 6)}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-caption font-semibold text-content-inverse/75">{myC.pct}% complete</span>
                    <span className="text-caption font-semibold text-accent-soft">Complete your profile →</span>
                  </div>
                </div>
              )}
            </Link>
          ) : (
            <Link href="/space/people/add?rel=Self" className="wsp-you-card flex items-center gap-3 rounded-lg p-4 shadow-sm transition-opacity hover:opacity-95">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-content-inverse/10 text-accent-soft"><Plus className="h-5 w-5" strokeWidth={1.75} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-semibold text-content-inverse">Add yourself</p>
                <p className="text-caption text-content-inverse/70">Your own profile — your details help in an emergency</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-content-inverse/60" strokeWidth={1.75} />
            </Link>
          )}

          {/* ── Everyone you love ── */}
          {family.map((lo) => {
            const { name, sub } = nameFor(lo.full_name, lo.relationship, lo.city)
            const c = computeCompleteness(lo, health[lo.id] ?? EMPTY_HEALTH)
            const complete = c.pct >= 100
            return (
              <Link key={lo.id} href={`/space/people/${lo.id}`} className="flex flex-col gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-lead text-green">{initial(name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-ink">{name}</p>
                    <p className="truncate text-caption text-muted">{sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                </div>
                {complete ? (
                  <p className="inline-flex items-center gap-1.5 text-caption font-semibold text-green">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Fully known
                  </p>
                ) : (
                  <div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-accent-soft">
                      <span className="block h-full rounded-full bg-green transition-[width] duration-500" style={{ width: `${Math.max(c.pct, 6)}%` }} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-caption font-semibold text-muted">{c.pct}% complete</span>
                      <span className="text-caption font-semibold text-green">Add details →</span>
                    </div>
                  </div>
                )}
              </Link>
            )
          })}

          {/* ── Add a family member — opens the WHO sheet ── */}
          <button type="button" onClick={() => setWhoOpen(true)} className="flex items-center gap-3 rounded-lg border-2 border-dashed border-accent-soft p-4 text-start transition-colors hover:border-green/40">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-card text-green"><Plus className="h-5 w-5" strokeWidth={1.75} /></span>
            <span className="min-w-0">
              <span className="block text-body-sm font-semibold text-ink">Add a family member</span>
              <span className="block text-caption text-muted">Parent, partner, child — or anyone you love</span>
            </span>
          </button>
        </div>
      )}

      {/* ── The WHO sheet — one question: who would you like to add? ── */}
      <Overlay open={whoOpen} onClose={() => setWhoOpen(false)}>
        <div className="flex flex-col gap-1 px-1 pb-2">
          <h2 className="font-display text-h3 text-ink">Who would you like to add?</h2>
          <p className="text-body-sm text-muted">Each person gets their own space and profile.</p>
        </div>
        <div className="mt-3 flex flex-col gap-2.5 px-1">
          {WHO_ROWS.filter((r) => r.key !== 'self' || !me).map((r) => (
            <Link key={r.key} href={r.href} onClick={() => setWhoOpen(false)}
              className={r.dark
                ? 'wsp-you-card flex items-center gap-3 rounded-lg p-4 transition-opacity hover:opacity-95'
                : 'flex items-center gap-3 rounded-lg border border-line bg-card p-4 transition-colors hover:border-green/40'}>
              <span aria-hidden className={r.dark
                ? 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-content-inverse/10 text-lead'
                : 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-lead'}>
                {r.emoji}
              </span>
              <span className="min-w-0">
                <span className={r.dark ? 'block text-body-sm font-semibold text-content-inverse' : 'block text-body-sm font-semibold text-ink'}>{r.label}</span>
                <span className={r.dark ? 'block text-caption text-content-inverse/70' : 'block text-caption text-muted'}>{r.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </Overlay>
    </div>
  )
}
