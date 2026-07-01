import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, Menu, X, ArrowRight, Shield, Stethoscope, User, Send, Loader2 } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/lib/auth-context'

/* ------------------------------------------------------------------ */
/*  Constants + data                                                    */
/* ------------------------------------------------------------------ */

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919000221261'
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Hi%2C%20I%27m%20interested%20in%20Close%20Eye%20for%20my%20family`

const NAV_LINKS: { label: string; href?: string; to?: string }[] = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#services', label: 'Services' },
  { href: '#pricing', label: 'Pricing' },
  // { to: '/for-societies', label: 'For Societies' }, // disabled — re-enable when societies feature launches
  { to: '/companions', label: 'Companions' },
]

const TRUST_SIGNALS = [
  'GPS-verified visits',
  'Doctor-reviewed reports',
  'WhatsApp delivered',
  'Apollo Hospital nearby',
]

const WA_MESSAGES = [
  {
    text: '*Visit Summary — Mrs. Lakshmi Devi ✓*\n📅 Today, 3:45pm | ⏱ 52 minutes\nCompanion: Krishna',
    time: '3:47 PM',
  },
  {
    text: 'How she is today:\nMrs. Lakshmi was in warm spirits. She lit up talking about your last video call and asked me to send you her love 🙂',
    time: '3:47 PM',
  },
  {
    text: '*Health snapshot:*\n😊 Mood: Good\n✅ Eaten: Breakfast + lunch\n✅ Medicines: All taken on schedule\n🏠 Home: Clean and safe',
    time: '3:48 PM',
  },
  {
    text: "*From today's visit:*\nShe showed me your graduation photo on her bedside table — she's so proud of you 🥹",
    time: '3:48 PM',
  },
  {
    text: 'Next visit: Thursday 26th June\nQuestions? Reply here. 🌿',
    time: '3:48 PM',
  },
]

const PROBLEM_QUOTES = [
  {
    text: "I call every day. But I still don't know if she actually ate. Or if she took her BP medicine. Or if she's just saying she's fine to not worry me.",
    attr: '— NRI family, Houston TX',
  },
  {
    text: "Mom will always tell me she's fine — she never wants to be a worry. I just want someone there who truly knows how she's doing.",
    attr: '— NRI family, Dubai',
  },
  {
    text: 'The worst part is not the distance. It’s the not knowing.',
    attr: '— NRI family, London',
  },
]

const STEPS_ABROAD = [
  { title: 'Register in 2 minutes', body: 'Tell us about your parent. Their health history, preferences, what makes them comfortable.' },
  { title: 'We keep you updated', body: 'WhatsApp report within 1 hour of every visit. Health snapshot, personal moments, any concerns.' },
  { title: 'Peace of mind — always', body: 'You always know your parent is safe, cared for, and not alone. Even from 10,000 miles away.' },
]

const STEPS_HOME = [
  { title: 'We introduce ourselves', body: 'We visit, have tea, and listen. No medical forms. No equipment. Just genuine conversation.' },
  { title: 'We check everything', body: 'Medicines. Meals. Home safety. And one personal moment we always capture for your family.' },
  { title: 'They feel valued — not monitored', body: 'Not a service. A relationship. We remember what they like, what they worry about, their stories.' },
]

const PILLARS = [
  {
    icon: Shield,
    title: 'Verified Companions',
    body: 'Every companion is background-verified, personally interviewed, and trained before their first visit. GPS check-in on every visit. No exceptions.',
  },
  {
    icon: Stethoscope,
    title: 'Doctor-Reviewed Reports',
    body: "Every complex query is reviewed by a qualified doctor. Monthly reports are clinically signed. Your parent's health is taken seriously.",
  },
  {
    icon: User,
    title: 'Founder-Led Quality',
    body: 'Our founder personally conducts early visits. Trust is earned in person — not promised on a website.',
  },
]

const ADVISORS = [
  // Sanjay Arora hidden until the advisory agreement is signed.
  // To re-enable, set enabled: true.
  { initials: 'SA', name: 'Sanjay Arora', role: 'Brand Strategist', detail: 'TEDx Speaker · CNN-NEWS18 · 738K followers', enabled: false },
  { initials: 'DR', name: 'Dr. [Name]', role: 'Orthopaedic Surgeon', detail: 'Apollo Hospital, Hyderabad', enabled: true },
  { initials: 'SS', name: 'Dr. Sidharth', role: 'Medical Co-Founder', detail: 'MBBS · Hyderabad Hospital Network', enabled: true },
]

const FOUNDING_BENEFITS = [
  'Whole family set up — profiles, meds, emergency contacts',
  '24/7 wellbeing assistant (guidance, not diagnosis)',
  'Priority emergency coordination',
  '10% off every Close Eye service',
  'No monthly commitment',
]

const MONTHLY_BENEFITS = [
  '1 home visit every month',
  'Weekly wellbeing calls',
  'WhatsApp report after every visit',
  'Medicine reminders',
  'Priority emergency response',
]

const ONDEMAND_EXAMPLES = [
  { name: 'Home Visit', price: '₹1,000' },
  { name: 'Doctor Visit Support', price: '₹1,500' },
  { name: 'Emergency Response', price: '₹3,000' },
  { name: 'Grocery & Medicine', price: '₹500' },
]

/* ------------------------------------------------------------------ */
/*  Public Ask widget (Tier 0 — no login required)                    */
/* ------------------------------------------------------------------ */

const PUBLIC_CAP_KEY   = 'ce_pub_ask_count'
const PUBLIC_CAP_LIMIT = 3

const SAMPLE_QUESTIONS = [
  'Is it normal for him to sleep more in the day?',
  'Foods that help with constipation?',
  'How to make the bathroom safer?',
]

const DISCLAIMER = 'General guidance from Ask Close Eye, guided by our medical team. Not a substitute for professional medical advice.'

interface PublicAskResponse {
  lane: 'escalate' | 'inform'
  message: string
  ambulanceNumber?: string
  disclaimer?: string
  nudge?: string
  requiresHuman?: boolean
}

function HomeAskWidget() {
  const [question, setQuestion]         = useState('')
  const [answer, setAnswer]             = useState<PublicAskResponse | null>(null)
  const [typing, setTyping]             = useState(false)
  const [capReached, setCapReached]     = useState(() => {
    try { return Number(localStorage.getItem(PUBLIC_CAP_KEY) ?? '0') >= PUBLIC_CAP_LIMIT } catch { return false }
  })
  const inputRef = useRef<HTMLInputElement>(null)

  function bumpCap() {
    try {
      const n = Number(localStorage.getItem(PUBLIC_CAP_KEY) ?? '0') + 1
      localStorage.setItem(PUBLIC_CAP_KEY, String(n))
      if (n >= PUBLIC_CAP_LIMIT) setCapReached(true)
    } catch { /* ignore */ }
  }

  const ask = useCallback(async (q: string) => {
    const text = q.trim()
    if (!text || typing) return
    setTyping(true); setAnswer(null)
    try {
      const { data, error } = await supabase.functions.invoke('ask-health-public', { body: { question: text } })
      if (error) throw error
      setAnswer(data as PublicAskResponse)
      bumpCap()
    } catch {
      setAnswer({ lane: 'inform', message: "We couldn't reach our medical team right now. For anything urgent, please call 108.", disclaimer: DISCLAIMER, requiresHuman: false })
    } finally {
      setTyping(false)
    }
  }, [typing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    ask(question)
  }

  function handleChip(q: string) {
    setQuestion(q)
    inputRef.current?.focus()
    ask(q)
  }

  const isEscalate = answer?.lane === 'escalate'

  return (
    <div id="ask-free" style={{ background: '#fff', border: '1px solid #e3ddd1', borderRadius: 18, padding: '18px 18px 20px', boxShadow: '0 14px 34px rgba(14,42,31,.1)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: '#0E2A1F' }}>
          <Logo className="w-4 h-4" />
          Or, ask us anything — free
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: '#2c6b43', background: '#eaf5ee', border: '1px solid #cfe6d7', padding: '4px 9px', borderRadius: 999 }}>
          Try now
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: '#5c6b62', marginBottom: 13 }}>
        A health question about your parent? Ask Close Eye, guided by our medical team.
      </p>

      {/* Sample chips */}
      {!answer && !typing && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 13 }}>
          {SAMPLE_QUESTIONS.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => handleChip(q)}
              style={{
                fontSize: 12, fontWeight: 600, color: '#163b2c',
                background: '#FAF7F2', border: '1px solid #A8D5B5',
                borderRadius: 999, padding: '7px 11px', cursor: 'pointer',
                fontFamily: 'inherit', lineHeight: 1.2, textAlign: 'left',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      {!capReached && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 0 }}>
          <input
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about your parent's health…"
            disabled={typing}
            aria-label="Ask a health question"
            style={{
              flex: 1, fontFamily: 'inherit', fontSize: 13.5,
              padding: '11px 13px', border: '1px solid #e3ddd1',
              borderRadius: 12, background: '#FAF7F2', color: '#0E2A1F',
              outline: 'none', minHeight: 44,
            }}
          />
          <button
            type="submit"
            disabled={typing || !question.trim()}
            aria-label="Ask"
            style={{
              flex: '0 0 auto', background: '#0E2A1F', color: '#FAF7F2',
              border: 0, borderRadius: 12, padding: '0 15px',
              fontWeight: 700, fontSize: 13.5, cursor: typing || !question.trim() ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, minHeight: 44,
              opacity: typing || !question.trim() ? 0.5 : 1,
            }}
          >
            {typing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      )}

      {/* Typing animation */}
      {typing && (
        <div style={{ margin: '12px 0', display: 'flex', gap: 5, padding: '4px 2px' }}>
          {[0, 150, 300].map(d => (
            <span key={d} style={{
              width: 7, height: 7, borderRadius: '50%', background: '#7FBF94',
              display: 'inline-block',
              animation: 'pub-bounce 1s infinite',
              animationDelay: `${d}ms`,
            }} />
          ))}
        </div>
      )}

      {/* Answer */}
      {answer && (
        <div style={{ marginTop: 13 }}>
          {isEscalate ? (
            <div style={{ background: '#FEF2F2', border: '1px solid #c0734f', borderRadius: 12, padding: '13px 14px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#7a1f1f', marginBottom: 6 }}>
                ⚠ This needs urgent attention
              </p>
              <p style={{ fontSize: 13.5, color: '#3d1010', lineHeight: 1.55, margin: 0 }}
                dangerouslySetInnerHTML={{ __html: answer.message.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
              />
              <a
                href={`tel:${answer.ambulanceNumber ?? '108'}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: '#c0734f', color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 999, textDecoration: 'none', minHeight: 44 }}
              >
                Call {answer.ambulanceNumber ?? '108'} — Ambulance
              </a>
            </div>
          ) : (
            <div style={{ background: '#FAF7F2', border: '1px solid #e3ddd1', borderRadius: 12, padding: '13px 14px' }}>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: '#243831', margin: 0 }}>{answer.message}</p>
              <p style={{ fontSize: 10.5, color: '#7e8b83', fontStyle: 'italic', marginTop: 8, borderTop: '1px solid #e7e2d7', paddingTop: 6 }}>
                {answer.disclaimer ?? DISCLAIMER}
              </p>
            </div>
          )}

          {/* Nudge */}
          {!isEscalate && (
            <div style={{ marginTop: 11, background: 'linear-gradient(100deg,#0E2A1F,#163b2c)', color: '#FAF7F2', borderRadius: 13, padding: '12px 13px' }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>Want answers specific to your parent?</p>
              <Link
                to="/founding-member/checkout"
                style={{ display: 'inline-block', marginTop: 9, background: '#7FBF94', color: '#0E2A1F', textDecoration: 'none', fontWeight: 700, fontSize: 12, padding: '7px 13px', borderRadius: 999 }}
              >
                Register your parent →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Cap reached */}
      {capReached && !answer && (
        <div style={{ marginTop: 8, background: 'linear-gradient(100deg,#0E2A1F,#163b2c)', color: '#FAF7F2', borderRadius: 13, padding: '14px 15px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>You've tried 3 free questions.</p>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.65)', marginBottom: 11, lineHeight: 1.5 }}>
            Register your parent for unlimited personalised answers — specific to their health history.
          </p>
          <Link
            to="/founding-member/checkout"
            style={{ display: 'inline-block', background: '#7FBF94', color: '#0E2A1F', textDecoration: 'none', fontWeight: 700, fontSize: 13, padding: '9px 16px', borderRadius: 999 }}
          >
            Claim founding spot · ₹100 →
          </Link>
        </div>
      )}

      {/* Trust line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 13, fontSize: 11, color: '#5c6b62' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z" stroke="#7FBF94" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke="#7FBF94" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Guided by our medical team · General guidance, not a diagnosis
      </div>

      <style>{`@keyframes pub-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-4px);opacity:1}}`}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

// Render *bold* segments inside a WhatsApp message (newlines via white-space)
function renderWa(text: string) {
  return text.split('*').map((seg, i) =>
    i % 2 === 1 ? <strong key={i}>{seg}</strong> : <span key={i}>{seg}</span>
  )
}

function Ticks() {
  return <span className="ce-ticks">✓✓</span>
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // When launched from the home screen (standalone PWA), send authenticated
  // family users straight to their dashboard — no marketing page flash.
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone && user && profile?.role === 'family') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, profile, navigate])
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const [waReveal, setWaReveal] = useState(false)
  const phoneRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  // Scroll-reveal observer — toggles `animated` on any reveal element once visible
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.animate-on-scroll, .animate-left')
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(el => el.classList.add('animated'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('animated')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  // WhatsApp mockup — staggered reveal when the phone enters the viewport
  useEffect(() => {
    const node = phoneRef.current
    if (!node) return
    if (!('IntersectionObserver' in window)) { setWaReveal(true); return }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) { setWaReveal(true); io.disconnect() }
      },
      { threshold: 0.3 }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  // Mobile menu: focus trap, Escape to close, inert background (SR skips it),
  // body-scroll lock, and focus restored to the toggle on close.
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    const siblings = Array.from(overlay.parentElement?.children || [])
      .filter(el => el !== overlay) as HTMLElement[]

    if (!menuOpen) {
      overlay.setAttribute('inert', '')
      return
    }

    overlay.removeAttribute('inert')
    siblings.forEach(el => el.setAttribute('inert', ''))
    document.body.style.overflow = 'hidden'

    const getFocusable = () =>
      Array.from(overlay.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
    // Defer a frame so the dialog is visible (CSS transition) before we focus it
    const focusTarget = overlay.querySelector<HTMLElement>('.ce-mobile-close') || getFocusable()[0]
    const raf = requestAnimationFrame(() => focusTarget?.focus())

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setMenuOpen(false); return }
      if (e.key !== 'Tab') return
      const f = getFocusable()
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown)
      siblings.forEach(el => el.removeAttribute('inert'))
      document.body.style.overflow = ''
      hamburgerRef.current?.focus()
    }
  }, [menuOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrMsg('')
    // waitlist_emails has no phone column — preserve the optional WhatsApp
    // number in `source` so admins reading the table still get the contact.
    const wa = whatsapp.trim()
    const source = wa ? `homepage_register|wa:${wa}` : 'homepage_register'
    const { error } = await supabase
      .from('waitlist_emails')
      .insert({ email: email.trim().toLowerCase(), source })
    // 23505 = duplicate email → treat as success (already registered)
    if (error && error.code !== '23505') {
      setStatus('error')
      setErrMsg('Something went wrong. Please try again or WhatsApp us.')
      return
    }
    setStatus('success')
  }

  return (
    <div className="ce-home">

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="ce-nav">
        <div className="ce-nav-inner">
          <Link to="/" className="ce-nav-logo">
            <Logo className="w-8 h-8" />
            close eye
          </Link>

          <div className="ce-nav-center">
            {NAV_LINKS.map(l => (
              l.to
                ? <Link key={l.label} to={l.to} className="ce-nav-link">{l.label}</Link>
                : <a key={l.label} href={l.href} className="ce-nav-link">{l.label}</a>
            ))}
          </div>

          <div className="ce-nav-right">
            <Link to="/auth" className="ce-nav-textlink">Sign in</Link>
            <Link to="/auth?mode=signup" className="ce-nav-register">Register Family</Link>
          </div>

          <button
            ref={hamburgerRef}
            className="ce-hamburger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(o => !o)}
          >
            <Menu size={26} />
          </button>
        </div>
      </nav>

      {/* Mobile menu — accessible dialog (focus-trapped; background set inert) */}
      <div
        id="mobile-menu"
        ref={overlayRef}
        className={`ce-mobile-overlay${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        onClick={e => { if (e.target === e.currentTarget) setMenuOpen(false) }}
      >
        <div className="ce-mobile-inner">
          <div className="ce-mobile-top">
            <Link to="/" className="ce-mobile-logo" onClick={() => setMenuOpen(false)}>
              <Logo className="w-7 h-7" /> close eye
            </Link>
            <button className="ce-mobile-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="ce-mobile-body">
            <nav className="ce-mobile-nav" aria-label="Main">
              {NAV_LINKS.map(l => {
                const active = !!l.to && location.pathname === l.to
                return l.to
                  ? (
                    <Link
                      key={l.label}
                      to={l.to}
                      className={`ce-mobile-link${active ? ' is-active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      {l.label}
                    </Link>
                  )
                  : <a key={l.label} href={l.href} className="ce-mobile-link" onClick={() => setMenuOpen(false)}>{l.label}</a>
              })}
            </nav>

            <div className="ce-mobile-ctas">
              <Link to="/auth?mode=signup" className="ce-mobile-btn ce-mobile-btn-primary" onClick={() => setMenuOpen(false)}>
                Register Family
              </Link>
              <Link to="/auth" className="ce-mobile-btn ce-mobile-btn-secondary" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main>

      {/* ── LAUNCH BAND ─────────────────────────────────────────── */}
      <div style={{
        background: 'var(--forest)', color: '#fff',
        padding: '12px 20px', textAlign: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexWrap: 'wrap', gap: '10px 20px',
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
          🌿 Founding Membership open · Launching 15 August
        </span>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <Link to="/founding-member/checkout" style={{
            background: 'var(--sage)', color: 'var(--forest)', fontWeight: 700,
            padding: '6px 16px', borderRadius: 100, fontSize: 13, textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            Become a Founding Member →
          </Link>
          <Link to="/waitlist" style={{
            background: 'transparent', color: 'rgba(255,255,255,0.8)', fontWeight: 500,
            padding: '6px 16px', borderRadius: 100, fontSize: 13, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.25)', whiteSpace: 'nowrap',
          }}>
            Join the waitlist
          </Link>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="ce-hero">
        <div className="ce-hero-left animate-on-scroll">
          <p className="ce-eyebrow">Your trusted presence in India</p>
          <h1 className="ce-h1">
            Care for your parents<br />
            in India,{' '}
            <span className="ce-hero-h1-cont">even from afar.</span>
          </h1>
          <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'rgba(250,247,242,.7)', marginTop: '1.25rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            When you can't be there, Close Eye can.
          </p>
          <div className="ce-hero-body">
            <p>Close Eye visits your parents personally — checking health, medicines, and home — and sends you a WhatsApp report within the hour.</p>
            <p>So you always know they're safe, even from 10,000 miles away.</p>
          </div>
          <div className="ce-hero-buttons">
            <Link to="/founding-member/checkout" className="ce-btn ce-btn-primary">
              Claim your founding spot
              <span style={{ fontSize: 12, fontWeight: 700, background: '#0E2A1F', color: '#7FBF94', padding: '3px 9px', borderRadius: 999, marginLeft: 4 }}>
                Start ₹100
              </span>
            </Link>
            <a href="#ask-free" className="ce-btn ce-btn-secondary">Or ask us anything — free</a>
          </div>
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 500, color: 'rgba(168,213,181,.9)', background: 'rgba(127,191,148,0.12)', border: '1px solid rgba(127,191,148,0.35)', borderRadius: '100px', padding: '5px 13px', marginTop: '10px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7FBF94', flexShrink: 0 }} />
            Now serving founding families · Public launch 15 August
          </p>
          <div className="ce-trust-row">
            {TRUST_SIGNALS.map(t => (
              <span key={t} className="ce-trust-item"><Check size={15} /> {t}</span>
            ))}
          </div>
        </div>

        <div className="ce-hero-right">
          <div className="ce-phone-wrap" ref={phoneRef}>
            <div className="ce-phone">
              <div className="ce-wa-header">
                <span className="ce-wa-back" aria-hidden>‹</span>
                <span className="ce-wa-avatar"><Logo className="w-6 h-6" /></span>
                <div>
                  <div className="ce-wa-name">Close Eye 🌿</div>
                  <div className="ce-wa-sub">Usually replies instantly</div>
                </div>
              </div>
              <div className="ce-wa-chat">
                {WA_MESSAGES.map((m, i) => (
                  <div
                    key={i}
                    className={`ce-wa-msg${waReveal ? ' ce-wa-in' : ''}`}
                    style={{ transitionDelay: `${i * 600}ms` }}
                  >
                    {renderWa(m.text)}
                    <div className="ce-wa-time">{m.time} <Ticks /></div>
                  </div>
                ))}
              </div>
            </div>
            <p className="ce-phone-caption">What your family receives after every Close Eye visit</p>
          </div>
        </div>
      </section>

      {/* ── ASK CLOSE EYE — Tier 0 public hook ──────────────────── */}
      {/* Negative margin-top overlaps the hero bottom to create a card-float effect */}
      <div className="ce-hero-ask-overlap">
        <div>
          <HomeAskWidget />
        </div>
      </div>

      {/* ── PROBLEM ──────────────────────────────────────────────── */}
      <section className="ce-section ce-bg-forest">
        <div className="ce-container">
          <p className="ce-eyebrow ce-eyebrow-sage animate-on-scroll">Why families choose Close Eye</p>
          <h2 className="ce-h2 animate-on-scroll" style={{ color: 'var(--white)' }}>Every NRI knows this feeling.</h2>
          <div className="ce-quote-grid">
            {PROBLEM_QUOTES.map((q, i) => (
              <div key={i} className="ce-quote-card animate-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
                <span className="ce-quote-mark" aria-hidden>&ldquo;</span>
                <p className="ce-quote-text">{q.text}</p>
                <p className="ce-quote-attr">{q.attr}</p>
              </div>
            ))}
          </div>
          <p className="ce-problem-close animate-on-scroll">Close Eye exists for exactly this.</p>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section id="how-it-works" className="ce-section ce-bg-white" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">The Process</p>
          <h2 className="ce-h2 animate-on-scroll">Simple for you.<br />Meaningful for them.</h2>
          <p className="ce-subtitle animate-on-scroll">Two experiences. One service.</p>

          <div className="ce-how-cols">
            <div className="ce-how-col animate-on-scroll">
              <span className="ce-pill ce-pill-forest">For You — Abroad</span>
              <div className="ce-steps">
                {STEPS_ABROAD.map((s, i) => (
                  <div key={i} className="ce-step">
                    <span className="ce-step-num ce-step-num-forest">{i + 1}</span>
                    <div>
                      <p className="ce-step-title">{s.title}</p>
                      <p className="ce-step-body">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ce-how-connector">
              <div className="ce-how-connector-line" />
              <Logo className="w-9 h-9" />
              <div className="ce-how-connector-text">Close Eye bridges the distance</div>
              <div className="ce-how-connector-line" />
            </div>

            <div className="ce-how-col animate-on-scroll">
              <span className="ce-pill ce-pill-sage">For Them — In Hyderabad</span>
              <div className="ce-steps">
                {STEPS_HOME.map((s, i) => (
                  <div key={i} className="ce-step">
                    <span className="ce-step-num ce-step-num-sage">{i + 1}</span>
                    <div>
                      <p className="ce-step-title">{s.title}</p>
                      <p className="ce-step-body">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES (teaser → full pricing page) ─────────────────── */}
      <section id="services" className="ce-section ce-bg-cream" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">What we offer</p>
          <h2 className="ce-h2 animate-on-scroll">For every family.<br />Whatever the distance.</h2>
          <p className="ce-subtitle animate-on-scroll" style={{ maxWidth: '560px' }}>
            Start with a ₹100 founding membership, move to the ₹1,500/month companion plan,
            or book any one-off visit — home visits, doctor and hospital support, emergencies,
            grocery &amp; medicine. One simple page, prices the same for everyone.
          </p>
          <div className="animate-on-scroll" style={{ marginTop: '28px' }}>
            <Link to="/services" className="ce-btn ce-btn-primary">See all services &amp; pricing <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      {/* ── TRUST & TEAM ─────────────────────────────────────────── */}
      <section className="ce-section ce-bg-white">
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">Why trust us</p>
          <h2 className="ce-h2 animate-on-scroll" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Built on presence.<br />Not promises.</h2>

          <div className="ce-pillars">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="animate-left ce-pillar" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="ce-pillar-icon"><p.icon size={22} /></div>
                <h3 className="ce-pillar-title">{p.title}</h3>
                <p className="ce-pillar-body">{p.body}</p>
              </div>
            ))}
          </div>

          {/* Founders */}
          <div className="ce-founders-wrap">
            <p className="ce-founder-label">A note from the founders</p>
            <div className="ce-founders">
              <div className="ce-founder-card animate-on-scroll">
                <img
                  src="/krishna.jpg"
                  alt="Krishna — Founder & MD, Close Eye"
                  className="ce-founder-photo"
                  width={280}
                  height={280}
                  loading="lazy"
                />
                <p className="ce-founder-name">Krishna</p>
                <p className="ce-founder-role">Founder &amp; MD, Close Eye Companion</p>
                <p className="ce-founder-role">Stexa Products &amp; Services Pvt. Ltd.</p>
                <div className="ce-founder-quote">
                  <p>&ldquo;I do every visit myself.</p>
                  <p>Not because we don&rsquo;t have a team — but because before I ask any family to trust us with their parents, I need to earn that trust personally.</p>
                  <p>One visit. One family. One report. That is how Close Eye was built.&rdquo;</p>
                </div>
              </div>

              <div className="ce-founder-card animate-on-scroll" style={{ transitionDelay: '100ms' }}>
                <img
                  src="/aishwarya.jpg"
                  alt="Aishwarya — Co-Founder & Chief of Care, Close Eye"
                  className="ce-founder-photo"
                  style={{ objectPosition: 'center top' }}
                  width={280}
                  height={280}
                  loading="lazy"
                />
                <p className="ce-founder-name">Aishwarya</p>
                <p className="ce-founder-role">Co-Founder &amp; Chief of Care</p>
                <div className="ce-founder-quote">
                  <p>&ldquo;I care for my parents as a daughter. I became a mother this year. I built Close Eye so every elder feels that same love — even when family cannot be there.&rdquo;</p>
                </div>
              </div>
            </div>
          </div>

          {/* Advisory board */}
          <div className="ce-advisory animate-on-scroll">
            <p className="ce-advisory-label">Advisory Board</p>
            <div className="ce-advisor-row">
              {ADVISORS.filter(a => a.enabled).map(a => (
                <div key={a.name} className="ce-advisor-pill">
                  <span className="ce-advisor-avatar">{a.initials}</span>
                  <div>
                    <div className="ce-advisor-name">{a.name}</div>
                    <div className="ce-advisor-role">{a.role} · {a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" className="ce-section ce-bg-cream" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">Pricing</p>
          <h2 className="ce-h2 animate-on-scroll" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Honest pricing.<br />No surprises.</h2>

          <div className="ce-price-cards">
            {/* Founding member */}
            <div className="ce-price-card animate-on-scroll">
              <span className="ce-tag ce-tag-sage">Most Popular</span>
              <p className="ce-price-big">₹100</p>
              <p className="ce-price-period">One-time registration</p>
              <hr className="ce-divider" />
              <ul className="ce-benefits">
                {FOUNDING_BENEFITS.map(b => <li key={b}><Check size={18} /> {b}</li>)}
              </ul>
              <Link to="/founding-member/checkout" className="ce-btn ce-btn-primary ce-btn-full">Register for ₹100 <ArrowRight size={18} /></Link>
            </div>

            {/* Monthly (featured) */}
            <div className="ce-price-card ce-price-card-featured animate-on-scroll" style={{ transitionDelay: '100ms' }}>
              <span className="ce-tag ce-tag-sage">NRI Families</span>
              <p className="ce-price-big">₹1,500</p>
              <p className="ce-price-period">Per month</p>
              <hr className="ce-divider" />
              <ul className="ce-benefits">
                {MONTHLY_BENEFITS.map(b => <li key={b}><Check size={18} /> {b}</li>)}
              </ul>
              <Link to="/auth?mode=signup" className="ce-btn ce-btn-white ce-btn-full">Start Monthly Plan <ArrowRight size={18} /></Link>
            </div>

            {/* On-demand */}
            <div className="ce-price-card animate-on-scroll" style={{ transitionDelay: '200ms' }}>
              <p className="ce-price-range">₹500 – ₹4,000</p>
              <p className="ce-price-period">Pay per service</p>
              <hr className="ce-divider" />
              <p className="ce-price-body" style={{ marginBottom: '16px' }}>
                No subscription needed. Book any service when you need it. Cancel or change anytime.
              </p>
              <ul className="ce-benefits">
                {ONDEMAND_EXAMPLES.map(s => (
                  <li key={s.name}><Check size={18} /> {s.name} — {s.price}</li>
                ))}
              </ul>
              <Link to="/services" className="ce-btn ce-btn-outline ce-btn-full">View All Services <ArrowRight size={18} /></Link>
            </div>
          </div>

          <p className="ce-pricing-note">
            All prices in INR. NRI families can pay via international cards and UPI. Invoice provided for every transaction.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="ce-section ce-bg-forest">
        <div className="ce-container ce-cta">
          <h2 className="ce-h2 animate-on-scroll" style={{ color: 'var(--white)', fontSize: 'clamp(28px, 5vw, 52px)' }}>
            Your parent deserves someone<br />who genuinely cares.
          </h2>
          <p className="ce-cta-sub animate-on-scroll">Let someone be there when you can&rsquo;t.</p>

          {status === 'success' ? (
            <div className="ce-cta-form">
              <p className="ce-cta-success">
                You&rsquo;re registered. We&rsquo;ll reach out on WhatsApp within 2 hours to set up your first visit. 🌿
              </p>
            </div>
          ) : (
            <form className="ce-cta-form animate-on-scroll" onSubmit={handleSubmit}>
              <input
                className="ce-input"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
              />
              <input
                className="ce-input"
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="WhatsApp number (optional)"
                aria-label="WhatsApp number (optional)"
              />
              <button type="submit" disabled={status === 'submitting'} className="ce-btn ce-btn-white ce-btn-full" style={{ padding: '18px' }}>
                {status === 'submitting' ? 'Registering…' : <>Register Your Family <ArrowRight size={18} /></>}
              </button>
              {status === 'error' && <p style={{ color: '#ffb4b4', fontSize: '13px', marginTop: '10px' }}>{errMsg}</p>}
            </form>
          )}

          <p className="ce-cta-or">or</p>
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="ce-cta-wa">
            <FaWhatsapp size={20} /> WhatsApp us: +91 9000221261
          </a>
          <p className="ce-cta-reassure">No spam. No commitment. We respond within 2 hours.</p>
        </div>
      </section>

      </main>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="ce-footer">
        <div className="ce-footer-grid">
          <div>
            <Link to="/" className="ce-footer-logo"><Logo className="w-8 h-8" /> close eye</Link>
            <p className="ce-footer-tagline">Your trusted presence in India.</p>
            <p className="ce-footer-company">Operated by Stexa Products &amp; Services Pvt. Ltd., Hyderabad</p>
          </div>

          <div>
            <p className="ce-footer-label">Quick Links</p>
            <div className="ce-footer-links">
              <a href="#how-it-works">How It Works</a>
              <a href="#services">Services</a>
              <a href="#pricing">Pricing</a>
              {/* <Link to="/for-societies">For Societies</Link> */}
              <Link to="/companions">Companions</Link>
              <Link to="/join-as-companion">Become a Companion</Link>
              <Link to="/about">About Us</Link>
            </div>
          </div>

          <div>
            <p className="ce-footer-label">Contact</p>
            <div className="ce-footer-contact">
              <a href="mailto:hello@closeeye.in">📧 hello@closeeye.in</a>
              <a href={`tel:+${WA_NUMBER}`}>📱 +91 9000221261</a>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
              <a href="https://www.instagram.com/closeeyeglobal/" target="_blank" rel="noopener noreferrer">📸 @closeeyeglobal</a>
              <a href="https://www.linkedin.com/company/closeeye/" target="_blank" rel="noopener noreferrer">💼 LinkedIn</a>
            </div>
          </div>
        </div>

        <div className="ce-footer-bottom">
          <span>© 2025 Close Eye Companion. All rights reserved.</span>
          <span>
            <Link to="/privacy-policy">Privacy Policy</Link>
            {'  ·  '}
            <Link to="/terms">Terms of Service</Link>
          </span>
        </div>
      </footer>

      {/* ── FLOATING WHATSAPP ────────────────────────────────────── */}
      {/* Hidden while the mobile menu is open so it doesn't overlap the overlay */}
      {!menuOpen && (
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="ce-wa-float"
          aria-label="Chat with Close Eye on WhatsApp"
          title="Chat on WhatsApp"
        >
          <FaWhatsapp size={28} />
        </a>
      )}
    </div>
  )
}
