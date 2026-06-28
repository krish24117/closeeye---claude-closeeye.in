import { Link } from 'react-router-dom'
import { Check, ArrowRight, Shield, Heart, Clock } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const PROBLEM_QUOTES = [
  { text: "I call every day. But I still don't know if she actually ate. Or if she took her BP medicine.", attr: 'NRI family, Houston TX' },
  { text: "Mom will always say she's fine — she never wants to worry me. I just want someone there who truly knows how she's doing.", attr: 'NRI family, Dubai' },
  { text: "The worst part is not the distance. It's the not knowing.", attr: 'NRI family, London' },
]

const HOW_STEPS = [
  { n: '01', title: 'Join today for ₹100', body: 'One-time. Locks in your founding seat, your member number, and your permanent benefits — before 15 August.' },
  { n: '02', title: 'Tell us about your family', body: "Add your loved one's profile — their health history, medications, what makes them comfortable." },
  { n: '03', title: "We're there on 15 August", body: "Companion visits activate. You'll be first — matched, scheduled, and WhatsApp-ready from day one." },
]

const SERVICES = [
  { icon: '🏠', title: 'Home Visits', body: 'Verified companions visit personally — medicines, meals, home safety, and one personal moment captured for you.' },
  { icon: '💬', title: 'WhatsApp Reports', body: 'A detailed update within one hour of every visit. Health snapshot, personal moments, any concerns.' },
  { icon: '🩺', title: 'Medical Team Guidance', body: 'Ask health questions anytime. Our medical team reviews every response. Available now, before launch.' },
  { icon: '🚨', title: 'Emergency Coordination', body: 'We coordinate with local hospitals, doctors, and family — 24/7 — when it matters most.' },
]

const BENEFITS = [
  'Founding Member badge (#X — your permanent number)',
  '10% off every Close Eye service — for life',
  'Priority companion matching on launch day',
  'Medical team Q&A — 5 free questions/month, starting today',
  'Price locked at ₹1,500/month when visits launch (never raised for founding members)',
]

export function FoundingMemberPage() {
  return (
    <div style={{ fontFamily: 'inherit', background: 'var(--cream)', minHeight: '100vh' }}>

      {/* ── MINIMAL NAV ──────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,247,242,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(14,42,31,0.08)',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--forest)', fontWeight: 700, fontSize: 16 }}>
          <Logo className="w-7 h-7" /> close eye
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/waitlist" style={{ fontSize: 13, color: 'var(--forest)', textDecoration: 'none', fontWeight: 500 }}>
            Join waitlist
          </Link>
          <Link to="/auth?mode=signup" style={{
            background: 'var(--forest)', color: '#fff', fontSize: 13, fontWeight: 600,
            padding: '8px 18px', borderRadius: 100, textDecoration: 'none',
          }}>
            Become a Member →
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--forest)', color: '#fff', padding: 'clamp(60px, 10vw, 100px) 24px clamp(48px, 8vw, 80px)', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', background: 'rgba(168,213,181,0.2)', border: '1px solid rgba(168,213,181,0.4)',
          color: 'var(--sage)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
          padding: '5px 14px', borderRadius: 100, marginBottom: 24, textTransform: 'uppercase',
        }}>
          Founding Membership · Before 15 August
        </span>
        <h1 style={{ fontSize: 'clamp(32px, 7vw, 64px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 24px', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
          Close Eye was built<br />for one reason.
        </h1>
        <p style={{ fontSize: 'clamp(17px, 3vw, 22px)', color: 'rgba(255,255,255,0.72)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Your parents are in India.<br />
          You are not.<br />
          And the not-knowing is the hardest part.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/auth?mode=signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--sage)', color: 'var(--forest)', fontWeight: 700,
            padding: '16px 28px', borderRadius: 14, fontSize: 16, textDecoration: 'none',
          }}>
            Become a Founding Member — ₹100 <ArrowRight size={18} />
          </Link>
          <Link to="/waitlist" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent', color: 'rgba(255,255,255,0.8)', fontWeight: 500,
            padding: '16px 28px', borderRadius: 14, fontSize: 15, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            Join the waitlist (free)
          </Link>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>
          ₹100 one-time · Founding benefits locked in forever · Cancel anytime after launch
        </p>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px, 8vw, 80px) 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--sage)', textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>
            The feeling every NRI family knows
          </p>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 700, color: 'var(--forest)', textAlign: 'center', margin: '0 0 40px' }}>
            You call every day.<br />But you still don't truly know.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {PROBLEM_QUOTES.map((q, i) => (
              <div key={i} style={{
                background: 'var(--cream)', borderRadius: 16, padding: '24px 22px',
                borderLeft: '3px solid var(--sage)',
              }}>
                <p style={{ fontSize: 15, color: 'var(--forest)', lineHeight: 1.65, margin: '0 0 12px', fontStyle: 'italic' }}>
                  "{q.text}"
                </p>
                <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>— {q.attr}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 600, color: 'var(--forest)', margin: '40px 0 0', lineHeight: 1.5 }}>
            Close Eye exists for exactly this.<br />
            <span style={{ fontWeight: 400, fontSize: 16, color: 'var(--gray-mid)' }}>A trusted person in India. Personal visits. WhatsApp reports. Real presence.</span>
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--cream)', padding: 'clamp(48px, 8vw, 80px) 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--sage)', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            How it works
          </p>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: 'var(--forest)', textAlign: 'center', margin: '0 0 48px' }}>
            Simple for you. Meaningful for them.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {HOW_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, padding: '24px 0', borderBottom: i < HOW_STEPS.length - 1 ? '1px solid rgba(14,42,31,0.08)' : 'none' }}>
                <div style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 12, background: 'var(--forest)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                  {s.n}
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--forest)', margin: '0 0 6px' }}>{s.title}</p>
                  <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: 0, lineHeight: 1.6 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ─────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: 'clamp(48px, 8vw, 80px) 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--sage)', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            What you get
          </p>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: 'var(--forest)', textAlign: 'center', margin: '0 0 48px' }}>
            Everything a loved one needs.<br />Everything you've been missing.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {SERVICES.map((s, i) => (
              <div key={i} style={{ background: 'var(--cream)', borderRadius: 16, padding: '24px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--forest)', margin: '0 0 8px' }}>{s.title}</p>
                <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: 0, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────────── */}
      <section style={{ background: 'var(--cream)', padding: '32px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
          {[
            { icon: Shield, text: 'Background-verified companions' },
            { icon: Heart, text: 'Medical team reviews every query' },
            { icon: Clock, text: 'WhatsApp report within 1 hour of every visit' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500, color: 'var(--forest)' }}>
              <Icon size={18} color="var(--sage)" />
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOUNDING OFFER ───────────────────────────────────────── */}
      <section style={{ background: 'var(--forest)', color: '#fff', padding: 'clamp(48px, 8vw, 80px) 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <span style={{
            display: 'inline-block', background: 'rgba(168,213,181,0.2)', border: '1px solid rgba(168,213,181,0.4)',
            color: 'var(--sage)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            padding: '5px 14px', borderRadius: 100, marginBottom: 24, textTransform: 'uppercase',
          }}>
            India Independence Day · 15 August 2025
          </span>
          <h2 style={{ fontSize: 'clamp(26px, 6vw, 44px)', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.2 }}>
            Be free from the not-knowing.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 36px' }}>
            On 15 August, Close Eye launches companion visits across Hyderabad. Founding Members are first — matched, scheduled, and welcomed before anyone else.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '32px 28px', marginBottom: 32, textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--sage)', letterSpacing: '0.06em', margin: '0 0 16px' }}>FOUNDING MEMBER BENEFITS — PERMANENT</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {BENEFITS.map(b => (
                <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                  <Check size={16} color="var(--sage)" style={{ flexShrink: 0, marginTop: 2 }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: 'var(--sage)' }}>₹100</span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>one-time</span>
          </div>
          <Link to="/auth?mode=signup" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'center', width: '100%',
            background: 'var(--sage)', color: 'var(--forest)', fontWeight: 700,
            padding: '18px 28px', borderRadius: 14, fontSize: 17, textDecoration: 'none',
          }}>
            Become a Founding Member <ArrowRight size={20} />
          </Link>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 14 }}>
            Secure payment via Razorpay · INR · International cards accepted
          </p>
        </div>
      </section>

      {/* ── SOFT WAITLIST FALLBACK ────────────────────────────────── */}
      <section style={{ background: 'var(--cream)', padding: 'clamp(40px, 6vw, 64px) 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: 'var(--gray-mid)', margin: '0 0 8px' }}>Not ready to commit?</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--forest)', margin: '0 0 24px' }}>
          Join the waitlist — it's completely free.
        </p>
        <p style={{ fontSize: 14, color: 'var(--gray-mid)', maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.6 }}>
          You'll still get access to Ask Close Eye (5 questions/month), early launch notifications, and an upgrade path to Founding Member whenever you're ready.
        </p>
        <Link to="/waitlist" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: '1.5px solid var(--forest)', color: 'var(--forest)', fontWeight: 600,
          padding: '14px 24px', borderRadius: 12, fontSize: 15, textDecoration: 'none',
        }}>
          Join the waitlist (free) →
        </Link>
      </section>

      {/* ── MINIMAL FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: 'var(--forest)', color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '24px 16px', fontSize: 12 }}>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>← Back to closeeye.in</Link>
        <span style={{ margin: '0 12px' }}>·</span>
        <span>© 2025 Close Eye Companion · Stexa Products & Services Pvt. Ltd., Hyderabad</span>
      </footer>
    </div>
  )
}
