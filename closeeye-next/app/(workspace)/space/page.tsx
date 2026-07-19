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
import { Check, Circle, ScanEye, Sparkles, ChevronRight, ArrowRight, UserPlus } from 'lucide-react'
import { fetchHome, type HomeData } from '@/lib/db/home'

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

export default function WorkspaceHome() {
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true); setError(false)
    try { setHome(await fetchHome()) } catch { setError(true) }
    finally { setLoading(false) }
  }, [])
  React.useEffect(() => { void load() }, [load])

  if (loading) return <p className="py-20 text-center text-caption text-muted">Opening your family…</p>
  if (error) return (
    <div className="py-20 text-center">
      <p className="text-body-sm text-ink">We couldn’t open your family just now.</p>
      <button onClick={load} className="mt-4 rounded-full bg-ink px-5 py-2 text-body-sm font-semibold text-ivory">Try again</button>
    </div>
  )
  if (!home) return null

  const h = new Date().getHours()
  const name = home.userName ? home.userName.charAt(0).toUpperCase() + home.userName.slice(1) : home.userName
  const greeting = `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${name}.`

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-h2 text-ink">{greeting}</h1>

      {/* What I'm noticing — the synthesis (only on a real, derived gap) */}
      {home.notice && (
        <section className="rounded-lg bg-ink p-5 text-ivory shadow-sm">
          <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
            <ScanEye className="h-4 w-4" strokeWidth={1.75} /> What I’m noticing
          </p>
          <h2 className="mt-2.5 text-h4 leading-snug text-ivory">{home.notice.title}</h2>
          <p className="mt-2 text-body-sm text-ivory/75">{home.notice.why}</p>
          <Link href={`/space/people/${home.notice.personId}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ivory px-4 py-2 text-body-sm font-semibold text-ink transition-opacity hover:opacity-90">
            Ask about {home.notice.personName} <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
          </Link>
        </section>
      )}

      {/* Everyone you love — with what Close Eye knows and is learning */}
      {home.people.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption font-semibold uppercase tracking-widest text-muted">Everyone you love</p>
            <Link href="/space/people/add" className="inline-flex items-center gap-1.5 text-caption font-semibold text-green hover:text-green/80">
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2} /> Add someone
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {home.people.map((p) => (
              <Link key={p.id} href={`/space/people/${p.id}`} className="rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-body-sm font-semibold text-green">{initial(p.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-ink">{p.name}</p>
                    <p className="truncate text-caption text-muted">{p.relationship || 'Family'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                </div>
                {(p.known.length > 0 || p.learning) && (
                  <div className="mt-3 flex flex-col gap-1.5 border-t border-line/60 pt-3">
                    {p.known.map((k, i) => (
                      <p key={i} className="flex items-start gap-2 text-caption text-ink"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" strokeWidth={2.4} /><span className="min-w-0">{k}</span></p>
                    ))}
                    {p.learning && (
                      <p className="flex items-start gap-2 text-caption text-muted"><Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted/50" strokeWidth={1.75} /><span className="min-w-0">{p.learning}</span></p>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
          <p className="text-body-sm font-semibold text-ink">No one here yet</p>
          <p className="mx-auto mt-1 max-w-xs text-caption text-muted">Add someone you love, and Close Eye starts holding everything that matters about them.</p>
          <Link href="/space/people/add" className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-body-sm font-semibold text-ivory"><UserPlus className="h-4 w-4" strokeWidth={2} /> Add someone</Link>
        </div>
      )}

      {/* Recently remembered — wired to Memories (rendered once memories exist) */}
      {/* Act III adds the memory strip here. */}

      {/* Proactive prompt — the one thing that would deepen understanding (a real open essential) */}
      {home.prompt && (
        <section className="rounded-lg border border-dashed border-line bg-card/60 p-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Close Eye is learning</p>
          <p className="mt-2 text-body-sm text-ink">{home.prompt.text}</p>
          <div className="mt-3 flex items-center gap-2">
            <Link href={`/space/people/${home.prompt.personId}`} className="rounded-full bg-ink px-4 py-2 text-caption font-semibold text-ivory">Tell Close Eye</Link>
          </div>
        </section>
      )}

      {/* Connect — always one tap away */}
      <Link href="/space/connect" className="flex items-center gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green text-ivory"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></span>
        <span className="text-body-sm text-muted">Ask Close Eye about anyone you love…</span>
      </Link>
    </div>
  )
}
