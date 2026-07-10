'use client'

import * as React from 'react'
import { Check, Heart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitCompanionApplication } from '@/lib/companion-applicants'
import { cn } from '@/lib/utils'

const SKILLS = ['Conversation', 'Walk', 'Reading', 'Hospital Companion', 'Shopping Assistance', 'Music', 'Cooking company']

export function CompanionApplication() {
  const [name, setName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [city, setCity] = React.useState('')
  const [skills, setSkills] = React.useState<string[]>([])
  const [why, setWhy] = React.useState('')
  const [done, setDone] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const valid = name.trim() && phone.trim() && city.trim()

  function toggleSkill(s: string) {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    // Real Supabase insert — the success screen only shows if it actually saved.
    const res = await submitCompanionApplication({ name, phone, city, skills, why })
    setSubmitting(false)
    if (!res.ok) { setError(res.error ?? 'Something went wrong. Please try again.'); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-green">
          <Heart className="h-8 w-8" strokeWidth={1.5} />
        </span>
        <h3 className="mt-5 text-h3 text-ink">Thank you, {name.split(' ')[0]}.</h3>
        <p className="mt-2 text-body leading-relaxed text-muted">
          Your application is in. Our team will reach out within a few days to begin your background verification and a warm first conversation. Welcome to Close Eye.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line/70 bg-card p-6 shadow-sm sm:p-8">
      <h3 className="text-h3 text-ink">Apply to become a Companion</h3>
      <p className="mt-1.5 text-body-sm text-muted">A few details to get started. No experience needed — just warmth.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-body-sm"><span className="mb-1.5 block font-medium text-ink">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
        </label>
        <label className="text-body-sm"><span className="mb-1.5 block font-medium text-ink">Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+91 …" className="w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
        </label>
      </div>
      <label className="mt-4 block text-body-sm"><span className="mb-1.5 block font-medium text-ink">City</span>
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Hyderabad" className="w-full rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
      </label>

      <div className="mt-4">
        <span className="mb-2 block text-body-sm font-medium text-ink">How would you love to help?</span>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((s) => {
            const on = skills.includes(s)
            return (
              <button key={s} type="button" onClick={() => toggleSkill(s)} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-caption font-medium transition-colors', on ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink')}>
                {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />} {s}
              </button>
            )
          })}
        </div>
      </div>

      <label className="mt-4 block text-body-sm"><span className="mb-1.5 block font-medium text-ink">Why Close Eye? <span className="font-normal text-muted">(optional)</span></span>
        <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} placeholder="A sentence about why you'd like to spend time with elders…" className="w-full resize-none rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
      </label>

      {error && <p className="mt-4 text-center text-body-sm text-error">{error}</p>}
      <Button type="submit" size="lg" className="mt-6 w-full" disabled={!valid || submitting}>
        {submitting ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Submitting…</> : 'Submit application'}
      </Button>
      <p className="mt-3 text-center text-caption text-muted">By applying you agree to a background verification. We&apos;ll be in touch within a few days.</p>
    </form>
  )
}
