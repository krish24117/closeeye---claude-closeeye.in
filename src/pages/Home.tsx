import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Menu, X, ArrowRight, Shield, Stethoscope, User } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { ON_DEMAND_SERVICES } from '@/lib/one-time-services'

/* ------------------------------------------------------------------ */
/*  Constants + data                                                    */
/* ------------------------------------------------------------------ */

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919000221261'
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=Hi%2C%20I%27m%20interested%20in%20Close%20Eye%20for%20my%20family`

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#services', label: 'Services' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#societies', label: 'For Societies' },
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
    text: 'How she is today:\nMrs. Lakshmi was in warm spirits. She spoke about your last video call and said you looked tired. She wants you to eat properly 🙂',
    time: '3:47 PM',
  },
  {
    text: '*Health snapshot:*\n😊 Mood: Good\n✅ Eaten: Breakfast + lunch\n✅ Medicines: All taken on schedule\n🏠 Home: Clean and safe',
    time: '3:48 PM',
  },
  {
    text: "*From today's visit:*\nShe showed me the photo of you from your graduation. It's on her bedside table. Has been there for 11 years 🥹",
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
    text: "She fell in the bathroom last month and didn't tell me for three days because she didn't want to disturb me. Three days.",
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

const NRI_SERVICES = [
  { name: 'Monthly Companion Plan', price: '₹1,500/month', desc: '1 home visit + weekly calls + WhatsApp reports + medicine reminders' },
  { name: 'Home Visit', price: '₹1,000/visit', desc: 'Verified companion visit + health check + WhatsApp report within 1 hour' },
  { name: 'Doctor Visit Support', price: '₹1,500', desc: 'Companion escorts to doctor, takes notes, reports to family' },
  { name: 'Hospital Assistance', price: '₹2,000 – ₹4,000', desc: 'Half day or full day hospital presence. Family updated throughout' },
  { name: 'Emergency Response', price: '₹3,000', desc: '2-hour emergency visit. Falls, sudden illness, or distress.' },
  { name: 'Grocery & Medicine', price: '₹500', desc: 'Collection and delivery with receipt provided' },
]

const SOCIETY_BENEFITS = [
  'Entire family covered',
  '24/7 AI health assistant',
  'Doctor-verified responses',
  'Emergency coordination',
  '10% discount on all services',
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
  'Entire family covered',
  '24/7 AI health assistant',
  'Doctor-verified responses',
  'Emergency coordination',
  '10% discount on all services',
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState<'nri' | 'society' | 'ondemand'>('nri')

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

  // Lock body scroll while the mobile overlay is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
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
              <a key={l.href} href={l.href} className="ce-nav-link">{l.label}</a>
            ))}
          </div>

          <div className="ce-nav-right">
            <Link to="/auth" className="ce-nav-textlink">Sign in</Link>
            <Link to="/auth?mode=signup" className="ce-nav-register">Register Family</Link>
          </div>

          <button
            className="ce-hamburger"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={26} />
          </button>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      {menuOpen && (
        <div className="ce-mobile-overlay">
          <button className="ce-mobile-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <X size={32} />
          </button>
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
          ))}
          <Link to="/auth?mode=signup" onClick={() => setMenuOpen(false)}>Register Family</Link>
          <Link to="/auth" onClick={() => setMenuOpen(false)}>Sign In</Link>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="ce-hero">
        <div className="ce-hero-left animate-on-scroll">
          <p className="ce-eyebrow">Trusted elder care companion — Hyderabad</p>
          <h1 className="ce-h1">
            Your mother made tea<br />
            for two this morning.<br />
            <span className="ce-hero-h1-cont">She forgot you moved abroad.</span>
          </h1>
          <div className="ce-hero-body">
            <p>Close Eye visits your parents personally. We check their health, medicines, and home. We send you a WhatsApp report within the hour.</p>
            <p>Every time. So you always know.</p>
          </div>
          <div className="ce-hero-buttons">
            <Link to="/auth?mode=signup" className="ce-btn ce-btn-primary">Register Your Family <ArrowRight size={18} /></Link>
            <a href="#how-it-works" className="ce-btn ce-btn-secondary">See How It Works</a>
          </div>
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
                <span className="ce-wa-avatar">CE</span>
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

      {/* ── SERVICES ─────────────────────────────────────────────── */}
      <section id="services" className="ce-section ce-bg-cream" style={{ scrollMarginTop: '72px' }}>
        <div className="ce-container">
          <p className="ce-eyebrow animate-on-scroll">What we offer</p>
          <h2 className="ce-h2 animate-on-scroll">For every family.<br />Whatever the distance.</h2>

          <div className="ce-tabs" style={{ marginTop: '32px' }}>
            <button className={`ce-tab${tab === 'nri' ? ' ce-tab-active' : ''}`} onClick={() => setTab('nri')}>NRI Families</button>
            <button className={`ce-tab${tab === 'society' ? ' ce-tab-active' : ''}`} onClick={() => setTab('society')}>Society Members</button>
            <button className={`ce-tab${tab === 'ondemand' ? ' ce-tab-active' : ''}`} onClick={() => setTab('ondemand')}>On-Demand</button>
          </div>

          {tab === 'nri' && (
            <div className="ce-svc-grid">
              {NRI_SERVICES.map((s, i) => (
                <div key={s.name} className="ce-svc-card animate-on-scroll" style={{ transitionDelay: `${(i % 3) * 100}ms` }}>
                  <h3 className="ce-svc-name">{s.name}</h3>
                  <p className="ce-svc-price">{s.price}</p>
                  <p className="ce-svc-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'society' && (
            <div id="societies" style={{ scrollMarginTop: '88px' }}>
              <div className="ce-society-card animate-on-scroll">
                <span className="ce-gold-pill">Founding Member Price</span>
                <p className="ce-society-price">₹100</p>
                <p className="ce-society-period">One-time registration</p>
                <hr className="ce-divider" />
                <ul className="ce-benefits">
                  {SOCIETY_BENEFITS.map(b => (
                    <li key={b}><Check size={18} /> {b}</li>
                  ))}
                </ul>
                <Link to="/auth?mode=signup" className="ce-btn ce-btn-primary ce-btn-full">Register Your Family <ArrowRight size={18} /></Link>
                <p className="ce-society-note">Currently serving Rivera Residences and Lanco Hills, Hyderabad</p>
              </div>
            </div>
          )}

          {tab === 'ondemand' && (
            <div className="animate-on-scroll">
              <table className="ce-price-table">
                <thead>
                  <tr><th>Service</th><th>Price</th></tr>
                </thead>
                <tbody>
                  {ON_DEMAND_SERVICES.map(s => (
                    <tr key={s.type}><td>{s.name}</td><td>{s.price}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              <Link to="/auth?mode=signup" className="ce-btn ce-btn-primary ce-btn-full">Register for ₹100 <ArrowRight size={18} /></Link>
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
              <a href="#services" onClick={() => setTab('ondemand')} className="ce-btn ce-btn-outline ce-btn-full">View All Services <ArrowRight size={18} /></a>
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
              <a href="#societies">For Societies</a>
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
    </div>
  )
}
