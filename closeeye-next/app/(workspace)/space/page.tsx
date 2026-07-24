'use client'

/**
 * The Workspace Home — the orb-concierge stage (founder-approved 2026-07-24).
 *
 * One presence, center stage: the SAME orb mark as the dock and the Connect sheet
 * (.wsp-orb-stage reuses their gradient + breathing sage core), speaking ONE true,
 * deterministic sentence derived from the relationship-model stage signals — never
 * an invented claim. Below it: the ask bar (a door into /space/connect), three
 * concierge chips, six tappable capability doors (the real service catalogue —
 * zero typing required), the family stones, and exactly ONE stage card. No feed,
 * no pitch cards: Connect isn't advertised here, it IS the screen.
 *
 * Stage → voice:  Discover "Let's build…" · Prepare "How can I help…" ·
 * Protected "A Guardian visits {name} — {when}." · Active "doing well today".
 * The Stage-5 Understanding panel (grounded synthesis, hard-gated) keeps its place
 * beneath the doors. Reads the graph via fetchHome; /space runs AppShell "lite".
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, CalendarClock, FileText, HeartHandshake, Plus, ScanEye, Scale,
  ShieldCheck, ShoppingBag, Sparkles, Stethoscope, UserPlus,
} from 'lucide-react'
import { fetchHome, type HomeData } from '@/lib/db/home'
import { takeFirstPerson } from '@/lib/first-run'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

/** The six doors — everything Close Eye can arrange, browsable with zero typing.
 *  Ask-style doors seed the Connect engine; booking doors open the real flows. */
const DOORS = [
  { icon: HeartHandshake, label: 'Visits & wellbeing', desc: 'Check-ins, companionship', href: '/space/book' },
  { icon: Stethoscope, label: 'Hospital days', desc: 'Someone beside them', href: '/space/book?service=hospital-companion' },
  { icon: FileText, label: 'Paperwork & taxes', desc: 'Banking, documents, filing', href: '/space/connect?q=How%20can%20Close%20Eye%20help%20with%20paperwork%20and%20taxes%3F' },
  { icon: Scale, label: 'Lawyers & property', desc: 'Coordination, verification', href: '/space/connect?q=Can%20you%20help%20find%20a%20trusted%20lawyer%20near%20my%20family%3F' },
  { icon: ShoppingBag, label: 'Groceries & errands', desc: 'Medicines, pickups', href: '/space/book?service=custom-request' },
  { icon: Sparkles, label: 'Plans & pricing', desc: 'Find what fits your family', href: '/space/billing/plan', dark: true },
] as const

const CHIPS = [
  { label: 'Help with taxes', href: '/space/connect?q=How%20can%20Close%20Eye%20help%20with%20my%20family%E2%80%99s%20taxes%3F' },
  { label: 'Find a lawyer', href: '/space/connect?q=Can%20you%20help%20find%20a%20trusted%20lawyer%3F' },
  { label: 'Book a visit', href: '/space/book' },
] as const

export default function WorkspaceHome() {
  const router = useRouter()
  // First-run hand-off: a user who just finished onboarding opens ON their new person's
  // Space (the guided first task), not this home. Read once, pre-paint — no flash.
  const [firstPerson] = React.useState<string | null>(() => takeFirstPerson())
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true); setError(false)
    try { setHome(await fetchHome()) } catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  React.useEffect(() => {
    if (firstPerson) router.replace(`/space/people/${firstPerson}`)
  }, [firstPerson, router])

  if (firstPerson) return <p className="py-20 text-center text-caption text-content-muted">Opening their space…</p>
  if (loading) return <p className="py-20 text-center text-caption text-content-muted">Opening your family…</p>
  if (error) return (
    <div className="py-20 text-center">
      <p className="text-body-sm text-content">We couldn’t open your family just now.</p>
      <button onClick={load} className="mt-4 rounded-full bg-surface-inverse px-5 py-2 text-body-sm font-semibold text-content-inverse">Try again</button>
    </div>
  )
  if (!home) return null

  const h = new Date().getHours()
  const name = home.userName ? home.userName.charAt(0).toUpperCase() + home.userName.slice(1) : home.userName
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${name}`

  // ── Relationship-model stage signals (unchanged derivations) ──
  const discover = home.people.length === 0
  const protectedStage = home.connectActive && !home.hasCompletedVisit
  const activeStage = home.connectActive && home.hasCompletedVisit
  const lv = home.latestVisit
  const wellToday = !lv?.mood || lv.mood >= 3
  const uv = home.upcomingVisit

  // ── The voice — ONE deterministic sentence, never an invented claim ──
  const voice = discover
    ? 'Let’s build your family’s trusted presence.'
    : protectedStage
      ? uv
        ? `A Guardian visits ${uv.personName} — ${uv.whenLabel}.`
        : 'Your family is protected.'
      : activeStage
        ? wellToday ? 'Your family is doing well today.' : 'Here’s the latest from your family.'
        : 'How can I help your family today?'
  const whisper = discover
    ? 'Add someone you love — then ask me for anything.'
    : protectedStage
      ? 'I’ll send you proof after the visit.'
      : activeStage
        ? 'Tap the latest visit for photos and the full report.'
        : 'Ask for anything. A real person arranges it — I make sure nothing is missed.'

  // ── Exactly ONE stage card ──
  const card = discover
    ? { icon: UserPlus, title: 'Add your family member', sub: 'Everything begins with who they are', href: '/space/people/add' }
    : protectedStage
      ? uv
        ? { icon: CalendarClock, title: `${uv.whenLabel} · ${uv.personName}`, sub: uv.guardianAssigned ? 'Guardian confirmed · overseen by your Presence Manager' : 'Your Guardian is being matched', href: '/space/activity/visits' }
        : { icon: CalendarClock, title: 'Your first visit is being scheduled', sub: 'Your Presence Manager will confirm the time shortly', href: '/space/activity/visits' }
      : activeStage && lv
        ? { icon: FileText, title: `Latest visit · ${lv.whenLabel}`, sub: lv.summary ?? 'The full report is on the way', href: `/space/activity/visit/${lv.id}` }
        : home.prompt
          ? { icon: Plus, title: home.notice?.title ?? 'Tell Close Eye a little more', sub: home.prompt.text, href: `/space/people/${home.prompt.personId}/add` }
          : null

  // ── The Trust Center door — one quiet, stage-aware line (a promise, never a pitch) ──
  const trustDoor = protectedStage
    ? { label: 'See a real visit report — exactly what you’ll receive', href: '/trust/sample-report' }
    : activeStage
      ? { label: 'If something ever happens — the exact steps', href: '/trust/emergency' }
      : { label: 'How Close Eye earns your trust', href: '/trust' }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">{greeting}</p>

      {/* The presence — the same orb as the dock and the sheet, at stage size. */}
      <Link href="/space/connect" aria-label="Open Close Eye Connect" className="wsp-orb-halo mt-1">
        <span className="wsp-orb-stage"><span className="ce-orb-core" aria-hidden /></span>
      </Link>

      <div>
        <h1 className="mx-auto max-w-sm font-display text-h3 leading-snug text-content">{voice}</h1>
        <p className="mx-auto mt-2 max-w-xs text-body-sm text-content-muted">{whisper}</p>
      </div>

      {/* Ask — a door into the conversation, never the only door. */}
      <Link href="/space/connect" className="flex w-full items-center gap-3 rounded-full border border-edge bg-surface-raised px-5 py-3.5 shadow-sm transition-colors hover:border-brand/40">
        <span className="flex-1 text-start text-body-sm text-content-muted">Taxes, a lawyer, a visit — just ask…</span>
        <span className="ce-orb-core h-2.5 w-2.5 shrink-0" aria-hidden />
      </Link>
      <div className="-mt-2 flex flex-wrap justify-center gap-2">
        {CHIPS.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-full bg-surface-accent px-3.5 py-1.5 text-caption font-semibold text-brand transition-opacity hover:opacity-80">{c.label}</Link>
        ))}
      </div>

      {/* The six doors — the whole catalogue, plans included. Zero typing required. */}
      <div className="grid w-full grid-cols-2 gap-3 text-start">
        {DOORS.map((d) => {
          const Icon = d.icon
          return 'dark' in d && d.dark ? (
            <Link key={d.label} href={d.href} className="rounded-lg bg-surface-inverse p-4 shadow-sm transition-opacity hover:opacity-90">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/20 text-accent-soft"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
              <p className="mt-3 text-body-sm font-semibold text-content-inverse">{d.label}</p>
              <p className="mt-0.5 text-caption text-content-inverse/70">{d.desc}</p>
            </Link>
          ) : (
            <Link key={d.label} href={d.href} className="rounded-lg border border-edge/70 bg-surface-raised p-4 shadow-sm transition-colors hover:border-brand/40">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-accent text-brand"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
              <p className="mt-3 text-body-sm font-semibold text-content">{d.label}</p>
              <p className="mt-0.5 text-caption text-content-muted">{d.desc}</p>
            </Link>
          )
        })}
      </div>

      {/* The family — stones. Tap → their space. */}
      <div className="flex flex-wrap items-start justify-center gap-5">
        {home.people.slice(0, 4).map((p) => (
          <Link key={p.id} href={`/space/people/${p.id}`} className="flex w-16 flex-col items-center gap-1.5">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-edge bg-surface-raised font-display text-lead text-brand shadow-sm">{initial(p.label)}</span>
            <span className="max-w-full truncate text-caption font-semibold text-content">{p.label}</span>
          </Link>
        ))}
        <Link href="/space/people/add" className="flex w-16 flex-col items-center gap-1.5">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-dashed border-edge bg-surface-raised text-content-muted shadow-sm"><Plus className="h-5 w-5" strokeWidth={1.75} /></span>
          <span className="text-caption font-semibold text-content-muted">Add</span>
        </Link>
      </div>

      {/* Exactly ONE stage card — the single most important next thing. */}
      {card && (
        <Link href={card.href} className="flex w-full items-center gap-3.5 rounded-lg border border-edge/70 bg-surface-raised p-4 text-start shadow-sm transition-colors hover:border-brand/40">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-accent text-brand"><card.icon className="h-5 w-5" strokeWidth={1.75} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-semibold text-content">{card.title}</span>
            <span className="mt-0.5 block truncate text-caption text-content-muted">{card.sub}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={2} />
        </Link>
      )}

      {/* The Trust Center door — stage-aware, quiet, always one tap from the promises. */}
      <Link href={trustDoor.href} className="inline-flex items-center gap-1.5 text-caption font-semibold text-content-muted transition-colors hover:text-brand">
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} /> {trustDoor.label}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </Link>

      {/* STAGE 5 · Understood — the grounded synthesis keeps its place (hard-gated, never fabricated). */}
      {home.understanding && (
        <section className="flex w-full flex-col gap-3 rounded-lg border border-edge/70 bg-surface-raised p-5 text-start shadow-sm">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-content-muted">
            <ScanEye className="h-4 w-4" strokeWidth={1.75} /> Understanding {home.understanding.personName}
          </p>
          <p className="text-body leading-relaxed text-content">{home.understanding.headline}</p>
          {home.understanding.snippets.length > 0 && (
            <ul className="flex flex-col gap-2 border-t border-edge/60 pt-3">
              {home.understanding.snippets.map((s, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-body-sm text-content">
                  <span className="min-w-0">&ldquo;{s.text}&rdquo;</span>
                  <span className="shrink-0 text-caption text-content-muted">{s.when}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/space/people/${home.understanding.personId}`} className="inline-flex items-center gap-1 self-start text-body-sm font-semibold text-brand hover:text-brand/80">
            See the full story <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </section>
      )}
    </div>
  )
}
