'use client'

/**
 * Guided "Add details" — the focused add flow reached from the home "Add <name>'s details" CTA
 * (founder UX decision, direction A). Instead of dropping the user on the person's VIEW page and
 * making them hunt for where to add, this walks through the open essentials ONE plain question at
 * a time (health, who's nearby, daily routine, …) and saves each via appendLearning — the same
 * store the person page's inline "tell me" uses. On finish it returns to the now-filled person page.
 */
import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { fetchSpace, appendLearning, personName } from '@/lib/db/space'
import type { Blank } from '@/lib/connect/ledger'

const cap1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// Ask the safety-relevant things first, then routine, then the rest — a sensible order for a
// first pass. Pure text match on the prompt, so it works whatever blanks the graph returns.
const PRIORITY = [/health|medic|manages/i, /reach|nearby|emergency|who can/i, /morning|routine|day/i]
function orderBlanks(blanks: Blank[]): Blank[] {
  const rank = (b: Blank) => { const i = PRIORITY.findIndex((re) => re.test(b.text)); return i === -1 ? PRIORITY.length : i }
  return [...blanks].sort((a, b) => rank(a) - rank(b))
}

export default function AddDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const person = React.useRef('them')

  const [blanks, setBlanks] = React.useState<Blank[]>([])
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [value, setValue] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [addedCount, setAddedCount] = React.useState(0)

  React.useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const s = await fetchSpace(id)
        if (!active) return
        if (!s) { setFailed(true); return }
        person.current = personName({ callName: s.callName, lovedOne: s.lovedOne })
        setBlanks(orderBlanks(s.blanks))
      } catch { if (active) setFailed(true) }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [id])

  const backHref = `/space/people/${id}`
  const total = blanks.length
  const current = blanks[step]

  async function saveAndNext() {
    if (!current || !value.trim() || busy) return
    setBusy(true); setSaveError('')
    const { error } = await appendLearning(id, current.key, value.trim())
    setBusy(false)
    if (error) { setSaveError('Couldn’t save that just now — please try again.'); return }
    setAddedCount((c) => c + 1)
    advance()
  }
  function advance() { setValue(''); setSaveError(''); setStep((s) => s + 1) }

  if (loading) return <p className="py-20 text-center text-caption text-content-muted">Opening…</p>
  if (failed) return (
    <div className="py-20 text-center">
      <p className="text-body-sm text-content">We couldn’t open this just now.</p>
      <Link href={backHref} className="mt-4 inline-block text-body-sm font-semibold text-brand">← Back</Link>
    </div>
  )

  const done = step >= total
  const who = cap1(person.current)

  // Finished (or nothing left to add): a calm confirmation, back to their page.
  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-surface-accent text-brand"><Check className="h-8 w-8" strokeWidth={2} /></span>
        <div>
          <h1 className="text-h3 text-content">{addedCount > 0 ? 'All saved.' : 'Nothing to add right now.'}</h1>
          <p className="mt-2 text-body-sm text-content-muted">
            {addedCount > 0
              ? `Close Eye knows ${person.current} a little better now. You can add more anytime.`
              : `You’ve already told Close Eye the essentials about ${person.current}.`}
          </p>
        </div>
        <Link href={backHref} className="inline-flex items-center gap-2 rounded-full bg-surface-inverse px-6 py-3 text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90">
          See {who}’s page <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-caption font-semibold text-content-muted hover:text-content">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> {who}
        </Link>
        <span className="text-caption font-semibold text-content-muted">{step + 1} of {total}</span>
      </div>

      {/* progress */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {blanks.map((_, n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-brand' : 'bg-edge'}`} />
        ))}
      </div>

      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-brand">About {person.current}</p>
        <h1 className="mt-2 text-h3 leading-snug text-content">{cap1(current!.text)}</h1>
        <p className="mt-1.5 text-body-sm text-content-muted">Write it just as you’d tell a friend. There’s no wrong answer.</p>
      </div>

      <textarea
        autoFocus
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type here…"
        className="w-full resize-none rounded-lg border border-edge bg-surface-raised px-4 py-3 text-body text-content placeholder:text-content-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      {saveError && <p className="text-caption text-error">{saveError}</p>}

      <div className="flex flex-col gap-2.5">
        <button
          onClick={saveAndNext}
          disabled={!value.trim() || busy}
          className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-surface-inverse text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</>
            : step + 1 === total ? <>Save · finish <Check className="h-4 w-4" strokeWidth={2.2} /></>
            : <>Save · next <ArrowRight className="h-4 w-4" strokeWidth={2} /></>}
        </button>
        <button onClick={advance} disabled={busy} className="min-h-[2.75rem] w-full rounded-full text-body-sm font-semibold text-content-muted transition-colors hover:text-content disabled:opacity-50">
          {step + 1 === total ? 'Skip · finish' : 'Skip for now'}
        </button>
      </div>
    </div>
  )
}
