'use client'

/**
 * Act III · Memories — Capture (grounded to the artifact). Camera-first: take a photo/video
 * straight from the app, or upload, or add a document; tag it to a MOMENT ("Siyah's birthday")
 * and save to this person's memories. Uses createMemory (lib/db/memories) → private Storage +
 * owner-only RLS. Nothing leaves the family.
 */
import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Camera, ImageUp, FileText, X, Film, Loader2, Check } from 'lucide-react'
import { useFamilyData } from '@/components/family/family-data-provider'
import { createMemory, kindOf, type NewMemoryFile } from '@/lib/db/memories'
import { titleCase } from '@/lib/family/relationship-words'
import { track } from '@/lib/analytics'

const MOMENTS = ['Birthday', 'A milestone', 'Everyday', 'A visit', 'A festival']

export default function AddMemoryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { lovedOnes } = useFamilyData()
  const person = lovedOnes.find((l) => l.id === id)
  // Relationship-only people are stored as "your mother" → the first word is "Your", which reads
  // as "Your's birthday". Use the relationship word itself ("Mother") in that case.
  const rawName = (person?.full_name || '').trim()
  const first = /^your\s/i.test(rawName) ? titleCase(rawName.replace(/^your\s+/i, '')) : (rawName.split(/\s+/)[0] || 'them')

  const [files, setFiles] = React.useState<(NewMemoryFile & { preview: string })[]>([])
  const [moment, setMoment] = React.useState('')
  const [when, setWhen] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  const cameraRef = React.useRef<HTMLInputElement>(null)
  const uploadRef = React.useRef<HTMLInputElement>(null)
  const docRef = React.useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    const next = Array.from(list).map((file) => ({ file, kind: kindOf(file), caption: '', preview: URL.createObjectURL(file) }))
    setFiles((prev) => [...prev, ...next])
  }
  function removeFile(i: number) {
    setFiles((prev) => { const f = prev[i]; if (f) URL.revokeObjectURL(f.preview); return prev.filter((_, idx) => idx !== i) })
  }
  React.useEffect(() => () => { files.forEach((f) => URL.revokeObjectURL(f.preview)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const valid = files.length > 0 && moment.trim().length > 0

  async function save() {
    if (!valid || busy || !id) return
    setBusy(true); setError('')
    const { error: e } = await createMemory({ lovedOneId: id, title: moment.trim(), occurredAt: new Date(when).toISOString(), files })
    if (e) { setBusy(false); setError('We couldn’t save this just now — please try again.'); return }
    track('memory_added', { items: files.length })
    router.replace(`/space/people/${id}/memories`)
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <Link href={`/space/people/${id}/memories`} className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> {first}’s memories
      </Link>

      <div className="text-center">
        <h1 className="text-h3 text-ink">Keep this moment</h1>
        <p className="mt-1 text-body-sm text-muted">Close Eye remembers it for your family — privately.</p>
      </div>

      {/* hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <input ref={uploadRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      <input ref={docRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />

      {/* camera-first */}
      <button type="button" onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-2 rounded-lg bg-ink px-5 py-6 text-ivory shadow-sm transition-opacity hover:opacity-90">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-ivory/10 text-green"><Camera className="h-7 w-7" strokeWidth={1.6} /></span>
        <span className="text-body font-semibold">Take a photo or video</span>
        <span className="text-caption text-ivory/70">Capture it now, straight from the app</span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => uploadRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
          <ImageUp className="h-5 w-5 text-green" strokeWidth={1.75} /><span className="text-body-sm font-semibold text-ink">Upload</span><span className="text-caption text-muted">Photos &amp; videos</span>
        </button>
        <button type="button" onClick={() => docRef.current?.click()} className="flex flex-col items-center gap-1.5 rounded-lg border border-line/70 bg-card p-4 shadow-sm transition-colors hover:border-green/40">
          <FileText className="h-5 w-5 text-green" strokeWidth={1.75} /><span className="text-body-sm font-semibold text-ink">Document</span><span className="text-caption text-muted">Report, card, letter</span>
        </button>
      </div>

      {/* selected media */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-line bg-accent-soft">
              {f.kind === 'photo' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-green">{f.kind === 'video' ? <Film className="h-7 w-7" strokeWidth={1.5} /> : <FileText className="h-7 w-7" strokeWidth={1.5} />}</span>
              )}
              <button type="button" onClick={() => removeFile(i)} aria-label="Remove" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-ivory"><X className="h-3.5 w-3.5" strokeWidth={2.2} /></button>
            </div>
          ))}
        </div>
      )}

      {/* tag the moment */}
      <div className="flex flex-col gap-5 rounded-lg border border-line/70 bg-card p-5 shadow-sm">
        <div>
          <label htmlFor="m-title" className="mb-2 block text-caption font-semibold uppercase tracking-widest text-muted">The moment</label>
          <input id="m-title" value={moment} onChange={(e) => setMoment(e.target.value)} placeholder={`e.g. ${first}’s birthday`} autoComplete="off"
            className="w-full rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-body text-ink placeholder:text-muted/70 focus:border-green focus:outline-none" />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {MOMENTS.map((m) => (
              <button key={m} type="button" onClick={() => setMoment(m === 'Birthday' ? `${first}’s birthday` : m)} className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-ink transition-colors hover:border-green/40">{m}</button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="m-when" className="mb-2 block text-caption font-semibold uppercase tracking-widest text-muted">When</label>
          <input id="m-when" type="date" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full rounded-lg border border-line bg-ivory px-3.5 py-2.5 text-body text-ink focus:border-green focus:outline-none" />
        </div>
      </div>

      {error && <p className="text-caption text-error">{error}</p>}

      <button onClick={save} disabled={!valid || busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-body-sm font-semibold text-ivory disabled:opacity-40">
        {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : <><Check className="h-5 w-5" strokeWidth={2} /> Save to {first}’s memories</>}
      </button>
      <p className="text-center text-caption text-muted">Private to your family. Stored securely — only you can see it.</p>
    </div>
  )
}
