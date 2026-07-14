'use client'

/**
 * Client-side interactive pieces of /connect: the sticky nav, a choreographed
 * scroll-reveal, the Ask demonstration (the product centrepiece), and the founding
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

/* ── Ask demonstration — the product centrepiece ────────────────────────────
   Tap a question → Connect pauses, *remembers* (surfacing what it knows about the
   family), then answers warmly. Proves Family Intelligence by demonstration. ── */
const CHIPS = ['How is Amma today?', 'Is Dad taking his medicine?', 'I’m worried, and far away.'] as const

const MEMORY: Record<string, string[]> = {
  'How is Amma today?': ['Amma · 72', 'morning tea with Meera', 'BP steady this week'],
  'Is Dad taking his medicine?': ['8:30 AM dose', 'blood pressure', 'checked today'],
  'I’m worried, and far away.': ['loving from afar', 'someone is with them today'],
}

const REPLIES: Record<string, string> = {
  'How is Amma today?':
    'Calm and well. 🌿 Meera sat with her over morning tea — Amma asked about you, and smiled at the photos. Nothing to worry about today.',
  'Is Dad taking his medicine?':
    'Yes — his morning dose at 8:30, checked and done. His blood pressure looked steady this week, and we’ll tell you the moment anything changes.',
  'I’m worried, and far away.':
    'That’s the hardest part of loving someone from a distance. Someone is with them today, and we’ll keep you close to everything that matters. You’re not carrying this alone.',
}

type Msg = { who: 'you' | 'them'; text: string }
type Phase = 'idle' | 'thinking' | 'remembering' | 'answer'

export function AskDemo() {
  const [msgs, setMsgs] = React.useState<Msg[]>([
    { who: 'them', text: 'Hello 🌿 Ask me anything about the people you love — I’m right here.' },
  ])
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [memories, setMemories] = React.useState<string[]>([])
  const [pressed, setPressed] = React.useState<string | null>(null)
  const busy = React.useRef(false)
  const timers = React.useRef<number[]>([])
  const threadRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, phase])

  React.useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  const ask = (q: string) => {
    if (busy.current) return
    busy.current = true
    setPressed(q)
    setMsgs((m) => [...m, { who: 'you', text: q }])
    const reply = REPLIES[q] ?? 'I’m right here.'

    if (prefersReduced()) {
      setMsgs((m) => [...m, { who: 'them', text: reply }])
      busy.current = false
      return
    }

    const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
    setPhase('thinking')
    after(680, () => { setMemories(MEMORY[q] ?? []); setPhase('remembering') })
    after(1720, () => {
      setMemories([])
      setPhase('answer')
      setMsgs((m) => [...m, { who: 'them', text: reply }])
    })
    after(2000, () => { setPhase('idle'); busy.current = false })
  }

  return (
    <div className="cx-demo" role="group" aria-label="A sample Close Eye Connect conversation">
      <div className="cx-demotop">
        <Mark size={30} />
        <span className="cx-who">Close&nbsp;Eye<span>with your family, always</span></span>
      </div>
      <div className="cx-thread" ref={threadRef} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`cx-bubble cx-enter ${m.who === 'you' ? 'cx-you' : 'cx-them'}`}>{m.text}</div>
        ))}
        {phase === 'thinking' && (
          <div className="cx-typing" aria-label="Thinking"><i></i><i></i><i></i></div>
        )}
        {phase === 'remembering' && (
          <div className="cx-remember" aria-label="Remembering">
            <span className="cx-remlabel">remembering</span>
            <span className="cx-mems">
              {memories.map((mem, i) => (
                <span key={mem} className="cx-mem" style={{ animationDelay: `${i * 120}ms` }}>{mem}</span>
              ))}
            </span>
          </div>
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
