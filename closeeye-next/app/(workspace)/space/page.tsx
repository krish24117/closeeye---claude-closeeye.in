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
import { Check, Circle, ScanEye, Sparkles, ChevronRight, ArrowRight, UserPlus, Images } from 'lucide-react'
import { fetchHome, type HomeData } from '@/lib/db/home'
import { fetchRecentMemories, type MemoryView } from '@/lib/db/memories'
import { takeFirstPerson } from '@/lib/first-run'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

export default function WorkspaceHome() {
  const router = useRouter()
  // First-run hand-off: a user who just finished onboarding is opened ON their new person's Space
  // (the guided first task) rather than this home. Read once (synchronously, pre-paint) so there's
  // no flash of the home first.
  const [firstPerson] = React.useState<string | null>(() => takeFirstPerson())
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [recent, setRecent] = React.useState<(MemoryView & { lovedOneId: string })[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true); setError(false)
    try {
      // Recent memories are best-effort — if the table isn't there yet (migration pending), the
      // strip simply stays hidden; the home never fails because of it.
      const [h, r] = await Promise.all([fetchHome(), fetchRecentMemories(8).catch(() => [])])
      setHome(h); setRecent(r)
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

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-h2 text-content">{greeting}</h1>

      {/* What I'm noticing — the synthesis (only on a real, derived gap) */}
      {home.notice && (
        <section className="rounded-lg bg-surface-inverse p-5 text-content-inverse shadow-sm">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-accent-soft">
            <ScanEye className="h-4 w-4" strokeWidth={1.75} /> Get started
          </p>
          <h2 className="mt-2.5 text-h4 leading-snug text-content-inverse">{home.notice.title}</h2>
          <p className="mt-2 text-body-sm text-content-inverse/75">{home.notice.why}</p>
          <Link href={`/space/people/${home.notice.personId}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-body-sm font-semibold text-content transition-opacity hover:opacity-90">
            Add {home.notice.personName}’s details <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </Link>
        </section>
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

      {/* Recently remembered — the memory strip (shows once the family has captured moments) */}
      {recent.length > 0 && (
        <section className="flex flex-col gap-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">Recently remembered</p>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {recent.map((m) => (
              <Link key={m.id} href={`/space/people/${m.lovedOneId}/memories`} className="w-28 shrink-0">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-edge bg-surface-raised shadow-sm">
                  {m.cover?.url && m.cover.kind !== 'document' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.cover.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-brand"><Images className="h-6 w-6" strokeWidth={1.5} /></span>
                  )}
                </div>
                <p className="mt-1.5 truncate text-caption font-semibold text-content">{m.title}</p>
                <p className="truncate text-caption text-content-muted">{m.count} {m.count === 1 ? 'item' : 'items'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Proactive prompt — the one thing that would deepen understanding (a real open essential) */}
      {home.prompt && (
        <section className="rounded-lg border border-dashed border-edge bg-surface-raised/60 p-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">Close Eye is learning</p>
          <p className="mt-2 text-body-sm text-content">{home.prompt.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <Link href={`/space/people/${home.prompt.personId}`} className="rounded-full bg-surface-inverse px-4 py-2 text-caption font-semibold text-content-inverse">Tell Close Eye</Link>
          </div>
        </section>
      )}

      {/* Connect — always one tap away */}
      <Link href="/space/connect" className="flex items-center gap-3 rounded-lg border border-edge/70 bg-surface-raised p-4 shadow-sm transition-colors hover:border-brand/40">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-content-inverse"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></span>
        <span className="text-body-sm text-content-muted">Ask Close Eye about anyone you love…</span>
      </Link>
    </div>
  )
}
