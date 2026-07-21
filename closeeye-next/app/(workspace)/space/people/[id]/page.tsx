'use client'

/**
 * The Person page — a PORTRAIT, not a database (founder + Apple-team redesign, 2026-07-21).
 *
 * It opens with HER: photo/initial, name, relationship · city, and the three things you actually
 * do — Call · Ask · Add. Then one warm line in Close Eye's voice, a plain-language read of what it
 * knows (or a calm "help me understand her" invitation when sparse), and her real story (memories).
 * No schema headers ("Identity / Support network"), no app-event "story". Honest throughout: facts
 * come only from what the family actually said; blanks become gentle invitations, never fabricated.
 */
import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Phone, Sparkles, Plus, Pencil, Check, Camera, FileText, Globe } from 'lucide-react'
import { fetchSpace, personName, type SpaceData } from '@/lib/db/space'
import { fetchMemories, type MemoryView } from '@/lib/db/memories'
import { getLocalPhoto } from '@/lib/local-photos'
import { titleCase } from '@/lib/family/relationship-words'

const cap1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const normKey = (s: string) => s.trim().toLowerCase().replace(/[.\s]+$/, '')

/** A short, warm chip label for an open essential. */
function chipLabel(text: string): string {
  const l = text.toLowerCase()
  if (/health|medic|manage/.test(l)) return 'Health'
  if (/morning|routine|day/.test(l)) return 'Daily routine'
  if (/nearby|reach|who|support/.test(l)) return 'Who’s nearby'
  if (/age/.test(l)) return 'Age'
  return cap1(text.split(/[,—]/)[0]!.trim())
}

export default function PersonSpacePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [space, setSpace] = React.useState<SpaceData | null>(null)
  const [memories, setMemories] = React.useState<MemoryView[]>([])
  const [photo, setPhoto] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!id) return
    setLoading(true); setError(false)
    try {
      const [s, m] = await Promise.all([fetchSpace(id), fetchMemories(id).catch(() => [])])
      if (!s) { setError(true); return }
      setSpace(s); setMemories(m); setPhoto(getLocalPhoto(id))
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
  const person = personName({ callName: space.callName, lovedOne: lo })
  const Person = cap1(person)
  // Only a bare "your mother" placeholder needs a name — an endearment they actually use (Amma,
  // Nani) is already the name, so never nudge those.
  const relOnly = !space.callName && /^your\s/i.test(lo.name)
  const poss = space.gender === 'he' ? 'him' : space.gender === 'they' ? 'them' : 'her'

  // Facts — plain, deduped, only what the family actually said (never the subject itself).
  const subjectLike = new Set([person, lo.relationship ?? '', `your ${lo.relationship ?? ''}`, lo.name].filter(Boolean).map(normKey))
  const seen = new Set<string>()
  const facts = [...space.known, ...space.learned]
    .filter((f) => f.body && !f.quote && !subjectLike.has(normKey(f.body)))
    .map((f) => f.body)
    .filter((b) => { const k = normKey(b); if (seen.has(k)) return false; seen.add(k); return true })
  const firstRun = facts.length === 0
  // Essentials to invite (drop the "what you call them" blank — the name is handled elsewhere).
  const openEssentials = space.blanks.filter((b) => !/what you call|nickname/i.test(b.text))
  const chips = openEssentials.slice(0, 3)
  const stillLearning = openEssentials[0] ? chipLabel(openEssentials[0].text).toLowerCase() : ''

  const relLabel = titleCase(lo.relationship ?? '')
  // Never repeat the relationship as its own line ("Mother · Mother").
  const meta = [relOnly || normKey(Person) === normKey(relLabel) ? '' : relLabel, lo.city].filter(Boolean).join(' · ')

  const Action = ({ href, tel, icon: Icon, label, mark }: { href?: string; tel?: string; icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; mark?: boolean }) => {
    const inner = (
      <>
        <span className="text-green">{mark ? <Sparkles className="h-5 w-5" strokeWidth={1.8} /> : Icon ? <Icon className="h-5 w-5" strokeWidth={1.8} /> : null}</span>
        <span className="text-caption font-semibold text-ink">{label}</span>
      </>
    )
    const cls = 'flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-accent-soft/50 py-3 transition-colors hover:bg-accent-soft'
    return tel ? <a href={tel} className={cls}>{inner}</a> : <Link href={href!} className={cls}>{inner}</Link>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/space/people" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> People
        </Link>
        <Link href={`/space/people/${lo.id}/add`} className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /> Edit
        </Link>
      </div>

      {/* HERO — lead with her */}
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent-soft text-h3 font-semibold text-green">{Person.charAt(0)}</span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-h2 text-ink">{Person}</h1>
          {meta && <p className="mt-0.5 text-body-sm text-muted">{meta}</p>}
        </div>
      </div>

      {/* Actions — Call · Ask · Add */}
      <div className="flex gap-2.5">
        {lo.phone && <Action tel={`tel:${lo.phone}`} icon={Phone} label="Call" />}
        <Action href="/space/connect" mark label="Ask" />
        <Action href={`/space/people/${lo.id}/add`} icon={Plus} label="Add" />
      </div>

      {/* Warm line — Close Eye's voice */}
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 shrink-0 text-green" strokeWidth={1.9} />
        <p className="text-body-sm text-ink">{firstRun ? `I’m just getting to know ${person}.` : `Here’s what I know about ${person}.`}</p>
      </div>

      {/* Gentle profile nudges (name, country) — subtle, fade once set */}
      {(relOnly || !lo.regionCode) && (
        <div className="flex flex-col gap-2">
          {relOnly && (
            <Link href={`/space/people/${lo.id}/add`} className="flex items-center gap-2.5 rounded-lg border border-dashed border-line bg-card/60 p-3 text-caption text-muted transition-colors hover:border-green/40 hover:text-ink">
              <Pencil className="h-3.5 w-3.5 shrink-0 text-green" strokeWidth={1.9} />
              <span className="flex-1">What do you call {poss}? Add {poss} name so Close Eye can speak about {poss} personally.</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            </Link>
          )}
          {!lo.regionCode && (
            <Link href={`/space/people/${lo.id}/add`} className="flex items-center gap-2.5 rounded-lg border border-dashed border-line bg-card/60 p-3 text-caption text-muted transition-colors hover:border-green/40 hover:text-ink">
              <Globe className="h-3.5 w-3.5 shrink-0 text-green" strokeWidth={1.9} />
              <span className="flex-1">Add {person}’s country, so Close Eye shows the right local emergency number.</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            </Link>
          )}
        </div>
      )}

      {/* What Close Eye knows — plain facts, or a calm invitation when sparse */}
      {firstRun ? (
        <section>
          <p className="mb-3 text-caption font-semibold text-muted">Help me understand {poss}</p>
          <div className="flex flex-wrap gap-2">
            {(chips.length ? chips.map((b) => chipLabel(b.text)) : ['Health', 'Daily routine', 'Who’s nearby']).map((c) => (
              <Link key={c} href={`/space/people/${lo.id}/add`} className="rounded-full border border-dashed border-line px-4 py-2 text-body-sm font-semibold text-ink transition-colors hover:border-green/50 hover:text-green">
                + {c}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="overflow-hidden rounded-2xl border border-line/70 bg-card shadow-sm">
            {facts.map((f, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < facts.length - 1 ? 'border-b border-line/50' : ''}`}>
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" strokeWidth={2.2} />
                <p className="flex-1 text-body-sm leading-relaxed text-ink">{f}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-caption text-muted">From your words{stillLearning ? ` · still learning: ${stillLearning}` : ''}</p>
        </section>
      )}

      {/* Her story — real memories, never app events */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-caption font-semibold text-muted">{Person}’s story</p>
          {memories.length > 0 && <Link href={`/space/people/${lo.id}/memories`} className="text-caption font-semibold text-green hover:text-green/80">View all</Link>}
        </div>
        {memories.length > 0 ? (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {memories.slice(0, 8).map((m) => {
              const isPhoto = m.cover?.url && m.cover.kind !== 'document'
              return (
                <Link key={m.id} href={`/space/people/${lo.id}/memories`} className="w-32 shrink-0">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line shadow-sm">
                    {isPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.cover?.url ?? undefined} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-accent-soft/70 text-green"><FileText className="h-8 w-8" strokeWidth={1.4} /></span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent px-3 pb-2 pt-8">
                      <p className="truncate text-caption font-semibold text-ivory">{m.title}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-line/70 bg-card p-7 text-center shadow-sm">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-green"><Camera className="h-5 w-5" strokeWidth={1.6} /></span>
            <p className="mx-auto mt-3 max-w-xs text-body-sm text-ink">{Person}’s story begins with your first memory of {poss}.</p>
            <Link href={`/space/people/${lo.id}/memories/add`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-body-sm font-semibold text-ivory transition-opacity hover:opacity-90">
              <Camera className="h-4 w-4" strokeWidth={2} /> Add a memory
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
