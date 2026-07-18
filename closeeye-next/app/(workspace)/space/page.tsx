'use client'

/**
 * Sprint 2 — the Workspace Home. State-driven (docs/workspace_state_model.md): it leads with the
 * family's current situation, not a fixed dashboard. Family summary · Workspace state · recent
 * activity · alerts · quick actions. Lives at /space inside the Workspace shell — the evolution
 * of the former /space journal (whose per-person depth becomes the Person Space in Sprint 4).
 *
 * Reads the graph directly (fetchHome — /space is AppShell "lite", no FamilyDataProvider).
 */
import * as React from 'react'
import Link from 'next/link'
import { MessageCircle, UserPlus, HeartHandshake, ChevronRight } from 'lucide-react'
import { fetchHome, type HomeData } from '@/lib/db/home'
import { stateMeta } from '@/lib/space/state'
import { cn } from '@/lib/utils'

const RELATION_LABEL: Record<string, string> = {
  calm: 'text-green',
  learning: 'text-muted',
  attention: 'text-ink',
  active: 'text-green',
  critical: 'text-error',
}

const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()

export default function WorkspaceHome() {
  const [home, setHome] = React.useState<HomeData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)
  const [justAdded, setJustAdded] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true); setError(false)
    try {
      setJustAdded(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('member') : null)
      const h = await fetchHome()
      setHome(h)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { void load() }, [load])

  if (loading) return <p className="py-20 text-center text-caption text-muted">Opening your Workspace…</p>
  if (error) return (
    <div className="py-20 text-center">
      <p className="text-body-sm text-ink">We couldn’t open your Workspace just now.</p>
      <button onClick={load} className="mt-4 rounded-full bg-ink px-5 py-2 text-body-sm font-semibold text-ivory">Try again</button>
    </div>
  )
  if (!home) return null

  const h = new Date().getHours()
  const greeting = (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + `, ${home.userName}.`
  const meta = stateMeta(home.state)
  const bannerClass =
    meta.tone === 'critical' ? 'border-error/40 bg-error/5 text-error'
    : meta.tone === 'attention' ? 'border-line bg-card text-ink'
    : meta.tone === 'active' ? 'border-green/30 bg-accent-soft text-ink'
    : 'border-line/70 bg-accent-soft/60 text-ink'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 text-ink">{greeting}</h1>
      </div>

      {/* Workspace state — what matters right now (state organizes attention). */}
      <section className={cn('rounded-lg border p-5', bannerClass)}>
        <p className="text-caption font-semibold uppercase tracking-widest opacity-80">{meta.label}</p>
        <p className="mt-1 text-body-sm">
          {home.people.length === 0
            ? 'Add someone you love, and CloseEye begins to understand your family.'
            : home.state === 'healthy' ? 'From the last time a trusted person was with your family.'
            : home.state === 'getting_to_know' ? 'CloseEye is learning about your family — the more it knows, the more it can help.'
            : 'The most pressing thing across everyone you love.'}
        </p>
      </section>

      {/* Alerts */}
      {home.alerts.length > 0 && (
        <section className="flex flex-col gap-3">
          {home.alerts.map((a) => (
            <Link key={a.id} href={a.href} className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
              <span className="text-body-sm text-ink">{a.text}</span>
              <span className="shrink-0 text-caption font-semibold text-green">{a.actionLabel} →</span>
            </Link>
          ))}
        </section>
      )}

      {/* Family summary — everyone you love */}
      {home.people.length > 0 && (
        <section className="flex flex-col gap-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Everyone you love</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {home.people.map((p) => (
              <Link key={p.id} href="/space/people" className={cn('flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-green/40', justAdded === p.id ? 'border-green/50' : 'border-line/70')}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-body-sm font-semibold text-green">{initial(p.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{p.name}</p>
                  <p className={cn('text-caption', RELATION_LABEL[stateMeta(p.state).tone] ?? 'text-muted')}>{stateMeta(p.state).label}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      {home.activity.length > 0 && (
        <section className="flex flex-col gap-4">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Recent activity</p>
          <div className="flex flex-col gap-3">
            {home.activity.map((a) => (
              <div key={a.id} className="rounded-lg border border-line/70 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-semibold text-muted">{a.person}</p>
                  <p className="text-caption text-muted/70">{a.when}</p>
                </div>
                <p className="mt-1 text-body-sm text-ink">{a.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="flex flex-col gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">Quick actions</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction href="/space/ask" icon={MessageCircle} title="Ask CloseEye" sub="About anyone you love" />
          <QuickAction href="/family/add" icon={UserPlus} title="Add someone" sub="Grow your family" />
          <QuickAction href="/space/care" icon={HeartHandshake} title="Request a visit" sub="Trusted presence" />
        </div>
      </section>
    </div>
  )
}

function QuickAction({ href, icon: Icon, title, sub }: { href: string; icon: typeof MessageCircle; title: string; sub: string }) {
  return (
    <Link href={href} className="flex flex-col gap-1 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
      <Icon className="h-5 w-5 text-green" strokeWidth={1.75} />
      <p className="mt-1 text-body-sm font-semibold text-ink">{title}</p>
      <p className="text-caption text-muted">{sub}</p>
    </Link>
  )
}
