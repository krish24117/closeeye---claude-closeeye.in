'use client'

/**
 * Activity (Owner: Activity, /space/activity) — the family's conversation history with Close Eye,
 * as ONE clear thread: what you asked, and what Close Eye answered, newest first. Reads the Ask
 * history (member_queries, RLS-scoped to the user). Nothing is invented — every answer is the one
 * Close Eye actually gave.
 */
import * as React from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Brain } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAskHistory, type AskHistoryItem } from '@/lib/db/ask'
import { fetchFamilyTimeline } from '@/lib/db/collaboration'
import type { CollaborationEvent } from '@/lib/collaboration/types'
import { MarkdownAnswer } from '@/components/family/markdown-answer'

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, (Date.now() - then) / 1000)
  if (s < 60) return 'just now'
  const m = s / 60
  if (m < 60) return `${Math.floor(m)}m ago`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)}h ago`
  const d = h / 24
  if (d < 7) return `${Math.floor(d)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function ActivityPage() {
  const { user } = useAuth()
  const { lovedOnes } = useFamilyData()
  const [items, setItems] = React.useState<AskHistoryItem[] | null>(null)
  const [events, setEvents] = React.useState<CollaborationEvent[]>([])
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!user) return
    setError(false)
    void fetchFamilyTimeline(20).then(setEvents).catch(() => {})
    try { setItems(await fetchAskHistory(user.id, 40)) } catch { setError(true) }
  }, [user])
  React.useEffect(() => { void load() }, [load])

  const nameOf = (loId?: string | null) => {
    if (!loId) return null
    const lo = lovedOnes.find((l) => l.id === loId)
    return lo ? (lo.full_name || '').trim().split(/\s+/)[0] || null : null
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-ink">Activity</h1>
        <p className="mt-1 text-body-sm text-muted">Everything you’ve asked, and what Close Eye answered.</p>
      </div>

      {/* Coordination — the story writes itself: who shared, delegated and completed what. */}
      {events.length > 0 && (
        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Coordination</p>
          <div className="rounded-lg border border-line/70 bg-card p-4 shadow-sm">
            <ol className="flex flex-col gap-3.5">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm leading-snug text-ink">{e.summary}</p>
                    <p className="mt-0.5 text-caption text-muted">{e.object.label} · {relTime(e.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-3.5 flex items-start gap-2.5 rounded-md bg-accent-soft/60 px-3 py-2.5 text-caption text-green">
              <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
              <span><span className="font-semibold">Family Knowledge Updated</span> — future answers now include this.</span>
            </div>
          </div>
        </section>
      )}

      {items === null && !error && <p className="py-12 text-center text-caption text-muted">Loading…</p>}
      {error && <p className="py-12 text-center text-body-sm text-error">We couldn’t load your activity just now.</p>}

      {items !== null && items.length === 0 && (
        <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-green"><Sparkles className="h-6 w-6" strokeWidth={1.6} /></span>
          <p className="mt-4 text-body-sm font-semibold text-ink">No questions yet</p>
          <p className="mx-auto mt-1 max-w-xs text-caption text-muted">Ask Close Eye about anyone you love — your questions and answers will show up here, together.</p>
          <Link href="/space/connect" className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-body-sm font-semibold text-ivory transition-opacity hover:opacity-90">
            Ask Close Eye <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="flex flex-col gap-8">
          {items.map((it) => {
            const who = nameOf(it.lovedOneId)
            return (
              <div key={it.id} className="flex flex-col gap-2.5">
                {/* You asked — a sent-message bubble on the right */}
                <div className="flex flex-col items-end gap-1">
                  <p className="text-caption text-muted/80">You asked{who ? ` about ${who}` : ''} · {relTime(it.createdAt)}</p>
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-body-sm font-medium text-ivory">{it.question}</p>
                </div>

                {/* Close Eye — the answer on the left */}
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></span>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-line/70 bg-card px-4 py-3 shadow-sm">
                    <p className="mb-1 text-caption font-semibold text-green">Close Eye</p>
                    {it.answer
                      ? <MarkdownAnswer text={it.answer} className="text-body-sm leading-relaxed text-ink" />
                      : <p className="text-body-sm text-muted">Close Eye couldn’t answer this one just yet — our team will follow up.</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
