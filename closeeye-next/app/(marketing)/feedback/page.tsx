'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, Bug, Lightbulb } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { SuccessState } from '@/components/ui/states'
import { haptic } from '@/lib/haptics'
import { submitFeedback } from '@/lib/db/feedback'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Overall experience', 'A visit', 'A Guardian', 'A Companion', 'The Care Team']

export default function FeedbackPage() {
  const [rating, setRating] = React.useState(0)
  const [nps, setNps] = React.useState<number | null>(null)
  const [category, setCategory] = React.useState(CATEGORIES[0]!)
  const [kind, setKind] = React.useState<'praise' | 'bug' | 'idea'>('praise')
  const [message, setMessage] = React.useState('')
  const [sent, setSent] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    // Persist first — only show the "goes straight to the team" success on a
    // genuine write, never a fake confirmation.
    const res = await submitFeedback({ rating, nps, category, kind, message })
    if (res.ok) {
      haptic('success')
      setSent(true)
    } else {
      setError(res.error ?? 'Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  if (sent) {
    return (
      <Container className="section-pad pt-32 sm:pt-36">
        <SuccessState
          title="Thank you 💚"
          message="Your feedback goes straight to the team. It’s how Close Eye keeps getting warmer and better."
          action={<Button asChild variant="secondary"><Link href="/">Back home</Link></Button>}
        />
      </Container>
    )
  }

  return (
    <Container className="max-w-measure section-pad pt-32 sm:pt-36">
      <Button asChild variant="text"><Link href="/"><ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Back home</Link></Button>
      <h1 className="mt-8 text-h2">Share your feedback</h1>
      <p className="mt-4 text-lead text-muted">A minute of your time makes Close Eye better for every family.</p>

      <form onSubmit={submit} className="mt-10 flex flex-col gap-8">
        {/* Rating */}
        <div>
          <p className="text-body font-medium text-ink">How was your experience?</p>
          <div className="mt-3 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => { setRating(n); haptic('light') }} aria-label={`${n} star${n === 1 ? '' : 's'}`} className="p-1 transition-transform hover:scale-110">
                <Star className={cn('h-9 w-9 transition-colors', n <= rating ? 'fill-warning text-warning' : 'fill-transparent text-line')} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        {/* NPS */}
        <div>
          <p className="text-body font-medium text-ink">How likely are you to recommend Close Eye?</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: 11 }).map((_, n) => (
              <button key={n} type="button" onClick={() => setNps(n)} className={cn('h-10 w-10 rounded-md border text-body-sm font-semibold transition-colors', nps === n ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink')}>{n}</button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-caption text-muted"><span>Not likely</span><span>Very likely</span></div>
        </div>

        {/* Category */}
        <div>
          <p className="text-body font-medium text-ink">What’s this about?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} className={cn('rounded-full border px-3.5 py-1.5 text-caption font-semibold transition-colors', category === c ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink')}>{c}</button>
            ))}
          </div>
        </div>

        {/* Kind */}
        <div>
          <p className="text-body font-medium text-ink">Type</p>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {([['praise', 'Praise', Star], ['bug', 'Bug report', Bug], ['idea', 'Feature idea', Lightbulb]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={cn('flex min-h-[3rem] items-center justify-center gap-2 rounded-md border text-body-sm font-semibold transition-colors', kind === k ? 'border-green bg-accent-soft/50 text-ink' : 'border-line text-muted hover:border-ink/25')}>
                <Icon className={cn('h-4 w-4', kind === k ? 'text-green' : 'text-muted')} strokeWidth={1.75} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <label className="block">
          <span className="text-body font-medium text-ink">Tell us more</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="In your own words…" className="mt-2 w-full resize-none rounded-sm border border-line bg-ivory px-4 py-3 text-body text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
        </label>

        {error && <p className="text-body-sm text-error">{error}</p>}
        <Button type="submit" size="lg" disabled={busy || (rating === 0 && nps === null && !message.trim())}>{busy ? 'Sending…' : 'Send feedback'}</Button>
      </form>
    </Container>
  )
}
