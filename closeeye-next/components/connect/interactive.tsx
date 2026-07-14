'use client'

/**
 * Client-side interactive pieces of /connect: the sticky nav, the scroll-reveal
 * wrapper, the "Ask" preview, and the founding sign-up form. Self-contained —
 * imports nothing from the existing marketing app (only the local Mark + config).
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Mark } from './mark'
import type { ModeConfig } from './config'

/* ── Sticky header ──────────────────────────────────────────────────────── */
export function SiteNav({ ctaLabel }: { ctaLabel: string }) {
  const [scrolled, setScrolled] = React.useState(false)
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`cx-header${scrolled ? ' cx-scrolled' : ''}`}>
      <div className="cx-wrap cx-nav">
        <a className="cx-brand" href="#top" aria-label="Close Eye Connect — top">
          <Mark size={30} />
          <b>Close&nbsp;Eye</b>
        </a>
        <a className="cx-btn cx-btn-primary cx-navcta" href="#founding">{ctaLabel}</a>
      </div>
    </header>
  )
}

/* ── Scroll reveal (bulletproof: always resolves visible) ───────────────── */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [shown, setShown] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) { setShown(true); return }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    io.observe(el)
    const t = window.setTimeout(() => { setShown(true); io.disconnect() }, 1500) // never let content stay hidden
    return () => { io.disconnect(); window.clearTimeout(t) }
  }, [])
  return <div ref={ref} className={`cx-reveal${shown ? ' cx-in' : ''}${className ? ' ' + className : ''}`}>{children}</div>
}

/* ── "Ask" preview ──────────────────────────────────────────────────────── */
const CHIPS = ['How is Amma today?', 'Is Dad taking his medicine?', 'I’m worried, and far away.'] as const
const REPLIES: Record<string, string> = {
  'How is Amma today?':
    'Calm and well. 🌿 Meera, her Guardian, sat with her over morning tea — Amma asked about you, and smiled at the photos. Nothing to worry about today.',
  'Is Dad taking his medicine?':
    'Yes — his morning dose at 8:30, checked and done. His blood pressure looked steady this week, and we’ll tell you the moment anything changes.',
  'I’m worried, and far away.':
    'That’s the hardest part of loving someone from a distance. Someone is with them today, and we’ll keep you close to everything that matters. You’re not carrying this alone.',
}
type Msg = { who: 'you' | 'them'; text: string }

export function AskPreview() {
  const [msgs, setMsgs] = React.useState<Msg[]>([
    { who: 'them', text: 'Hello 🌿 Ask me anything about the people you love — I’m right here.' },
  ])
  const [typing, setTyping] = React.useState(false)
  const [pressed, setPressed] = React.useState<string | null>(null)
  const busy = React.useRef(false)
  const threadRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, typing])

  const ask = (q: string) => {
    if (busy.current) return
    busy.current = true
    setPressed(q)
    setMsgs((m) => [...m, { who: 'you', text: q }])
    const reply = REPLIES[q] ?? 'I’m right here.'
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setMsgs((m) => [...m, { who: 'them', text: reply }])
      busy.current = false
      return
    }
    setTyping(true)
    window.setTimeout(() => {
      setTyping(false)
      setMsgs((m) => [...m, { who: 'them', text: reply }])
      busy.current = false
    }, 750)
  }

  return (
    <div className="cx-demo" role="group" aria-label="A sample Close Eye Connect conversation">
      <div className="cx-demotop">
        <Mark size={32} />
        <span className="cx-who">Close&nbsp;Eye<span>with your family, always</span></span>
      </div>
      <div className="cx-thread" ref={threadRef} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`cx-bubble cx-enter ${m.who === 'you' ? 'cx-you' : 'cx-them'}`}>{m.text}</div>
        ))}
        {typing && (
          <div className="cx-typing" aria-hidden="true"><i></i><i></i><i></i></div>
        )}
      </div>
      <div className="cx-chips" role="group" aria-label="Try a question">
        {CHIPS.map((q) => (
          <button key={q} type="button" className="cx-chip" aria-pressed={pressed === q} onClick={() => ask(q)}>{q}</button>
        ))}
      </div>
    </div>
  )
}

/* ── Founding sign-up ───────────────────────────────────────────────────── */
export function FoundingForm({ cta, note, handoff }: { cta: string; note: string; handoff: boolean }) {
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [done, setDone] = React.useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return
    if (handoff) {
      // Reuse the existing founder registration flow — no new tables, no new logic.
      router.push(`/auth?intent=founding&email=${encodeURIComponent(email.trim())}`)
      return
    }
    setDone(true)
  }

  if (done) {
    return <p className="cx-thanks" role="status">Your place is held. 🌿 We&rsquo;ll be in touch before August&nbsp;1.</p>
  }

  return (
    <>
      <form className="cx-signup" onSubmit={submit} noValidate>
        <label htmlFor="cx-email" className="cx-sr">Your email address</label>
        <input
          id="cx-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="cx-btn" type="submit">{cta}</button>
      </form>
      <p className="cx-fnote">{note}</p>
    </>
  )
}
