'use client'

/**
 * Client-side interactive pieces of /connect: the sticky nav, a choreographed
 * scroll-reveal, the live Ask experience (the product centrepiece), and the founding
 * sign-up. Self-contained — imports only the local Mark + config. Motion is calm,
 * purposeful, and always reduced-motion-safe.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Mark, Logo } from './mark'

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
        <a className="cx-brand" href="#top" aria-label="Close Eye — top of page">
          <Logo height={24} />
          <span className="cx-brandtag">Trusted presence</span>
        </a>
        <a className="cx-btn cx-btn-primary cx-navcta" href="#founding">{ctaLabel}</a>
      </div>
    </header>
  )
}

/* ── Choreographed reveal (bulletproof; staggerable via `delay`) ─────────── */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [shown, setShown] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReduced() || !('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )
    io.observe(el)
    const t = window.setTimeout(() => { setShown(true); io.disconnect() }, 1500)
    return () => { io.disconnect(); window.clearTimeout(t) }
  }, [])
  return (
    <div
      ref={ref}
      className={`cx-reveal${shown ? ' cx-in' : ''}${className ? ' ' + className : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

/* ── Ask — a live first conversation (the product centrepiece) ───────────────
   Type anything. Connect reads it and looks through what it knows about your
   family — and because it has never met yours, it says so honestly (it never
   guesses or invents), then invites you to create your family's private space.
   This teaches the product: understanding first, then answers. ── */
const STARTERS = ['How is Amma today?', 'Is Dad taking his medicine?', 'Did they sleep well?'] as const

const HONEST_ANSWER =
  'I’d love to tell you — but I never guess about the people you love. I only ever speak from what your family has actually shared with me. Create your family’s private space, and I’ll come to know them the way you do.'

type Msg = { who: 'you' | 'them'; text: string; invite?: boolean }
type Phase = 'idle' | 'reading' | 'searching' | 'answered'

export function AskDemo() {
  const [msgs, setMsgs] = React.useState<Msg[]>([
    { who: 'them', text: 'Hello 🌿 Ask me anything about the people you love — I’m right here.' },
  ])
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [input, setInput] = React.useState('')
  const busy = React.useRef(false)
  const timers = React.useRef<number[]>([])
  const threadRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, phase])

  React.useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  const ask = (raw: string) => {
    const q = raw.trim()
    if (!q || busy.current) return
    busy.current = true
    setInput('')
    setMsgs((m) => [...m, { who: 'you', text: q }])

    const finish = () => {
      setMsgs((m) => [...m, { who: 'them', text: HONEST_ANSWER, invite: true }])
      setPhase('idle')
      busy.current = false
    }

    if (prefersReduced()) { finish(); return }
    const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    setPhase('reading')
    after(760, () => setPhase('searching'))
    after(1980, () => { setPhase('answered'); finish() })
  }

  const status =
    phase === 'reading' ? 'Reading your question' :
    phase === 'searching' ? 'Looking for what I know about your family' : ''

  return (
    <div className="cx-demo" role="group" aria-label="Ask Close Eye — a live first conversation">
      <div className="cx-demotop">
        <Mark size={30} />
        <span className="cx-who">Close&nbsp;Eye<span>your first conversation</span></span>
      </div>
      <div className="cx-thread" ref={threadRef} aria-live="polite">
        {msgs.map((m, i) => (
          <React.Fragment key={i}>
            <div className={`cx-bubble cx-enter ${m.who === 'you' ? 'cx-you' : 'cx-them'}`}>{m.text}</div>
            {m.invite && (
              <a className="cx-answer-cta cx-enter" href="#founding">
                Create your family’s space <span aria-hidden="true">→</span>
              </a>
            )}
          </React.Fragment>
        ))}
        {(phase === 'reading' || phase === 'searching') && (
          <div className="cx-reason" aria-label={status}>
            <span className="cx-reason-label">{status}</span>
            <span className="cx-typing" aria-hidden="true"><i></i><i></i><i></i></span>
          </div>
        )}
      </div>

      <form className="cx-askform" onSubmit={(e) => { e.preventDefault(); ask(input) }}>
        <label htmlFor="cx-ask" className="cx-sr">Ask about the people you love</label>
        <input
          id="cx-ask"
          className="cx-askinput"
          type="text"
          value={input}
          placeholder="Ask about the people you love…"
          autoComplete="off"
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="cx-asksend" type="submit" aria-label="Ask" disabled={!input.trim() || busy.current}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>

      <div className="cx-chips" role="group" aria-label="Or try one of these">
        {STARTERS.map((q) => (
          <button key={q} type="button" className="cx-chip" onClick={() => ask(q)}>{q}</button>
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
      router.push(`/auth?intent=founding&email=${encodeURIComponent(email.trim())}`)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <p className="cx-thanks" role="status">
        <span className="cx-thankmark" aria-hidden="true">🌿</span>
        Your family’s place is held. We’ll be in touch before August&nbsp;1.
      </p>
    )
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
