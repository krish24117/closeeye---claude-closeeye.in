'use client'

/**
 * The Family Journey view — the Workspace Home’s three stage compositions (founder-approved
 * rev-2 mockup, 2026-07-24). Pure presentation over HomeData: the page fetches, this renders,
 * and previews/tests can feed it any stage’s data. See app/(workspace)/space/page.tsx for the
 * full Journey doctrine (stages, honesty rules, why the catalogue lives in the orb).
 */
import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import type { HomeData } from '@/lib/db/home'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

/** The pure Journey view — exported so stage compositions can be previewed/tested with any HomeData. */
export function WorkspaceHomeView({ home }: { home: HomeData }) {
  const h = new Date().getHours()
  const name = home.userName ? home.userName.charAt(0).toUpperCase() + home.userName.slice(1) : home.userName
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${name}`

  // ── The three journey stages (derived, never declared) ──
  const subject = home.people[0] ?? null
  const stage: 1 | 2 | 3 = !subject ? 1 : home.hasCompletedVisit ? 3 : 2

  const lv = home.latestVisit
  const uv = home.upcomingVisit
  const wellToday = !lv?.mood || lv.mood >= 3

  // Stage-2 journey progress — every state is a real stored fact.
  const profileDone = (home.journey?.pct ?? 0) >= 100
  const emergencyDone = home.journey?.emergencyDone ?? false
  const visitBooked = !!uv || home.hasCompletedVisit
  const guardianAssigned = !!uv?.guardianAssigned
  const remaining = [profileDone, emergencyDone, visitBooked].filter((d) => !d).length

  // ── The voice — ONE deterministic sentence, never an invented claim ──
  const voice = stage === 1
    ? 'Let’s build your family’s trusted presence.'
    : stage === 2
      ? uv
        ? `A Guardian visits ${uv.personName} — ${uv.whenLabel}.`
        : `${subject!.label}’s space is taking shape.`
      : wellToday ? 'Your family is doing well today.' : 'Here’s the latest from your family.'
  const whisper = stage === 1
    ? 'Someone you trust, with the people you love — and proof, every time.'
    : stage === 2
      ? remaining > 0
        ? `${['One', 'Two', 'Three'][remaining - 1]} step${remaining === 1 ? '' : 's'} to ${subject!.label}’s first visit — I’ll walk you through.`
        : 'I’ll send you proof after the visit.'
      : wellToday ? 'The last visit came back warm — here’s where things stand.' : 'Tap the latest visit for photos and the full report.'

  // ── The Trust Center door — one quiet, stage-aware line (a promise, never a pitch) ──
  const trustDoor = stage === 1
    ? { em: '🛡️', label: 'How Close Eye earns your trust', href: '/trust' }
    : stage === 2
      ? { em: '📸', label: 'See a real visit report — exactly what you’ll receive', href: '/trust/sample-report' }
      : { em: '🚨', label: 'If something ever happens — the exact steps', href: '/trust/emergency' }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">{greeting}</p>

      {/* The presence — the same orb mark, sized to support the story, never to be it. */}
      <Link href="/space/connect" aria-label="Open Close Eye Connect" className="wsp-orb-halo mt-1">
        <span className={stage === 1 ? 'wsp-orb-stage wsp-orb-stage--mid' : 'wsp-orb-stage wsp-orb-stage--sm'}><span className="ce-orb-core" aria-hidden /></span>
      </Link>

      <div>
        <h1 className="mx-auto max-w-sm font-display text-h3 leading-snug text-content">{voice}</h1>
        <p className="mx-auto mt-2 max-w-xs text-body-sm text-content-muted">{whisper}</p>
      </div>

      {stage === 1 && (
        <>
          {/* ONE action — everything begins with who they are. */}
          <Link href="/space/people/add" className="flex w-full items-center gap-3.5 rounded-2xl bg-surface-inverse p-4 text-start shadow-sm transition-opacity hover:opacity-90">
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/40 text-lead">🌸</span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-semibold text-content-inverse">Add your first family member</span>
              <span className="mt-0.5 block text-caption text-content-inverse/70">Everything begins with who they are</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-content-inverse/70" strokeWidth={2} />
          </Link>

          {/* Proof, not a pitch — see it for yourself before you decide. */}
          <p className="-mb-2 w-full text-start text-caption font-bold uppercase tracking-widest text-content-muted">While you decide — see it for yourself</p>
          <div className="flex w-full flex-col gap-2">
            <EmRow em="🧭" title="How Close Eye works" sub="Two minutes, everything explained" href="/how-it-works" />
            <EmRow em="🫶" title="Meet your Guardian" sub="Verified, trained — introduced by your Presence Manager" href="/trust-safety" />
            <EmRow em="📸" title="See a sample visit report" sub="Exactly what you’ll receive" href="/trust/sample-report" />
          </div>
        </>
      )}

      {stage === 2 && subject && (
        <>
          {/* The journey card — the spine. Every state below is a real stored fact. */}
          <div className="w-full rounded-2xl border border-edge/70 bg-surface-raised p-4 text-start shadow-sm">
            <p className="text-caption font-bold uppercase tracking-widest text-content-muted">Your family’s journey</p>
            <JourneyStep state="done" n="✓" title="Family added"
              sub={[subject.label, subject.relationship && subject.relationship.toLowerCase() !== subject.label.toLowerCase() ? subject.relationship : null, subject.city].filter(Boolean).join(' · ')} />
            <JourneyStep state={profileDone ? 'done' : 'now'} n={profileDone ? '✓' : '2'} title={`Complete ${subject.label}’s profile`} sub="Address, health basics"
              pct={profileDone ? undefined : home.journey?.pct ?? 0} href={`/space/people/${subject.id}/add`} />
            <JourneyStep state={emergencyDone ? 'done' : profileDone ? 'now' : 'next'} n={emergencyDone ? '✓' : '3'} title="Emergency contacts" sub="Who we call, in the right order" href={`/space/people/${subject.id}/add`} />
            <JourneyStep state={visitBooked ? 'done' : emergencyDone && profileDone ? 'now' : 'next'} n={visitBooked ? '✓' : '4'} title="Book the first visit" sub="Photos and a full report, same day" href="/space/book" />
            <JourneyStep state={guardianAssigned ? 'done' : 'dim'} n={guardianAssigned ? '✓' : '5'} title="Your Guardian"
              sub={guardianAssigned ? 'Confirmed for the visit — introduced by your Presence Manager' : 'Assigned when your visit is confirmed — introduced by your Presence Manager'} />
          </div>
          <Stones people={home.people} />
        </>
      )}

      {stage === 3 && subject && (
        <>
          <Stones people={home.people} dots />
          <div className="flex w-full flex-col gap-2">
            {lv && <EmRow em="📸" title={`Latest visit · ${lv.whenLabel}`} sub={lv.summary ?? 'The full report is on the way'} href={`/space/activity/visit/${lv.id}`} />}
            {uv
              ? <EmRow em="📅" title={`Next visit · ${uv.whenLabel}`} sub={uv.guardianAssigned ? 'Guardian confirmed · overseen by your Presence Manager' : 'Your Guardian is being matched'} href="/space/activity/visits" />
              : <EmRow em="📅" title="Plan the next visit" sub="A Guardian can be there this week" href="/space/book" />}
            {home.understanding && (
              <EmRow em="🧠" title={`Understanding ${home.understanding.personName}`}
                sub={home.understanding.snippets[0] ? `“${home.understanding.snippets[0].text}” · noted` : home.understanding.headline}
                href={`/space/people/${home.understanding.personId}`} />
            )}
          </div>
          <div className="-mt-1 flex flex-wrap justify-center gap-2">
            <Link href="/space/book" className="rounded-full bg-surface-accent px-3.5 py-1.5 text-caption font-semibold text-brand transition-opacity hover:opacity-80">Book a visit</Link>
            <Link href="/space/connect" className="rounded-full bg-surface-accent px-3.5 py-1.5 text-caption font-semibold text-brand transition-opacity hover:opacity-80">Ask about {subject.label}</Link>
          </div>
        </>
      )}

      {/* The Trust Center door — stage-aware, quiet, always one tap from the promises. */}
      <Link href={trustDoor.href} className="inline-flex items-center gap-1.5 pt-1 text-caption font-semibold text-content-muted transition-colors hover:text-brand">
        <span aria-hidden>{trustDoor.em}</span> {trustDoor.label}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>
    </div>
  )
}

/** One emoji row — the Journey's shared list language (matches the rev-2 mockup rows). */
function EmRow({ em, title, sub, href }: { em: string; title: string; sub: string; href: string }) {
  return (
    <Link href={href} className="flex w-full items-center gap-3 rounded-2xl border border-edge/70 bg-surface-raised p-3.5 text-start shadow-sm transition-colors hover:border-brand/40">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-accent text-body">{em}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-semibold text-content">{title}</span>
        <span className="line-clamp-2 block text-caption leading-snug text-content-muted">{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={2} />
    </Link>
  )
}

/** One journey step — done / now / next / dim, exactly the mockup's four states. */
function JourneyStep({ state, n, title, sub, pct, href }: {
  state: 'done' | 'now' | 'next' | 'dim'; n: string; title: string; sub: string; pct?: number; href?: string
}) {
  const circle = state === 'done'
    ? 'bg-surface-accent text-brand'
    : state === 'now'
      ? 'bg-surface-inverse text-content-inverse'
      : 'border border-edge/80 bg-surface text-content-muted'
  const inner = (
    <>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-caption font-bold ${circle}`}>{n}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-body-sm font-semibold ${state === 'dim' ? 'text-content-muted' : 'text-content'}`}>{title}</span>
        <span className="mt-0.5 block text-caption leading-snug text-content-muted">{sub}</span>
        {typeof pct === 'number' && (
          <span className="mt-1.5 block h-1 w-36 overflow-hidden rounded-full bg-edge/40">
            <span className="block h-full rounded-full bg-brand/60" style={{ width: `${Math.max(4, pct)}%` }} />
          </span>
        )}
      </span>
      {href && <ChevronRight className="h-4 w-4 shrink-0 self-center text-content-muted" strokeWidth={2} />}
    </>
  )
  const cls = 'flex w-full items-start gap-3 border-t border-edge/40 py-3 first:border-t-0'
  return href
    ? <Link href={href} className={`${cls} transition-colors hover:bg-surface-accent/20`}>{inner}</Link>
    : <div className={`${cls} ${state === 'dim' ? 'opacity-80' : ''}`}>{inner}</div>
}

/** The family stones — tap → their space. Stage 3 wears a quiet well-signal dot. */
function Stones({ people, dots }: { people: HomeData['people']; dots?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-5">
      {people.slice(0, 4).map((p) => (
        <Link key={p.id} href={`/space/people/${p.id}`} className="flex w-16 flex-col items-center gap-1.5">
          <span className="relative grid h-12 w-12 place-items-center rounded-full border border-edge bg-surface-raised font-display text-lead text-brand shadow-sm">
            {initial(p.label)}
            {dots && p.state === 'healthy' && <span aria-hidden className="absolute end-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-brand" />}
          </span>
          <span className="max-w-full truncate text-caption font-semibold text-content">{p.label}</span>
        </Link>
      ))}
      <Link href="/space/people/add" className="flex w-16 flex-col items-center gap-1.5">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-edge bg-surface-raised text-content-muted shadow-sm"><Plus className="h-5 w-5" strokeWidth={1.75} /></span>
        <span className="text-caption font-semibold text-content-muted">Add</span>
      </Link>
    </div>
  )
}
