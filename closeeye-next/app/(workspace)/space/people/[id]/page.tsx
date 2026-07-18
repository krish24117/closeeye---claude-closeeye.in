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
import { ArrowLeft, Sparkles } from 'lucide-react'
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
      <div>
        <h1 className="text-h2 text-ink">{Person}</h1>
        <p className="mt-1 text-body-sm text-muted">{[lo.relationship, lo.city].filter(Boolean).join(' · ') || 'Family'}</p>
      </div>

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

      <Link href="/space/ask" className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-card px-4 py-2.5 text-body-sm font-semibold text-ink transition-colors hover:border-green/40 hover:text-green">
        <Sparkles className="h-4 w-4 text-green" strokeWidth={1.75} /> Ask Close Eye about {person}
      </Link>
    </div>
  )
}
