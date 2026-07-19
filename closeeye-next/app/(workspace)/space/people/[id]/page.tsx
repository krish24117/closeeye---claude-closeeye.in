'use client'

/**
 * Sprint 4 — the Person Space (Owner: People, /space/people/[id]). The per-person depth that
 * Sprint 2's Home deferred, restored on the PRESERVED logic: fetchSpace + the understanding
 * derivations (lib/space/understanding) + appendLearning. Snapshot (how they are) · what Close Eye
 * understands (with "tell me" that feeds the Family Graph) · their story. Rebuilt in the Workspace
 * design; the moat — private per-person understanding — lives here.
 */
import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Sparkles, Pencil, HeartPulse, Camera, Plus, FileText } from 'lucide-react'
import { fetchSpace, appendLearning, personName, type SpaceData } from '@/lib/db/space'
import type { Blank, LedgerLine } from '@/lib/connect/ledger'
import { deriveSnapshot, deriveRecommendations, groupUnderstanding, type UnderstandingInput } from '@/lib/space/understanding'
import { cn } from '@/lib/utils'

const cap1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export default function PersonSpacePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [space, setSpace] = React.useState<SpaceData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const [known, setKnown] = React.useState<LedgerLine[]>([])
  const [learned, setLearned] = React.useState<LedgerLine[]>([])
  const [blanks, setBlanks] = React.useState<Blank[]>([])
  const [callName, setCallName] = React.useState<string | null>(null)
  const [activeBlank, setActiveBlank] = React.useState<Blank | null>(null)
  const [fill, setFill] = React.useState('')
  const [saveError, setSaveError] = React.useState('')
  const [note, setNote] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const s = await fetchSpace(id)
      if (!s) { setError(true); return }
      setSpace(s); setKnown(s.known); setLearned(s.learned); setBlanks(s.blanks); setCallName(s.callName)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [id])

  React.useEffect(() => { void load() }, [load])

  if (loading) return <p className="py-20 text-center text-caption text-muted">Opening their space…</p>
  if (error || !space) return (
    <div className="py-20 text-center">
      <p className="text-body-sm text-ink">We couldn’t open this person’s space.</p>
      <Link href="/space/people" className="mt-4 inline-block text-body-sm font-semibold text-green">← Back to People</Link>
    </div>
  )

  const lo = space.lovedOne
  const person = personName({ callName, lovedOne: lo })
  const Person = cap1(person)

  const uInput: UnderstandingInput = {
    subject: { name: lo.name, relationship: lo.relationship, city: lo.city },
    gender: space.gender, known, learned, blanks, observedCount: space.observedCount,
  }
  const recommendations = deriveRecommendations(uInput)
  const snapshot = deriveSnapshot(uInput, recommendations)
  const sections = groupUnderstanding(uInput)

  // First-run guidance: a person who's just been added has no captured facts yet. Instead of a
  // sparse Space, offer one guided first task — asking a first question (the moment of first
  // success), or enriching what Close Eye knows. Each links to an existing flow; nothing new is
  // built. It fades the moment the family tells Close Eye anything.
  const firstRun = known.length === 0 && learned.length === 0
  const firstTasks = [
    { href: `/space/people/${lo.id}/health`, icon: HeartPulse, label: 'Add a health detail' },
    { href: `/space/people/${lo.id}/memories/add`, icon: Camera, label: 'Add a memory' },
    { href: `/space/people/${lo.id}/memories/add`, icon: FileText, label: 'Upload a report' },
  ]

  async function saveFill() {
    const b = activeBlank, text = fill.trim()
    if (!b || !text) return
    setSaveError('')
    const { line, error: e } = await appendLearning(lo.id, b.key, text)
    if (e || !line) { setSaveError('Couldn’t save that just now — please try again.'); return }
    setBlanks((prev) => prev.filter((x) => x.key !== b.key))
    if (b.key === 'callname') { setCallName(text); setNote(`I’ll call ${person} ${text} now.`) }
    else { setLearned((prev) => [...prev, line]); setNote(`Close Eye knows ${person} a little better now.`) }
    setActiveBlank(null); setFill('')
    window.setTimeout(() => setNote(''), 3500)
  }

  return (
    <div className="flex flex-col gap-8">
      <Link href="/space/people" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> People
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 text-ink">{Person}</h1>
          <p className="mt-1 text-body-sm text-muted">{[lo.relationship, lo.city].filter(Boolean).join(' · ') || 'Family'}</p>
        </div>
        <Link href={`/space/people/${lo.id}/edit`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /> Edit
        </Link>
      </div>

      {/* First task — the guided moment right after adding someone (fades once a fact exists) */}
      {firstRun && (
        <section className="rounded-lg border border-line/70 bg-card p-5 shadow-sm">
          <p className="text-caption font-semibold uppercase tracking-widest text-green">Let’s begin</p>
          <h2 className="mt-2 text-h4 text-ink">Let’s get to know {person}.</h2>
          <p className="mt-1.5 text-body-sm text-muted">The more Close Eye knows, the better it can look out for {person}. Start with one — it takes a minute.</p>
          <div className="mt-4 flex flex-col gap-2.5">
            <Link href="/space/connect" className="flex items-center gap-3 rounded-lg bg-ink p-3.5 text-ivory transition-opacity hover:opacity-90">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ivory/15"><Sparkles className="h-4 w-4" strokeWidth={1.75} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-semibold">Ask your first question</span>
                <span className="block truncate text-caption text-ivory/70">“How has {person} been recently?”</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {firstTasks.map((t) => (
                <Link key={t.label} href={t.href} className="flex items-center gap-2.5 rounded-lg border border-line/70 bg-ivory p-3 text-body-sm font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
                  <t.icon className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} /> {t.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Everything below the first task is DEFERRED until the family has told Close Eye something.
          A brand-new person gets ONE clear next step (the guided task above), not four competing
          asks (Memory Integrity P5). The depth returns the moment there's a fact to build on. */}
      {!firstRun && (
      <>
      {/* Snapshot — how they are */}
      <section className="rounded-lg border border-line/70 bg-card p-5 shadow-sm">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">{snapshot.headline}</p>
        <p className="mt-1 text-body-sm text-ink">{snapshot.sub}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {snapshot.cells.map((c) => (
            <div key={c.k}>
              <p className="text-caption text-muted">{c.k}</p>
              <p className={cn('text-body-sm font-semibold', c.dim ? 'text-muted' : 'text-ink')}>{c.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What should happen next */}
      {recommendations.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">What should happen next</p>
          {recommendations.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm">
              <span className="text-body-sm text-ink"><span className="text-caption font-semibold text-muted">{r.why} · </span>{r.text}</span>
            </div>
          ))}
        </section>
      )}

      {/* What Close Eye understands — with "tell me" */}
      <section className="flex flex-col gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">What Close Eye understands</p>
        <div className="flex flex-col gap-4">
          {sections.map((sec) => (
            <div key={sec.category} className="rounded-lg border border-line/70 bg-card p-4 shadow-sm">
              <p className="text-body-sm font-semibold text-ink">{sec.category}</p>
              <div className="mt-2 flex flex-col gap-2">
                {sec.items.map((it, i) => it.kind === 'blank' ? (
                  <React.Fragment key={it.key}>
                    <button onClick={() => { setActiveBlank({ key: it.key, text: it.text }); setFill(''); setSaveError('') }} className="flex items-center gap-2 text-left text-body-sm text-muted hover:text-ink">
                      <span className="text-muted/60">○</span><span className="flex-1">{it.text}</span><span className="text-caption font-semibold text-green">tell me</span>
                    </button>
                    {activeBlank?.key === it.key && (
                      <div className="flex flex-col gap-2 rounded-sm bg-ivory p-3">
                        <textarea rows={2} value={fill} onChange={(e) => setFill(e.target.value)} placeholder="Write it as you’d tell a friend…" autoFocus className="w-full resize-none rounded-sm border border-line bg-card px-3 py-2 text-body-sm text-ink focus:border-green focus:outline-none" />
                        {saveError && <p className="text-caption text-error">{saveError}</p>}
                        <div className="flex gap-2">
                          <button onClick={saveFill} className="rounded-full bg-ink px-4 py-1.5 text-caption font-semibold text-ivory">Remember this</button>
                          <button onClick={() => setActiveBlank(null)} className="rounded-full px-4 py-1.5 text-caption font-semibold text-muted">not now</button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ) : (
                  <div key={i} className="flex items-start gap-2 text-body-sm text-ink">
                    <span className="mt-0.5 text-green">✓</span><span className="flex-1">{it.body}</span>
                    <span className="shrink-0 text-caption text-muted">{it.provenance === 'inferred' ? 'my reading' : 'from your words'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {note && <p className="text-caption text-green">{note}</p>}
        </div>
      </section>
      </>
      )}

      {/* Story */}
      <section className="flex flex-col gap-4">
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">{Person}’s story</p>
        <div className="flex flex-col gap-3">
          {space.timeline.map((e) => (
            <div key={e.id} className="rounded-lg border border-line/70 bg-card p-4 shadow-sm">
              <p className="text-caption text-muted/70">{e.when}</p>
              <p className="mt-0.5 text-body-sm text-ink">{e.title}</p>
              {e.sub && <p className="mt-0.5 text-caption text-muted">{e.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/space/connect" className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-body-sm font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
          <Sparkles className="h-4 w-4 text-green" strokeWidth={1.75} /> Ask Connect about {person}
        </Link>
        <Link href={`/space/people/${lo.id}/health`} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-body-sm font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
          <HeartPulse className="h-4 w-4 text-green" strokeWidth={1.75} /> Health profile
        </Link>
      </div>

      {/* Memories — capture & recollect, made a prominent one-tap action (was a buried pill) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Memories</p>
          <Link href={`/space/people/${lo.id}/memories`} className="text-caption font-semibold text-green hover:text-green/80">View all</Link>
        </div>
        <Link href={`/space/people/${lo.id}/memories/add`} className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Camera className="h-5 w-5" strokeWidth={1.6} /></span>
            <span className="min-w-0">
              <span className="block text-body-sm font-semibold text-ink">Keep a memory of {person}</span>
              <span className="block text-caption text-muted">A photo, video or document — captured or uploaded</span>
            </span>
          </span>
          <Plus className="h-5 w-5 shrink-0 text-green" strokeWidth={2.2} />
        </Link>
      </section>
    </div>
  )
}
