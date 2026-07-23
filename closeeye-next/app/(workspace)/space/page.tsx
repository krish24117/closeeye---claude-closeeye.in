'use client'

/**
 * The Workspace Home — grounded to the approved Family-Intelligence artifact. It leads with what
 * Close Eye is NOTICING (a synthesis derived from real gaps in the family graph — never an invented
 * concern), then per person shows what it KNOWS (the family's own words) and what it's still
 * LEARNING, a memory strip, and one proactive prompt. Reads the graph directly (fetchHome — /space
 * runs AppShell "lite", no FamilyDataProvider). Nothing here is fabricated: every line traces to a
 * real fact or a real, honest gap.
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Circle, ScanEye, Sparkles, ChevronRight, ArrowRight, UserPlus, FileText, HeartHandshake } from 'lucide-react'
import { fetchHome, type HomeData } from '@/lib/db/home'
import { fetchRecentMemories, type MemoryView } from '@/lib/db/memories'
import { fetchFamilyTimeline } from '@/lib/db/collaboration'
import type { CollaborationEvent } from '@/lib/collaboration/types'
import { takeFirstPerson } from '@/lib/first-run'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

/** Derive a gender-aware possessive/object pronoun pair from a stored relationship string. */
function pronouns(relationship: string | null): { poss: string; obj: string } {
  const r = (relationship || '').toLowerCase()
  const m = ['father', 'dad', 'grandfather', 'grandpa', 'grandad', 'son', 'brother', 'husband', 'uncle', 'nephew', 'baba', 'papa']
  const f = ['mother', 'mom', 'grandmother', 'grandma', 'nana', 'daughter', 'sister', 'wife', 'aunt', 'niece', 'mama', 'amma']
  if (m.some((x) => r.includes(x))) return { poss: 'his', obj: 'him' }
  if (f.some((x) => r.includes(x))) return { poss: 'her', obj: 'her' }
  return { poss: 'their', obj: 'them' }
}

export default function WorkspaceHome() {
  const router = useRouter()
  // First-run hand-off: a user who just finished onboarding is opened ON their new person's Space
  // (the guided first task) rather than this home. Read once (synchronously, pre-paint) so there's
  // no flash of the home first.
  const [firstPerson] = React.useState<string | null>(() => takeFirstPerson())
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [recent, setRecent] = React.useState<(MemoryView & { lovedOneId: string })[]>([])
  const [loading, setLoading] = React.useState(true)
  const [latestEvent, setLatestEvent] = React.useState<CollaborationEvent | null>(null)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true); setError(false)
    try {
      // Recent memories + the latest coordination event are best-effort — if a table isn't there yet,
      // the strip/card simply stays hidden; the home never fails because of it.
      const [h, r, ev] = await Promise.all([
        fetchHome(),
        fetchRecentMemories(8).catch(() => []),
        fetchFamilyTimeline(1).catch(() => []),
      ])
      setHome(h); setRecent(r); setLatestEvent(ev[0] ?? null)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  // Hand off to the just-created person's Space. Runs before load matters — we render a calm
  // placeholder (below) while the redirect happens, so the home never flashes.
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
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${name}.`
  // Beat 3 — a warm, wellbeing-framed Connect invitation. Names the one person, else "your family".
  const beat3Subject = home.people.length === 1 ? home.people[0]!.label : 'your family'
  // STAGE 2 signal — the family exists but there's no active presence yet. Drives the "profile is
  // ready" framing + a very soft first-visit invitation (never a hard upsell).
  const preparing = home.people.length > 0 && !home.connectActive

  // ── STAGE 1 · Discover — no family yet. Show POSSIBILITY, never an empty dashboard. ──
  if (home.people.length === 0) {
    const cards = [
      { href: '/trust-safety', label: 'Why families use Close Eye', desc: 'A trusted local presence for the people you love — wherever in the world you are.' },
      { href: '/how-it-works', label: 'How it works', desc: 'Tell us about your family, we become their trusted presence, and you see every visit.' },
      { href: '/how-companions-are-verified', label: 'See a real visit report', desc: 'Photos, a warm note, and proof — exactly what you receive after each visit.' },
    ]
    return (
      <div className="flex flex-col gap-8">
        <section className="flex flex-col items-start gap-6 rounded-lg border border-edge/70 bg-surface-raised p-8 shadow-sm">
          <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-surface-inverse"><span className="h-4 w-4 rounded-full bg-brand" /></span>
          <div>
            <h1 className="text-h2 text-content">Welcome, {name}.</h1>
            <p className="mt-3 max-w-prose text-lead text-content-muted">Let&apos;s build your family&apos;s trusted presence.</p>
          </div>
          <Link href="/space/people/add" className="inline-flex items-center gap-2 rounded-full bg-surface-inverse px-5 py-3 text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90">
            <UserPlus className="h-4 w-4" strokeWidth={2} /> Add your family member or loved one
          </Link>
        </section>
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="group flex flex-col gap-2 rounded-lg border border-edge/70 bg-surface-raised p-6 shadow-sm transition-colors hover:border-brand/40">
              <p className="text-h4 text-content">{c.label}</p>
              <p className="flex-1 text-body-sm text-content-muted">{c.desc}</p>
              <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-brand">Learn more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} /></span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 text-content">{greeting}</h1>
        {preparing && <p className="mt-1 text-body-sm text-content-muted">Your family profile is ready.</p>}
      </div>

      {/* What I’m noticing — carousel across every member with open essentials (swipe to see all) */}
      {home.people.some((p) => p.learning) && (
        <section className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-content-muted">
            <ScanEye className="h-4 w-4" strokeWidth={1.75} /> Get started
          </p>
          <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-0.5">
            {home.people.filter((p) => p.learning).map((p) => {
              const { poss, obj } = pronouns(p.relationship)
              return (
                <div key={p.id} className="w-full shrink-0 snap-start rounded-lg bg-surface-inverse p-5 text-content-inverse shadow-sm">
                  <h2 className="text-h4 leading-snug text-content-inverse">Add a few details about {p.natural}.</h2>
                  <p className="mt-2 text-body-sm text-content-inverse/75">Add {poss} health, daily routine, and who&apos;s around {obj} — the more Close Eye knows, the more it can help.</p>
                  <Link href={`/space/people/${p.id}/add`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-body-sm font-semibold text-content transition-opacity hover:opacity-90">
                    Add {p.natural}&apos;s details <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                  </Link>
                </div>
              )
            })}
          </div>
          {home.people.filter((p) => p.learning).length > 1 && (
            <p className="text-center text-caption text-content-muted">Swipe to see everyone →</p>
          )}
        </section>
      )}

      {/* One recent coordination event — quiet proof the family is moving things forward together */}
      {latestEvent && (
        <Link href="/space/activity" className="flex items-center gap-3 rounded-lg border border-edge/70 bg-surface-raised p-4 shadow-sm transition-colors hover:border-brand/40">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-accent text-brand"><HeartHandshake className="h-4 w-4" strokeWidth={1.9} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">Recently, together</p>
            <p className="mt-0.5 truncate text-body-sm text-content">{latestEvent.summary}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={2} />
        </Link>
      )}

      {/* Everyone you love — with what Close Eye knows and is learning */}
      {home.people.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">Everyone you love</p>
            <Link href="/space/people/add" className="inline-flex items-center gap-1.5 text-caption font-semibold text-brand hover:text-brand/80">
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2} /> Add someone
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {home.people.map((p) => (
              <Link key={p.id} href={`/space/people/${p.id}`} className="rounded-lg border border-edge/70 bg-surface-raised p-4 shadow-sm transition-colors hover:border-brand/40">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-accent text-body-sm font-semibold text-brand">{initial(p.label)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-content">{p.label}</p>
                    {p.relationship && p.relationship.toLowerCase() !== p.label.toLowerCase() && (
                      <p className="truncate text-caption text-content-muted">{p.relationship}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={1.75} />
                </div>
                {(p.known.length > 0 || p.learning) && (
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-edge/60 pt-3">
                    {p.known.map((k, i) => (
                      <p key={i} className="flex items-start gap-2 text-caption text-content"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2.4} /><span className="min-w-0">{k}</span></p>
                    ))}
                    {p.learning && (
                      <p className="flex items-start gap-2 text-caption text-content-muted"><Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-muted/50" strokeWidth={1.75} /><span className="min-w-0">{p.learning}</span></p>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-edge/70 bg-surface-raised p-8 text-center shadow-sm">
          <p className="text-body-sm font-semibold text-content">No one here yet</p>
          <p className="mx-auto mt-1 max-w-xs text-caption text-content-muted">Add someone you love, and Close Eye starts holding everything that matters about them.</p>
          <Link href="/space/people/add" className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-inverse px-5 py-2.5 text-body-sm font-semibold text-content-inverse"><UserPlus className="h-4 w-4" strokeWidth={2} /> Add someone</Link>
        </div>
      )}

      {/* STAGE 2 · Prepare — a very soft first-visit invitation: show the proof, then pricing. */}
      {preparing && (
        <section className="flex flex-col gap-4 rounded-lg border border-edge/70 bg-surface-raised p-5 shadow-sm">
          <div>
            <h2 className="text-h4 text-content">See what your first visit looks like</h2>
            <p className="mt-1 text-body-sm text-content-muted">A verified Guardian visits {beat3Subject}, then you get proof of how they truly are.</p>
          </div>
          <div className="rounded-md border border-edge bg-surface-accent/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-sm font-semibold text-content">A visit with {beat3Subject}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-accent px-2 py-0.5 text-caption font-semibold text-brand"><Check className="h-3 w-3" strokeWidth={3} /> Verified</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="aspect-square rounded-md bg-surface-accent" />)}</div>
            <p className="mt-3 text-body-sm text-content">&ldquo;They were cheerful today — a short walk, a good meal, a calm day. All is well.&rdquo;</p>
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-1 self-start text-body-sm font-semibold text-brand hover:text-brand/80">
            See pricing <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </section>
      )}

      {/* Beat 2 — the calm Close Eye Connect moment (state-aware; never an upsell). Only once
          there's a family to hold; a brand-new user is still in the get-started flow above. */}
      {home.people.length > 0 && (
        home.connectActive ? (
          <section className="flex items-center gap-3 rounded-lg border border-edge/70 bg-surface-raised p-4 shadow-sm">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-content-inverse"><Check className="h-4 w-4" strokeWidth={2.6} /></span>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-content">Connect is active</p>
              <p className="text-caption text-content-muted">Close Eye is understanding your family and can bring a trusted person whenever it’s needed.</p>
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-edge/70 bg-surface-accent/25 p-5 shadow-sm">
            <p className="text-caption font-semibold uppercase tracking-widest text-brand">Close Eye Connect</p>
            <h2 className="mt-2 text-h4 leading-snug text-content">The intelligence that stays with your family.</h2>
            <p className="mt-2 text-body-sm leading-relaxed text-content-muted">It understands the people you love, remembers what matters, and — when real-world presence is needed — brings a trusted person to them.</p>
            <Link href="/join" className="mt-4 inline-flex items-center gap-2 text-body-sm font-semibold text-brand hover:text-brand/80">
              Make Connect yours <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </section>
        )
      )}

      {/* Recently remembered — memory "moments" as album-cover cards (title on the cover) */}
      {recent.length > 0 && (
        <section className="flex flex-col gap-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">Recently remembered</p>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {recent.map((m) => {
              const isPhoto = m.cover?.url && m.cover.kind !== 'document'
              return (
                <Link key={m.id} href={`/space/people/${m.lovedOneId}/memories`} className="group w-44 shrink-0">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-sm ring-1 ring-edge/60">
                    {isPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.cover?.url ?? undefined} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-gradient-to-br from-accent-soft to-surface-accent text-brand"><FileText className="h-10 w-10" strokeWidth={1.4} /></span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-inverse/90 via-surface-inverse/35 to-transparent px-3.5 pb-3 pt-10">
                      <p className="truncate text-body-sm font-semibold text-content-inverse">{m.title}</p>
                      <p className="text-caption text-content-inverse/75">{m.count} {m.count === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Proactive prompt — the one thing that would deepen understanding (a real open essential) */}
      {home.prompt && (
        <section className="rounded-lg border border-dashed border-edge bg-surface-raised/60 p-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">Close Eye is learning</p>
          <p className="mt-2 text-body-sm text-content">{home.prompt.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <Link href={`/space/people/${home.prompt.personId}/add`} className="rounded-full bg-surface-inverse px-4 py-2 text-caption font-semibold text-content-inverse">Tell Close Eye</Link>
          </div>
        </section>
      )}

      {/* Beat 3 — Connect as wellbeing, warm and personal. Falls back to the generic invite when
          there's no one added yet. */}
      {home.people.length > 0 ? (
        <Link href="/space/connect" className="flex items-center gap-3 rounded-lg border border-edge/70 bg-surface-raised p-4 shadow-sm transition-colors hover:border-brand/40">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-inverse"><span className="h-2 w-2 rounded-full bg-brand" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-semibold text-content">How is {beat3Subject} — day to day?</span>
            <span className="block text-caption text-content-muted">Ask Close Eye anything about their wellbeing</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={1.75} />
        </Link>
      ) : (
        <Link href="/space/connect" className="flex items-center gap-3 rounded-lg border border-edge/70 bg-surface-raised p-4 shadow-sm transition-colors hover:border-brand/40">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-content-inverse"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></span>
          <span className="text-body-sm text-content-muted">Ask Close Eye about anyone you love…</span>
        </Link>
      )}
    </div>
  )
}
