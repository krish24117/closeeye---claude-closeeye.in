import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, Menu, X, ArrowRight, Stethoscope, User, Send, Loader2, MessageCircle, ShieldCheck, PhoneCall, Lock, UserCheck, House, Home, Building2, Globe, HeartHandshake, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/lib/auth-context'
import { DiscoveryCallModal } from '@/components/DiscoveryCallModal'

/* ------------------------------------------------------------------ */
/*  Constants + data                                                    */
/* ------------------------------------------------------------------ */

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919000221261'
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Hi%2C%20I%27m%20interested%20in%20Close%20Eye%20for%20my%20family`

const NAV_LINKS: { label: string; href?: string; to?: string }[] = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#services', label: 'Services' },
  { href: '#pricing', label: 'Pricing' },
  { to: '/companions', label: 'Companions' },
]

const TRUST_SIGNALS = [
  'GPS-verified visits',
  'Doctor-reviewed reports',
  'WhatsApp delivered',
  'Emergency-ready companions',
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

const TRUST_PILLARS = [
  { icon: ShieldCheck, title: 'Verified Companions',    body: 'Every companion is background-checked, Aadhaar-verified, trained, and supervised on their first visits before meeting your family alone.' },
  { icon: Stethoscope, title: 'Doctor Reviewed',        body: 'Our companion notes are reviewed by a qualified physician. Abnormal readings are flagged — not buried in a chat.' },
  { icon: PhoneCall,   title: 'Emergency Coordination', body: "If something goes wrong, we don't just inform you. We coordinate with your family's local emergency contact and the nearest hospital." },
  { icon: Lock,        title: 'Privacy First',          body: "Your family's health details never leave our systems. No third-party data sharing, ever." },
]

const HOW_STEPS = [
  { num: '01', icon: UserCheck,     title: 'Register Your Family', body: 'Tell us about your loved one — who they are, their routines, their health. Takes 10 minutes.' },
  { num: '02', icon: House,         title: 'We Visit In Person',   body: 'A trained, verified companion visits at the scheduled time. They spend 45–60 minutes — not a quick check-in.' },
  { num: '03', icon: MessageCircle, title: 'You Receive a Report', body: 'Within the hour, you get a detailed WhatsApp report — what they ate, their mood, medications, any concerns.' },
]

const COMPARISON_ROWS: [string, string][] = [
  ["Sporadic phone calls — they say \"I'm fine\"",   'In-person visit with eyes on their actual home'],
  ['No proof anything happened',                       'GPS-stamped visit with timestamped photo report'],
  ['Emergency happens — you hear hours later',         'Companion escalates within minutes'],
  ["Depends on neighbors' goodwill",                   'Professional, trained, accountable companion'],
  ['You worry anyway',                                 'You see exactly what happened, in writing'],
  ['One-size care agencies',                           "Personalised to your parent's specific routines"],
]

const SERVICE_GROUPS = [
  { category: 'Health',  icon: Stethoscope,    services: ['Wellness check-in', 'Medication reminder & log', 'Doctor appointment escort', 'Vitals recording'],          available: true  },
  { category: 'Care',    icon: HeartHandshake, services: ['Daily companion visit', 'Grocery & errand run', 'Home safety inspection', 'Emergency visit'],                available: true  },
  { category: 'Life',    icon: Building2,      services: ['Government document help', 'Bank & financial escort', 'Telecom & utility support'],                          available: false },
  { category: 'Future',  icon: Globe,          services: ['Society partnership visits', 'Preventive health screening', 'Palliative care coordination'],                  available: false },
]

const ROADMAP_MILESTONES = [
  { period: 'Today',    title: 'Health Companion',        desc: 'In-person wellness visits, WhatsApp reports, medication reminders, emergency coordination — live in Hyderabad.', active: true  },
  { period: 'Tomorrow', title: 'Trusted Presence',        desc: 'Life admin support, society partnerships, multi-city expansion across India.',                                      active: false },
  { period: 'Future',   title: 'Family Operating System', desc: 'Preventive care programs, AI-assisted health trend analysis, specialist access.',                                   active: false },
]

const TESTIMONIALS = [
  { text: "\"I call every day. But I still don't know if she actually ate, or if she's just saying that.\"", attr: 'NRI Family — Houston, TX' },
  { text: '"The worst part is not the distance. It\'s the not knowing. The silence between calls."',          attr: 'NRI Family — London'     },
  { text: '"Mom will always tell me she\'s fine. I need someone who can actually tell me if she is."',        attr: 'NRI Family — Dubai'      },
]

const ADVISORS = [
  { initials: 'SA', name: 'Sanjay Arora',   role: 'Brand Strategist',     detail: 'TEDx Speaker · CNN-NEWS18 · 738K followers', enabled: false },
  { initials: 'DR', name: 'Dr. [Name]',     role: 'Orthopaedic Surgeon',  detail: 'Apollo Hospital, Hyderabad',                  enabled: true  },
  { initials: 'SS', name: 'Dr. Sidharth',   role: 'Medical Co-Founder',   detail: 'MBBS · Hyderabad Hospital Network',           enabled: true  },
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
  { name: 'Home Visit',           price: '₹1,000' },
  { name: 'Doctor Visit Support', price: '₹1,500' },
  { name: 'Emergency Response',   price: '₹3,000' },
  { name: 'Grocery & Medicine',   price: '₹500'   },
]

const FAQ_ITEMS = [
  {
    q: 'Which cities do you currently serve?',
    a: "We currently serve Hyderabad. Expansion to Bangalore, Chennai, and Mumbai is planned — join the waitlist and we'll notify you when we launch in your city.",
  },
  {
    q: 'How are your companions vetted?',
    a: 'Every companion is background-verified, personally interviewed by our founder, and trained before their first visit. GPS check-in is mandatory on every visit — no exceptions.',
  },
  {
    q: 'How quickly do I receive the WhatsApp report after a visit?',
    a: 'Within 1 hour of every visit — a warm, detailed message with a health snapshot, medicine check, meals, and one personal moment we always capture.',
  },
  {
    q: 'Do I need a subscription, or can I pay per visit?',
    a: 'Both options are available. The ₹1,500/month plan is best for regular care, but you can also book one-off visits — from ₹1,000 for a home visit to ₹3,000 for emergency response.',
  },
  {
    q: 'Can I pay from abroad using an international card?',
    a: 'Yes. We accept international credit/debit cards and UPI. An invoice is provided for every transaction. No hidden fees.',
  },
  {
    q: 'What if my parent has a medical emergency during a visit?',
    a: 'Your companion is trained to act immediately — they call emergency services, coordinate with the nearest hospital, and keep you updated in real time via WhatsApp.',
  },
  {
    q: "Is my parent's health information private?",
    a: 'Absolutely. All health information is stored securely and shared only with you and your family — never with third parties.',
  },
]

function greetingFor(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

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
  lane: 'escalate' | 'inform' | 'service'
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
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
      setAnswer({ lane: 'inform', message: "Something went wrong — please try again, or message us on WhatsApp at +91 90002 21261.", disclaimer: DISCLAIMER, requiresHuman: false })
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
          Ask about your parent's health — free
        </div>
        <button
          type="button"
          onClick={() => {
            inputRef.current?.focus()
            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }}
          style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: '#2c6b43', background: '#eaf5ee', border: '1px solid #cfe6d7', padding: '10px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center' }}
        >
          Try now
        </button>
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 0 }}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={e => {
              setQuestion(e.target.value)
              e.currentTarget.style.height = 'auto'
              e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(question) }
            }}
            placeholder="Ask about your parent's health…"
            disabled={typing}
            rows={1}
            aria-label="Ask a health question"
            style={{
              flex: 1, fontFamily: 'inherit', fontSize: 13.5,
              padding: '11px 13px', border: '1px solid #e3ddd1',
              borderRadius: 12, background: '#FAF7F2', color: '#0E2A1F',
              outline: 'none', minHeight: 44, maxHeight: 120,
              resize: 'none', overflowY: 'hidden', lineHeight: '1.4',
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
              {answer.lane !== 'service' && (
                <p style={{ fontSize: 10.5, color: '#7e8b83', fontStyle: 'italic', marginTop: 8, borderTop: '1px solid #e7e2d7', paddingTop: 6 }}>
                  {answer.disclaimer ?? DISCLAIMER}
                </p>
              )}
            </div>
          )}

          {/* Nudge */}
          {!isEscalate && (
            answer.lane === 'service' ? (
              <div style={{ marginTop: 11, background: 'linear-gradient(100deg,#0E2A1F,#163b2c)', color: '#FAF7F2', borderRadius: 13, padding: '12px 13px' }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>Have more questions? We're on WhatsApp.</p>
                <a
                  href="https://wa.me/919000221261"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 9, background: '#7FBF94', color: '#0E2A1F', textDecoration: 'none', fontWeight: 700, fontSize: 12, padding: '7px 13px', borderRadius: 999 }}
                >
                  Message us on WhatsApp →
                </a>
              </div>
            ) : (
              <div style={{ marginTop: 11, background: 'linear-gradient(100deg,#0E2A1F,#163b2c)', color: '#FAF7F2', borderRadius: 13, padding: '12px 13px' }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>Want answers specific to your parent?</p>
                <Link
                  to="/founding-member/checkout"
                  style={{ display: 'inline-block', marginTop: 9, background: '#7FBF94', color: '#0E2A1F', textDecoration: 'none', fontWeight: 700, fontSize: 12, padding: '7px 13px', borderRadius: 999 }}
                >
                  Register your parent →
                </Link>
              </div>
            )
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
  const [menuOpen, setMenuOpen]         = useState(false)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)
  const [openFaq, setOpenFaq]           = useState<number | null>(null)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone && user && profile?.role === 'family') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, profile, navigate])

  useEffect(() => {
    const threshold = window.innerHeight * 0.8
    const onScroll = () => setShowStickyCTA(window.scrollY > threshold)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const overlayRef   = useRef<HTMLDivElement>(null)
  const phoneRef     = useRef<HTMLDivElement>(null)
  const [waReveal, setWaReveal] = useState(false)

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.animate-on-scroll, .animate-left')
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(el => el.classList.add('animated'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('animated'); io.unobserve(e.target) }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const node = phoneRef.current
    if (!node) return
    if (!('IntersectionObserver' in window)) { setWaReveal(true); return }
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { setWaReveal(true); io.disconnect() } },
      { threshold: 0.3 }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

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

      {/* Mobile menu */}
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
        padding: 'max(12px, env(safe-area-inset-top, 0px)) 20px 12px',
        textAlign: 'center',
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

      {/* ── HERO — centered, dark, no phone mockup ───────────────── */}
      <section className="ce-hero">
        <div className="ce-hero-left animate-on-scroll">
          <p className="ce-eyebrow">Your trusted presence in India</p>
          <h1 className="ce-h1">
            Know they&rsquo;re okay.<br />
            <span className="ce-hero-h1-cont">Every single day.</span>
          </h1>
          <p className="ce-hero-sub">
            When you can&rsquo;t be there, Close Eye becomes your trusted presence in India.
          </p>
          <div className="ce-hero-buttons">
            <a href="#ask" className="ce-btn ce-btn-hero-primary">
              Ask CloseEye <ArrowRight size={17} />
            </a>
            <a href="#wa-report" className="ce-btn ce-btn-hero-secondary">
              See a sample report
            </a>
          </div>
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 500, color: 'rgba(168,213,181,.9)', background: 'rgba(127,191,148,0.12)', border: '1px solid rgba(127,191,148,0.35)', borderRadius: '100px', padding: '5px 13px', marginTop: '10px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7FBF94', flexShrink: 0 }} />
            Now serving founding families · Public launch 15 August
          </p>
        </div>
      </section>

      {/* ── TRUST BAR ────────────────────────────────────────────── */}
      <div className="ce-trust-bar">
        <div className="ce-trust-bar-inner">
          {TRUST_SIGNALS.map((t, i) => (
            <span key={i} className="ce-trust-bar-item">
              <Check size={13} style={{ color: '#7FBF94', flexShrink: 0 }} /> {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── ASK CLOSEEYE — primary product section ───────────────── */}
      <section id="ask" className="ce-section ce-bg-cream" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container ce-ask-inner">
          <div className="ce-ask-greeting">
            <p>{greetingFor()}</p>
            <h2 className="ce-h2">How can CloseEye help your family today?</h2>
            <p className="ce-subtitle" style={{ marginBottom: 0 }}>Ask about medication schedules, what a visit includes, costs, coverage — anything.</p>
          </div>
          <HomeAskWidget />
        </div>
      </section>

      {/* ── VISIT REPORT — phone mockup + feature list ───────────── */}
      <section id="wa-report" className="ce-section ce-bg-white" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">What you get</p>
          <h2 className="ce-h2 animate-on-scroll">Every visit. Delivered to WhatsApp.</h2>
          <p className="ce-subtitle animate-on-scroll" style={{ maxWidth: 540 }}>
            Not a generic update — a real account of your parent's day, written by someone who was there.
          </p>

          <div className="ce-wa-showcase">
            <div className="ce-wa-phone-col">
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

            <ul className="ce-wa-features-list animate-on-scroll">
              {[
                'Mood & emotional state',
                'Medicines taken on schedule',
                'Meals & nutrition observed',
                'Home safety check',
                'One personal moment',
                'GPS-verified visit time',
                'Emergency alert if needed',
              ].map(f => (
                <li key={f}>
                  <Check size={16} strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — 3 premium cards ──────────────────────── */}
      <section id="how-it-works" className="ce-section ce-bg-cream" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">How it works</p>
          <h2 className="ce-h2 animate-on-scroll">Simple. Reliable. Human.</h2>
          <div className="ce-hiw-grid">
            {HOW_STEPS.map((step, i) => (
              <div key={step.num} className="ce-hiw-card animate-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
                {i < HOW_STEPS.length - 1 && (
                  <span className="ce-hiw-connector" aria-hidden><ArrowRight size={18} /></span>
                )}
                <span className="ce-hiw-num">{step.num}</span>
                <div className="ce-hiw-icon"><step.icon size={26} strokeWidth={1.8} /></div>
                <h3 className="ce-hiw-title">{step.title}</h3>
                <p className="ce-hiw-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST PILLARS — 4 equal cards ───────────────────────── */}
      <section className="ce-section ce-bg-white">
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">Why trust us</p>
          <h2 className="ce-h2 animate-on-scroll">Built on presence.<br />Not promises.</h2>
          <div className="ce-trust4-grid">
            {TRUST_PILLARS.map((p, i) => (
              <div key={p.title} className="ce-trust4-card animate-on-scroll" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="ce-trust4-icon"><p.icon size={22} strokeWidth={1.8} /></div>
                <h3 className="ce-trust4-title">{p.title}</h3>
                <p className="ce-trust4-body">{p.body}</p>
              </div>
            ))}
          </div>

          {/* Advisory board */}
          <div className="ce-advisory animate-on-scroll" style={{ marginTop: 56 }}>
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

      {/* ── CLOSEEYE DIFFERENCE — split comparison ───────────────── */}
      <section className="ce-section ce-bg-cream">
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">The difference</p>
          <h2 className="ce-h2 animate-on-scroll">Why CloseEye, not just a phone call.</h2>
          <div className="ce-diff-wrap animate-on-scroll">
            <div className="ce-diff-col ce-diff-old">
              <h3 className="ce-diff-header">Without CloseEye</h3>
              {COMPARISON_ROWS.map(([old], i) => (
                <div key={i} className="ce-diff-row">
                  <X size={14} />
                  {old}
                </div>
              ))}
            </div>
            <div className="ce-diff-col ce-diff-new">
              <h3 className="ce-diff-header">With CloseEye</h3>
              {COMPARISON_ROWS.map(([, ce], i) => (
                <div key={i} className="ce-diff-row">
                  <Check size={14} />
                  {ce}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES GROUPED — 4 category cards ─────────────────── */}
      <section id="services" className="ce-section ce-bg-white" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">Services</p>
          <h2 className="ce-h2 animate-on-scroll">Everything your family needs.<br />In one place.</h2>
          <div className="ce-svc-groups">
            {SERVICE_GROUPS.map((g, i) => (
              <div
                key={g.category}
                className={`ce-svc-group-card animate-on-scroll${g.available ? '' : ' ce-svc-soon'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="ce-svc-group-icon"><g.icon size={20} strokeWidth={1.8} /></div>
                <h3 className="ce-svc-group-title">{g.category}</h3>
                {!g.available && <span className="ce-soon-badge">Coming soon</span>}
                <ul className="ce-svc-group-list">
                  {g.services.map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="ce-pricing-note animate-on-scroll" style={{ marginTop: 32 }}>
            <Link to="/services" style={{ color: 'var(--forest)', fontWeight: 600 }}>View all services and pricing →</Link>
          </p>
        </div>
      </section>

      {/* ── REAL FAMILIES — testimonials ─────────────────────────── */}
      <section className="ce-section ce-bg-cream">
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">Real families</p>
          <h2 className="ce-h2 animate-on-scroll">What keeps NRI families up at night.</h2>
          <div className="ce-testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="ce-testimonial-card animate-on-scroll" style={{ transitionDelay: `${i * 100}ms` }}>
                <p className="ce-testimonial-text">{t.text}</p>
                <p className="ce-testimonial-attr">{t.attr}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDERS — compact horizontal ────────────────────────── */}
      <section className="ce-section ce-bg-white">
        <div className="ce-container" style={{ textAlign: 'center' }}>
          <p className="ce-eyebrow animate-on-scroll">The people behind CloseEye</p>
          <h2 className="ce-h2 animate-on-scroll">Built from love,<br />not a business plan.</h2>
          <div className="ce-founders-compact animate-on-scroll">
            <div className="ce-founder-compact-card">
              <img src="/krishna.jpg" alt="Krishna, Founder, Close Eye" className="ce-founder-compact-photo" loading="lazy" />
              <div>
                <p className="ce-founder-compact-name">Krishna</p>
                <p className="ce-founder-compact-role">Founder</p>
                <p className="ce-founder-compact-quote">&ldquo;Before asking families to trust Close Eye, I wanted to earn that trust personally. Every early visit taught me something no spreadsheet ever could.&rdquo;</p>
              </div>
            </div>
            <div className="ce-founder-compact-card">
              <img src="/aishwarya.jpg" alt="Aishwarya, Co-Founder, Close Eye" className="ce-founder-compact-photo" style={{ objectPosition: 'center top' }} loading="lazy" />
              <div>
                <p className="ce-founder-compact-name">Aishwarya</p>
                <p className="ce-founder-compact-role">Co-Founder &amp; Chief of Care</p>
                <p className="ce-founder-compact-quote">&ldquo;I care for my parents as a daughter. I became a mother this year. I built Close Eye so every elder feels that same love — even when family cannot be there.&rdquo;</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROADMAP — vertical timeline, dark bg ─────────────────── */}
      <section className="ce-section" style={{ background: 'var(--forest)' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll" style={{ color: 'var(--sage)' }}>Where we&rsquo;re going</p>
          <h2 className="ce-h2 animate-on-scroll" style={{ color: '#FAF7F2' }}>Built for the long run.</h2>
          <div className="ce-roadmap-track animate-on-scroll">
            {ROADMAP_MILESTONES.map((m, i) => (
              <div key={m.period} className={`ce-roadmap-item${m.active ? ' is-active' : ''}`}>
                <div className="ce-roadmap-node">
                  <div className="ce-roadmap-dot" />
                  {i < ROADMAP_MILESTONES.length - 1 && <div className="ce-roadmap-line" />}
                </div>
                <div className="ce-roadmap-content">
                  <span className="ce-roadmap-period">{m.period}</span>
                  <h3 className="ce-roadmap-title">{m.title}</h3>
                  <p className="ce-roadmap-desc">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" className="ce-section ce-bg-white" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">Pricing</p>
          <h2 className="ce-h2 animate-on-scroll" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Honest pricing.<br />No surprises.</h2>

          <div className="ce-price-cards">
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

      {/* ── BOTTOM CTA — final conversion section ────────────────── */}
      <section className="ce-final-cta-section">
        <div className="ce-container" style={{ textAlign: 'center' }}>
          <h2 className="ce-h2" style={{ color: '#FAF7F2' }}>Ready to care from anywhere?</h2>
          <p className="ce-final-cta-sub">Start with a question. Or register your family today.</p>
          <div className="ce-final-cta-btns">
            <Link to="/auth?mode=signup" className="ce-btn ce-btn-sage">
              Register Your Family <ArrowRight size={16} />
            </Link>
            <a href="#ask" className="ce-btn ce-btn-forest-ghost">
              Chat with CloseEye
            </a>
          </div>
          <button type="button" onClick={() => setShowDiscovery(true)} className="ce-final-cta-link">
            Prefer to talk? Book a free call →
          </button>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────── */}
      <section id="faqs" className="ce-section ce-bg-cream" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container" style={{ maxWidth: '720px' }}>
          <p className="ce-eyebrow animate-on-scroll">FAQs</p>
          <h2 className="ce-h2 animate-on-scroll" style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginBottom: 48 }}>
            Common questions,<br />honest answers.
          </h2>
          <div className="ce-faq-list" role="list">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`ce-faq-item animate-on-scroll${openFaq === i ? ' is-open' : ''}`}
                style={{ transitionDelay: `${i * 50}ms` }}
                role="listitem"
              >
                <button
                  type="button"
                  className="ce-faq-q"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{item.q}</span>
                  <span className="ce-faq-icon" aria-hidden>+</span>
                </button>
                <div className="ce-faq-a-wrap" id={`faq-a-${i}`} role="region">
                  <p className="ce-faq-a">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
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
      {!menuOpen && (
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="ce-wa-float"
          aria-label="Chat with Close Eye on WhatsApp"
          title="Chat on WhatsApp"
        >
          <MessageCircle size={22} strokeWidth={2} />
        </a>
      )}

      {/* ── STICKY MOBILE CTA ────────────────────────────────────── */}
      {!menuOpen && (
        <div className={`ce-sticky-cta${showStickyCTA ? '' : ' is-hidden'}`}>
          <a href="#ask" className="ce-sticky-cta-btn">
            Ask CloseEye
          </a>
        </div>
      )}

      {/* ── BOTTOM MOBILE NAV ────────────────────────────────────── */}
      {!menuOpen && (
        <nav className="ce-bottom-nav" aria-label="Quick navigation">
          <div className="ce-bottom-nav-inner">
            <Link to="/" className={`ce-bottom-nav-item${location.pathname === '/' ? ' is-active' : ''}`}>
              <Home size={24} strokeWidth={1.8} />
              <span className="ce-bottom-nav-label">Home</span>
            </Link>
            <a href="#ask" className="ce-bottom-nav-item">
              <MessageCircle size={24} strokeWidth={1.8} />
              <span className="ce-bottom-nav-label">Ask</span>
            </a>
            <Link to="/services" className={`ce-bottom-nav-item${location.pathname === '/services' ? ' is-active' : ''}`}>
              <HeartHandshake size={24} strokeWidth={1.8} />
              <span className="ce-bottom-nav-label">Services</span>
            </Link>
            <a href="#wa-report" className="ce-bottom-nav-item">
              <ClipboardList size={24} strokeWidth={1.8} />
              <span className="ce-bottom-nav-label">Updates</span>
            </a>
            <Link to="/auth" className={`ce-bottom-nav-item${location.pathname.startsWith('/auth') || location.pathname.startsWith('/dashboard') ? ' is-active' : ''}`}>
              <User size={24} strokeWidth={1.8} />
              <span className="ce-bottom-nav-label">Profile</span>
            </Link>
          </div>
        </nav>
      )}

      <DiscoveryCallModal open={showDiscovery} onClose={() => setShowDiscovery(false)} />
    </div>
  )
}
