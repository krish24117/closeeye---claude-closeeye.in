'use client'

/**
 * Act III · Memories — Recollect (grounded to the artifact). A person's moments, newest first:
 * search by title, each moment a grid of photos/videos/documents. Reads fetchMemories (grouped +
 * short-lived signed URLs from the private bucket). Nothing here is public.
 */
import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Search, Plus, FileText, Play, ImageOff, Trash2, Loader2 } from 'lucide-react'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchMemories, deleteMemory, deleteMemoryItem, type MemoryView, type MemoryItemView } from '@/lib/db/memories'
import { formatDate } from '@/lib/platform/locale'
import { DEFAULT_REGION_CODE } from '@/lib/platform/regions'

export default function MemoriesPage() {
  const { id } = useParams<{ id: string }>()
  const { lovedOnes } = useFamilyData()
  const first = (lovedOnes.find((l) => l.id === id)?.full_name || 'their').trim().split(/\s+/)[0]

  const [memories, setMemories] = React.useState<MemoryView[] | null>(null)
  const [error, setError] = React.useState(false)
  const [q, setQ] = React.useState('')
  // A pending delete — either one item (photo/video/document) or a whole moment. A confirm sheet
  // renders from this, so nothing is ever removed on a single accidental tap.
  const [pending, setPending] = React.useState<{ kind: 'item' | 'moment'; id: string; paths: string[]; label: string; memoryId?: string } | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [delError, setDelError] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!id) return
    setError(false)
    try { setMemories(await fetchMemories(id)) } catch { setError(true) }
  }, [id])
  React.useEffect(() => { void load() }, [load])

  async function confirmDelete() {
    if (!pending) return
    setDeleting(true); setDelError(false)
    const res = pending.kind === 'moment'
      ? await deleteMemory(pending.id, pending.paths)
      : await deleteMemoryItem(pending.id, pending.paths[0] ?? '', pending.memoryId)
    setDeleting(false)
    if (res.error) { setDelError(true); return }
    setPending(null)
    await load()
  }

  const shown = (memories ?? []).filter((m) => m.title.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/space/people/${id}`} className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> {first}
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h2 text-ink">Memories</h1>
        <Link href={`/space/people/${id}/memories/add`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-caption font-semibold text-ivory">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} /> Add
        </Link>
      </div>

      {memories !== null && memories.length > 0 && (
        <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 text-body-sm text-muted">
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Show me ${first}’s birthdays…`} className="w-full bg-transparent text-ink placeholder:text-muted focus:outline-none" />
        </div>
      )}

      {memories === null && !error && <p className="py-16 text-center text-caption text-muted">Opening the memories…</p>}
      {error && (
        <div className="py-16 text-center">
          <p className="text-body-sm text-ink">We couldn’t open the memories just now.</p>
          <button onClick={load} className="mt-4 rounded-full bg-ink px-5 py-2 text-body-sm font-semibold text-ivory">Try again</button>
        </div>
      )}

      {memories !== null && memories.length === 0 && (
        <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
          <p className="text-body-sm font-semibold text-ink">No memories yet</p>
          <p className="mx-auto mt-1 max-w-xs text-caption text-muted">Capture a photo, video or a document — a birthday, a visit, an everyday moment — and Close Eye keeps it for your family.</p>
          <Link href={`/space/people/${id}/memories/add`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-body-sm font-semibold text-ivory"><Plus className="h-4 w-4" strokeWidth={2.4} /> Add a memory</Link>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {shown.map((m) => (
          <section key={m.id}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 flex-1 truncate text-h4 text-ink">{m.title}</h2>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-caption font-semibold uppercase tracking-wide text-muted">{formatDate(new Date(m.occurredAt), DEFAULT_REGION_CODE, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <button onClick={() => setPending({ kind: 'moment', id: m.id, paths: m.items.map((i) => i.path), label: 'moment' })} aria-label={`Delete ${m.title}`} className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-error/10 hover:text-error">
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {m.items.map((it) => (
                <MediaTile key={it.id} it={it} onDelete={() => setPending({ kind: 'item', id: it.id, paths: [it.path], label: it.kind === 'document' ? 'document' : it.kind === 'video' ? 'video' : 'photo', memoryId: m.id })} />
              ))}
            </div>
          </section>
        ))}
        {memories !== null && memories.length > 0 && shown.length === 0 && (
          <p className="py-8 text-center text-caption text-muted">No moments match “{q}”.</p>
        )}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={() => !deleting && setPending(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-h4 text-ink">Delete this {pending.label}?</h3>
            <p className="mt-2 text-body-sm text-muted">
              {pending.kind === 'moment'
                ? 'This removes the whole moment and everything in it from your family’s memories. This can’t be undone.'
                : 'This removes it from your family’s memories. This can’t be undone.'}
            </p>
            {delError && <p className="mt-3 text-caption text-error">We couldn’t delete that just now — please try again.</p>}
            <div className="mt-5 flex flex-col gap-2.5">
              <button onClick={confirmDelete} disabled={deleting} className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-error text-body-sm font-semibold text-ivory transition-opacity hover:opacity-90 disabled:opacity-60">
                {deleting ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Deleting…</> : <><Trash2 className="h-4 w-4" strokeWidth={2} /> Delete</>}
              </button>
              <button onClick={() => setPending(null)} disabled={deleting} className="min-h-[2.75rem] w-full rounded-full text-body-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50">Keep it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MediaTile({ it, onDelete }: { it: MemoryItemView; onDelete: () => void }) {
  const media = it.kind === 'document' ? (
    <a href={it.url ?? '#'} target="_blank" rel="noopener" className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-line bg-card p-3 text-center shadow-sm transition-colors hover:border-green/40">
      <FileText className="h-7 w-7 text-green" strokeWidth={1.5} />
      <span className="line-clamp-2 text-caption font-semibold text-ink">{it.caption || 'Document'}</span>
    </a>
  ) : (
    <a href={it.url ?? '#'} target="_blank" rel="noopener" className="relative block aspect-square overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      {it.url ? (
        it.kind === 'video' ? (
          <>
            <video src={it.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-ink/55 text-ivory"><Play className="h-5 w-5" strokeWidth={2} fill="currentColor" /></span></span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.url} alt={it.caption || ''} loading="lazy" className="h-full w-full object-cover" />
        )
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted"><ImageOff className="h-6 w-6" strokeWidth={1.5} /></span>
      )}
      {it.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent px-2 pb-1.5 pt-5 text-caption font-medium text-ivory">{it.caption}</span>}
    </a>
  )
  return (
    <div className="relative">
      {media}
      <button
        onClick={onDelete}
        aria-label={`Delete this ${it.kind}`}
        className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-ink/55 text-ivory backdrop-blur-sm transition-colors hover:bg-error"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}
