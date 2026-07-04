import { useState, useEffect, useRef } from 'react'
import { ArrowRight, ArrowLeft, ChevronDown, RotateCcw, Check, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LogoLockup } from '@/components/ui/Logo'

/* ── Types ───────────────────────────────────────────────────────────── */

type Step =
  | 'splash' | 'story' | 'mission' | 'timeline'
  | 'login'
  | 'welcome' | 'video' | 'brand' | 'values' | 'promise'
  | 'team' | 'how' | 'tools' | 'checklist' | 'wall'
  | 'profile' | 'recognition' | 'congratulations'

interface TeamUser { id: string; email: string; name: string }

/* ── Data ────────────────────────────────────────────────────────────── */

const POST_STEPS: Step[] = [
  'welcome', 'video', 'brand', 'values', 'promise',
  'team', 'how', 'tools', 'checklist', 'wall',
  'profile', 'recognition', 'congratulations',
]

const CORE_VALUES = [
  {
    title: 'Trust First',
    body: 'Every decision starts with trust. We earn it through action — never just words. When in doubt, be transparent.',
    examples: ['Always verify before trusting', 'Communicate delays before they become problems', 'Never make promises you cannot keep'],
  },
  {
    title: 'Care Like Family',
    body: 'We treat every elder like our own. This is not a job — it is a responsibility we chose freely.',
    examples: ['Remember personal details about every elder', 'Check in beyond the scheduled visit when needed', 'Treat their home with the same respect you would your own'],
  },
  {
    title: 'Own the Outcome',
    body: "We don't hand off problems — we solve them. If something goes wrong, we own it, fix it, and learn from it.",
    examples: ["Never say 'that's not my job'", 'Follow through to completion, not just handoff', 'Identify issues before they escalate'],
  },
  {
    title: 'Always Improve',
    body: 'Every visit, every interaction, every process can be better. We never accept good enough when lives depend on us.',
    examples: ['Submit feedback after every visit', 'Read one thing about elder care every week', 'Share learnings openly with the team'],
  },
  {
    title: 'Act with Integrity',
    body: "Do the right thing, especially when no one is watching. Our reputation is built on thousands of private moments of honesty.",
    examples: ['Report exactly what you see — good or bad', 'Never cut corners on safety checks', 'Be honest about your own limits'],
  },
]

const BRAND_CARDS = [
  { title: 'Mission', body: 'To become the world\'s trusted presence network — caring for families when they cannot be there themselves.' },
  { title: 'Vision', body: 'A world where no elder is ever truly alone, and no family has to choose between career and care.' },
  { title: 'Story', body: 'Born from the fear of not knowing if a parent is okay, across an ocean, with no one to ask.' },
  { title: 'Values', body: 'Trust First · Care Like Family · Own the Outcome · Always Improve · Act with Integrity' },
  { title: 'Voice', body: 'Warm, clear, and human. Never clinical. Never corporate. Always the voice of someone who was there.' },
  { title: 'Logo', body: 'A watchful, caring presence — the eye that never closes on those we love most.' },
  { title: 'Colors', body: 'Forest #0E2A1F · Sage #A8D5B5 · Cream #FAF7F2 · Gold #C9A84C. Purposeful, not decorative.' },
  { title: 'Culture', body: 'No hierarchy in care. Founder to companion — one team, one mission, equal dignity.' },
  { title: 'Brand Promise', body: 'The family will always know their loved one is okay. That is the promise we wake up to keep.' },
  { title: 'Service Philosophy', body: 'Presence over process. Human over systematic. Real over reported.' },
  { title: 'Customer Experience', body: 'Every touchpoint should feel like a trusted friend — not a service provider.' },
  { title: 'Design', body: 'Simple, warm, and trustworthy. Never clever at the expense of clarity.' },
]

const TIMELINE = [
  { period: 'The Idea', title: 'A personal fear became a mission', detail: 'The frustration of not knowing if a parent is okay across an ocean — and finding no one trustworthy to ask.' },
  { period: 'First Prototype', title: 'Built in a living room', detail: 'A WhatsApp group and a trusted neighbor. Simple. Real. It worked. That simplicity is still our north star.' },
  { period: 'First Companion', title: 'Someone we would trust with our own family', detail: 'Trained, verified, supervised. The standard we still hold every companion to today.' },
  { period: 'First Family', title: 'The moment that changed everything', detail: 'A family handed us the responsibility of their most important person. We have never forgotten that weight.' },
  { period: '10 Families', title: 'A quiet community of trust', detail: 'Word spread — not from ads, but from one family telling another. That is still how we grow.' },
  { period: '100 Families', title: 'The next milestone', detail: 'Every family that joins makes the network stronger, more experienced, and more trusted for everyone.' },
  { period: 'All of India', title: 'Presence in every city', detail: 'Wherever NRI families have loved ones who need us — we will be there.' },
  { period: 'Global', title: "The world's trusted presence network", detail: 'Wherever families are separated by distance, CloseEye bridges the gap with a human presence.' },
]

const TEAM = [
  { name: 'Krishna', role: 'Founder', avatar: '/krishna.jpg', initials: 'K' },
  { name: 'Aishwarya', role: 'Co-Founder & Chief of Care', avatar: '/aishwarya.jpg', initials: 'A' },
  { name: 'Dr. Sidharth', role: 'Medical Co-Founder', avatar: null, initials: 'DS' },
]

const HOW_FLOW = [
  { label: 'Customer Books', desc: 'Via app, WhatsApp, or call. The family initiates care on their terms.', icon: '📱' },
  { label: 'Operations Assigns', desc: 'The right companion for this specific family, at the right time.', icon: '⚙️' },
  { label: 'Companion Prepares', desc: "Reviews the elder's profile, history, and any special care notes.", icon: '📋' },
  { label: 'The Visit', desc: '45–60 minutes of genuine, attentive, documented presence — not a check-in.', icon: '🏠' },
  { label: 'Live Updates', desc: 'WhatsApp messages during the visit keep the family present in spirit.', icon: '💬' },
  { label: 'The Report', desc: 'Detailed WhatsApp report within 1 hour — mood, meals, meds, one personal moment.', icon: '🌿' },
  { label: 'Family Happiness', desc: 'Rated, reviewed, and acted on. Every visit makes the next one better.', icon: '⭐' },
]

const TOOLS = [
  { name: 'Dashboard', desc: 'Operations hub', emoji: '⬡', href: '/admin' },
  { name: 'Knowledge Base', desc: 'Policies & SOPs', emoji: '◎', href: '#' },
  { name: 'Brand Assets', desc: 'Logos & templates', emoji: '◈', href: '#' },
  { name: 'Calendar', desc: 'Visit scheduling', emoji: '◉', href: '#' },
  { name: 'Training', desc: 'Certification modules', emoji: '◐', href: '#' },
  { name: 'Documents', desc: 'Contracts & policies', emoji: '◑', href: '#' },
  { name: 'WhatsApp', desc: 'Team communication', emoji: '◇', href: '#' },
  { name: 'Support', desc: 'Internal help desk', emoji: '❖', href: '#' },
]

const CHECKLIST_ITEMS = [
  'Complete your CloseEye profile',
  'Read the Brand Book',
  'Watch the Founder\'s welcome video',
  'Complete your first training module',
  'Meet the team on your first day',
  'Join the CloseEye WhatsApp group',
  'Understand the visit reporting process',
  'Take the CloseEye Promise',
]

const WALL_STATS = [
  { label: 'Families Helped', value: '12+', sub: 'Founding families' },
  { label: 'Hours of Presence', value: '200+', sub: 'And counting' },
  { label: 'Emergency Responses', value: '3', sub: 'All resolved' },
  { label: 'Customer Happiness', value: '98%', sub: 'Average rating' },
  { label: 'Cities Served', value: '1', sub: 'Hyderabad — expanding' },
  { label: 'Companions', value: '4', sub: 'Verified & trained' },
]

const RECOGNITIONS = [
  { title: 'Mission Builder', desc: 'Builds the foundation others stand on' },
  { title: 'Trusted Leader', desc: 'Sets the standard for trust and care' },
  { title: 'Customer Champion', desc: 'Goes above and beyond for families' },
  { title: 'Emergency Hero', desc: 'Present and decisive when it matters most' },
  { title: 'Innovation Award', desc: 'Finds better ways to serve' },
  { title: 'Years of Service', desc: '1 · 3 · 5 · 10 year milestones' },
]

const PLEDGE_TEXT = `I understand that every person who trusts CloseEye is trusting us with someone they love.

I will show up — fully, honestly, and with care — for every family in my responsibility.

I will protect their dignity, their privacy, and their wellbeing as if they were my own family.

I will speak the truth, even when it is difficult. I will ask for help when I need it. I will always keep improving.

I join CloseEye not just as an employee, but as a Trusted Presence.

This is my commitment.`

/* ── Confetti component ───────────────────────────────────────────── */

function Confetti() {
  const colors = ['#A8D5B5', '#C9A84C', '#0E2A1F', '#7FBF94', '#FAF7F2']
  return (
    <div className="ce-mp-confetti-wrap" aria-hidden>
      {Array.from({ length: 24 }, (_, i) => (
        <div
          key={i}
          className="ce-mp-confetti-p"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${2.5 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 1.5}s`,
            background: colors[i % colors.length],
            width: Math.random() > 0.5 ? 8 : 6,
            height: Math.random() > 0.5 ? 8 : 12,
            borderRadius: Math.random() > 0.5 ? '50%' : 2,
          }}
        />
      ))}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────── */

export function TeamPlatform() {
  const [step, setStep]               = useState<Step>('splash')
  const [fading, setFading]           = useState(false)
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [loginError, setLoginError]   = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [authUser, setAuthUser]       = useState<TeamUser | null>(null)
  const [expandedVal, setExpandedVal] = useState<number | null>(null)
  const [expandedBrand, setExpandedBrand] = useState<number | null>(null)
  const [checked, setChecked]         = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false))
  const [hasSigned, setHasSigned]     = useState(false)
  const [promised, setPromised]       = useState(false)
  const [showCert, setShowCert]       = useState(false)

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const isDrawing   = useRef(false)
  const lastPos     = useRef<{ x: number; y: number } | null>(null)
  const shellRef    = useRef<HTMLDivElement>(null)

  /* Check existing session */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const u = data.session.user
        const name = (u.user_metadata?.full_name as string | undefined) || u.email?.split('@')[0] || 'there'
        setAuthUser({ id: u.id, email: u.email ?? '', name })
        const saved = sessionStorage.getItem('ce_team_step') as Step | null
        if (saved && POST_STEPS.includes(saved)) setStep(saved)
      }
    })
  }, [])

  /* Canvas setup — scale to devicePixelRatio */
  useEffect(() => {
    if (step !== 'promise') return
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(dpr, dpr)
  }, [step])

  function go(next: Step) {
    setFading(true)
    setTimeout(() => {
      setStep(next)
      setFading(false)
      sessionStorage.setItem('ce_team_step', next)
      shellRef.current?.scrollTo(0, 0)
    }, 320)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const u = data.user
      const name = (u.user_metadata?.full_name as string | undefined) || u.email?.split('@')[0] || 'there'
      setAuthUser({ id: u.id, email: u.email ?? '', name })
      go('welcome')
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Sign in failed. Please check your credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  /* Canvas drawing */
  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault(); isDrawing.current = true; lastPos.current = getCanvasPos(e)
  }
  function drawStroke(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()
    if (!isDrawing.current || !lastPos.current) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getCanvasPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#0E2A1F'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    setHasSigned(true)
  }
  function stopDraw() { isDrawing.current = false; lastPos.current = null }
  function clearSig() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  function takePromise() {
    if (!hasSigned) return
    localStorage.setItem('ce_promise', JSON.stringify({
      name: authUser?.name, email: authUser?.email, date: new Date().toISOString(),
    }))
    setPromised(true)
    go('team')
  }

  const progressIdx = POST_STEPS.indexOf(step)
  const progressPct = progressIdx >= 0 ? Math.round((progressIdx / (POST_STEPS.length - 1)) * 100) : 0
  const isPost = POST_STEPS.includes(step)

  /* ── Screens ───────────────────────────────────────────────────── */

  function Splash() {
    return (
      <div className="ce-mp-dark" style={{ minHeight: '100svh', textAlign: 'center', gap: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% -10%, #1B4332 0%, #0E2A1F 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, maxWidth: 560, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: 48 }}>
            <LogoLockup fontSize={22} color="light" />
          </div>
          <p className="ce-mp-eyebrow ce-mp-eyebrow-sage" style={{ marginBottom: 24 }}>Internal Mission Platform</p>
          <h1 className="ce-mp-display ce-mp-display-cream" style={{ textAlign: 'center', marginBottom: 20 }}>
            Welcome to<br />
            <span style={{ color: '#7FBF94' }}>CloseEye.</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(250,247,242,0.6)', lineHeight: 1.7, marginTop: 8, marginBottom: 56, fontStyle: 'italic' }}>
            Your Trusted Presence in India.
          </p>
          <button className="ce-mp-btn ce-mp-btn-sage" onClick={() => go('story')} style={{ fontSize: 17, minHeight: 56, padding: '0 36px' }}>
            Begin the Journey <ArrowRight size={18} />
          </button>
          <p style={{ fontSize: 12, color: 'rgba(250,247,242,0.3)', marginTop: 32, letterSpacing: '0.06em' }}>
            FOR TEAM MEMBERS · COMPANIONS · ADVISORS · INVESTORS
          </p>
        </div>
      </div>
    )
  }

  function Story() {
    return (
      <div className="ce-mp-story-screen">
        <div className="ce-mp-story-wrap">
          <button className="ce-mp-back" onClick={() => go('splash')} style={{ marginBottom: 48 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <p className="ce-mp-eyebrow ce-mp-eyebrow-sage">The Story</p>
          <h2 className="ce-mp-story-quote">
            "Before this was a company, it was a family's fear."
          </h2>
          <p className="ce-mp-story-p">
            CloseEye was not born in a boardroom. It was born in the silence between a phone call ending
            and the next one — in the hours when an NRI family doesn't know if their parent has eaten,
            if they've taken their medicine, if they've fallen and cannot reach the phone.
          </p>
          <p className="ce-mp-story-p">
            We built CloseEye because we lived that silence. Because "they say they're fine" is not
            the same as knowing they're fine. Because the people who love their parents most are the
            ones least able to be with them — held across oceans by careers, by visas, by the ambition
            their parents sacrificed everything to give them.
          </p>
          <p className="ce-mp-story-p">
            We exist to close that gap. Not with technology. With people. With presence. With the kind
            of care that sends a WhatsApp report that says "she showed me your graduation photo on the
            bedside table — she's so proud of you."
          </p>
          <p className="ce-mp-story-p">
            That is what we do. That is why we exist. That is what you are now a part of.
          </p>

          <div className="ce-mp-video-wrap">
            <div className="ce-mp-video-inner">
              <Play size={36} color="#A8D5B5" />
              <p style={{ color: 'rgba(250,247,242,0.5)', fontSize: 14, margin: '8px 0 0' }}>Founder's Story — Coming Soon</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 56 }}>
            <button className="ce-mp-btn ce-mp-btn-sage" onClick={() => go('mission')} style={{ flex: 1 }}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  function Mission() {
    return (
      <div className="ce-mp-dark" style={{ minHeight: '100svh', padding: '80px 24px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 60% at 20% 50%, rgba(27,67,50,0.8) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 700, margin: '0 auto' }}>
          <button className="ce-mp-back" onClick={() => go('story')} style={{ marginBottom: 56 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <p className="ce-mp-eyebrow ce-mp-eyebrow-sage">Our Mission</p>
          <h2 className="ce-mp-display ce-mp-display-cream" style={{ fontSize: 'clamp(36px, 6vw, 72px)', marginBottom: 40, lineHeight: 1.1 }}>
            Every day,<br />
            someone trusts us<br />
            with <span style={{ color: '#7FBF94' }}>someone they love.</span>
          </h2>
          <div style={{ width: '100%', height: 1, background: 'rgba(168,213,181,0.2)', marginBottom: 40 }} />
          <p style={{ fontSize: 18, color: 'rgba(250,247,242,0.68)', lineHeight: 1.75, marginBottom: 32, maxWidth: 520 }}>
            CloseEye exists to become the <strong style={{ color: '#A8D5B5', fontWeight: 700 }}>world's trusted presence network</strong>.
          </p>
          <p style={{ fontSize: 16, color: 'rgba(250,247,242,0.5)', lineHeight: 1.8, marginBottom: 48 }}>
            We help people, families, homes, and businesses — when they cannot be there themselves.
            Not with software. With presence. With people. With care that is felt, not just reported.
          </p>
          <button className="ce-mp-btn ce-mp-btn-sage" onClick={() => go('timeline')}>
            Our Journey <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  function Timeline() {
    return (
      <div className="ce-mp-dark" style={{ minHeight: '100svh', padding: '80px 24px', justifyContent: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
          <button className="ce-mp-back" onClick={() => go('mission')} style={{ marginBottom: 48 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <p className="ce-mp-eyebrow ce-mp-eyebrow-sage">Company Timeline</p>
          <h2 className="ce-mp-h2" style={{ color: '#FAF7F2', marginBottom: 52 }}>Where we've been.<br />Where we're going.</h2>
          <div className="ce-mp-timeline">
            {TIMELINE.map((item, i) => (
              <div key={item.period} className={`ce-mp-tl-item${i === 0 ? ' is-active' : ''}`}>
                <div className="ce-mp-tl-spine">
                  <div className="ce-mp-tl-dot" />
                  {i < TIMELINE.length - 1 && <div className="ce-mp-tl-line" />}
                </div>
                <div className="ce-mp-tl-content">
                  <p className="ce-mp-tl-period">{item.period}</p>
                  <h3 className="ce-mp-tl-title">{item.title}</h3>
                  <p className="ce-mp-tl-detail">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 52 }}>
            <button className="ce-mp-btn ce-mp-btn-sage" onClick={() => go('login')} style={{ width: '100%' }}>
              Join the Mission <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  function Login() {
    return (
      <div className="ce-mp-login-screen">
        <div className="ce-mp-login-card">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <LogoLockup fontSize={20} color="dark" />
            <p style={{ fontSize: 15, color: '#6E6E73', marginTop: 16, lineHeight: 1.65 }}>
              You're about to join a mission.<br />Sign in to continue.
            </p>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="ce-mp-label" htmlFor="mp-email">Company Email</label>
              <input id="mp-email" className="ce-mp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@closeeye.in" required autoComplete="email" />
            </div>
            <div>
              <label className="ce-mp-label" htmlFor="mp-pw">Password</label>
              <input id="mp-pw" className="ce-mp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            </div>
            {loginError && <p className="ce-mp-error">{loginError}</p>}
            <button type="submit" className="ce-mp-btn ce-mp-btn-forest" disabled={loginLoading} style={{ marginTop: 4, width: '100%' }}>
              {loginLoading ? 'Signing in…' : 'Continue'}
              {!loginLoading && <ArrowRight size={16} />}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button className="ce-mp-back" style={{ color: '#AEAEAE', fontSize: 13 }} onClick={() => go('timeline')}>
              <ArrowLeft size={13} /> Back to the story
            </button>
          </div>
        </div>
      </div>
    )
  }

  function Welcome() {
    const first = authUser?.name?.split(' ')[0] || 'there'
    return (
      <div className="ce-mp-dark" style={{ minHeight: '100svh', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(27,67,50,0.9) 0%, #0E2A1F 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto', padding: '0 24px' }}>
          <p className="ce-mp-eyebrow ce-mp-eyebrow-sage" style={{ marginBottom: 32 }}>Welcome</p>
          <h1 className="ce-mp-display ce-mp-display-cream" style={{ fontSize: 'clamp(40px, 7vw, 80px)', marginBottom: 32 }}>
            Welcome,<br /><span style={{ color: '#7FBF94' }}>{first}.</span>
          </h1>
          <p style={{ fontSize: 20, color: 'rgba(250,247,242,0.75)', lineHeight: 1.7, marginBottom: 16 }}>
            Today you didn't join a company.
          </p>
          <p style={{ fontSize: 20, color: '#A8D5B5', fontWeight: 700, marginBottom: 48 }}>
            You joined a mission.
          </p>
          <p style={{ fontSize: 15, color: 'rgba(250,247,242,0.45)', lineHeight: 1.75, marginBottom: 56, maxWidth: 420, margin: '0 auto 56px' }}>
            Every decision you make, every family you serve, every visit you support — can improve
            someone's life. Thank you for becoming someone's Trusted Presence.
          </p>
          <button className="ce-mp-btn ce-mp-btn-sage" onClick={() => go('video')} style={{ minHeight: 56, padding: '0 36px', fontSize: 16 }}>
            Begin your journey <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  function Video() {
    return (
      <ScreenShell step="video" title="Founder's Welcome" eyebrow="Mission Video" onBack={() => go('welcome')} onNext={() => go('brand')}>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.7, marginBottom: 32, maxWidth: 520 }}>
          A personal welcome from the founder — why this matters, what you're joining, and what we believe in together.
        </p>
        <div className="ce-mp-video-wrap">
          <div className="ce-mp-video-inner">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#0E2A1F', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Play size={28} color="#A8D5B5" style={{ marginLeft: 4 }} />
            </div>
            <p style={{ color: 'rgba(250,247,242,0.45)', fontSize: 14, margin: 0 }}>Founder's Welcome Video</p>
            <p style={{ color: 'rgba(250,247,242,0.25)', fontSize: 12, margin: '4px 0 0' }}>2–3 minutes · Coming Soon</p>
          </div>
        </div>
      </ScreenShell>
    )
  }

  function Brand() {
    return (
      <ScreenShell step="brand" title="The Brand Book" eyebrow="CloseEye Identity" onBack={() => go('video')} onNext={() => go('values')}>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.65, marginBottom: 36 }}>
          Everything we say, make, and do is an expression of this identity. Click any card to read more.
        </p>
        <div className="ce-mp-brand-grid">
          {BRAND_CARDS.map((card, i) => (
            <div
              key={card.title}
              className={`ce-mp-brand-card${expandedBrand === i ? ' is-expanded' : ''}`}
              onClick={() => setExpandedBrand(expandedBrand === i ? null : i)}
            >
              <p className="ce-mp-brand-card-title">{card.title}</p>
              <p className="ce-mp-brand-card-body">{card.body}</p>
            </div>
          ))}
        </div>
      </ScreenShell>
    )
  }

  function Values() {
    return (
      <ScreenShell step="values" title="Core Values" eyebrow="What We Stand For" onBack={() => go('brand')} onNext={() => go('promise')}>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.65, marginBottom: 36 }}>
          These are not posters on a wall. They are the decisions we make when no one is watching.
        </p>
        <div className="ce-mp-value-list">
          {CORE_VALUES.map((v, i) => (
            <div
              key={v.title}
              className={`ce-mp-value-card${expandedVal === i ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="ce-mp-value-header"
                onClick={() => setExpandedVal(expandedVal === i ? null : i)}
                aria-expanded={expandedVal === i}
              >
                <span className="ce-mp-value-num">0{i + 1}</span>
                <span className="ce-mp-value-title">{v.title}</span>
                <ChevronDown size={18} className="ce-mp-value-chevron" />
              </button>
              <div className="ce-mp-value-body-wrap">
                <div className="ce-mp-value-body">
                  <p className="ce-mp-value-desc">{v.body}</p>
                  <div className="ce-mp-value-examples">
                    {v.examples.map(ex => (
                      <div key={ex} className="ce-mp-value-example">
                        <span className="ce-mp-value-example-dot" />
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScreenShell>
    )
  }

  function Promise() {
    return (
      <ScreenShell step="promise" title="The CloseEye Promise" eyebrow="Your Commitment" onBack={() => go('values')} onNext={promised ? () => go('team') : undefined}>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.65, marginBottom: 36 }}>
          This is not a formality. Read it carefully. Sign it with intention.
        </p>
        <div className="ce-mp-pledge">
          {PLEDGE_TEXT.trim().split('\n\n').map((para, i) => (
            <p key={i} style={{ fontSize: 15, lineHeight: 1.85, color: '#1A1A1A', margin: i === 0 ? 0 : '20px 0 0' }}>{para}</p>
          ))}
        </div>

        {!promised && (
          <div style={{ marginTop: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#6E6E73', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 12 }}>
              Your Signature
            </p>
            <div className="ce-mp-sig-wrap">
              <canvas
                ref={canvasRef}
                className="ce-mp-sig-canvas"
                onMouseDown={startDraw}
                onMouseMove={drawStroke}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={drawStroke}
                onTouchEnd={stopDraw}
              />
              {!hasSigned && (
                <div className="ce-mp-sig-hint">Sign here with your finger or mouse</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                className="ce-mp-btn ce-mp-btn-outline ce-mp-btn-sm"
                onClick={clearSig}
                style={{ gap: 6 }}
              >
                <RotateCcw size={13} /> Clear
              </button>
              <button
                type="button"
                className="ce-mp-btn ce-mp-btn-forest"
                onClick={takePromise}
                disabled={!hasSigned}
                style={{ flex: 1, opacity: hasSigned ? 1 : 0.45 }}
              >
                I commit to this Promise <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {promised && (
          <div style={{ marginTop: 24, background: '#F0FDF4', border: '1.5px solid #A8D5B5', borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0E2A1F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={16} color="#A8D5B5" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0E2A1F', margin: 0 }}>Promise recorded.</p>
              <p style={{ fontSize: 13, color: '#6E6E73', margin: '2px 0 0' }}>Thank you for committing to the mission.</p>
            </div>
          </div>
        )}
      </ScreenShell>
    )
  }

  function Team() {
    return (
      <ScreenShell step="team" title="Meet the Team" eyebrow="One Team" onBack={() => go('promise')} onNext={() => go('how')}>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.65, marginBottom: 36 }}>
          No hierarchy. No silos. Every person at CloseEye is here because they believe families deserve better.
        </p>
        <div className="ce-mp-team-grid">
          {TEAM.map(member => (
            <div key={member.name} className="ce-mp-team-card">
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} className="ce-mp-team-photo" />
              ) : (
                <div className="ce-mp-team-avatar">{member.initials}</div>
              )}
              <p className="ce-mp-team-name">{member.name}</p>
              <p className="ce-mp-team-role">{member.role}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, padding: '20px 24px', background: '#FAF7F2', borderRadius: 16, border: '1px solid #EDE8E0' }}>
          <p style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.65, margin: 0, textAlign: 'center', fontStyle: 'italic' }}>
            "We are a small team doing something that matters enormously. Every person here is trusted, valued, and essential."
          </p>
        </div>
      </ScreenShell>
    )
  }

  function How() {
    return (
      <ScreenShell step="how" title="How CloseEye Works" eyebrow="The Journey" onBack={() => go('team')} onNext={() => go('tools')}>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.65, marginBottom: 40 }}>
          Every visit is a complete journey — from booking to the family's peace of mind.
        </p>
        <div className="ce-mp-flow">
          {HOW_FLOW.map((item, i) => (
            <div key={item.label} className="ce-mp-flow-item">
              <div className="ce-mp-flow-spine">
                <div className="ce-mp-flow-dot" style={i === 0 ? { background: '#0E2A1F', borderColor: '#0E2A1F', fontSize: 20 } : {}}>
                  {item.icon}
                </div>
                {i < HOW_FLOW.length - 1 && <div className="ce-mp-flow-conn" />}
              </div>
              <div style={{ paddingTop: 8 }}>
                <p className="ce-mp-flow-label">{item.label}</p>
                <p className="ce-mp-flow-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </ScreenShell>
    )
  }

  function Tools() {
    return (
      <ScreenShell step="tools" title="Your Tools" eyebrow="Everything You Need" onBack={() => go('how')} onNext={() => go('checklist')}>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.65, marginBottom: 36 }}>
          Everything you need to do your best work — in one place.
        </p>
        <div className="ce-mp-tools-grid">
          {TOOLS.map(tool => (
            <a key={tool.name} href={tool.href} className="ce-mp-tool-card">
              <span className="ce-mp-tool-emoji">{tool.emoji}</span>
              <p className="ce-mp-tool-name">{tool.name}</p>
              <p className="ce-mp-tool-desc">{tool.desc}</p>
            </a>
          ))}
        </div>
      </ScreenShell>
    )
  }

  function Checklist() {
    const doneCount = checked.filter(Boolean).length
    const pct = Math.round((doneCount / CHECKLIST_ITEMS.length) * 100)
    return (
      <ScreenShell step="checklist" title="First Week Checklist" eyebrow="Getting Started" onBack={() => go('tools')} onNext={() => go('wall')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <p style={{ fontSize: 15, color: '#6E6E73', margin: 0 }}>{doneCount} of {CHECKLIST_ITEMS.length} complete</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 120, height: 6, borderRadius: 3, background: '#EDE8E0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#0E2A1F', borderRadius: 3, transition: 'width 400ms ease' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0E2A1F' }}>{pct}%</span>
          </div>
        </div>
        <div className="ce-mp-checklist">
          {CHECKLIST_ITEMS.map((item, i) => (
            <button
              key={item}
              type="button"
              className={`ce-mp-check-item${checked[i] ? ' is-done' : ''}`}
              onClick={() => { const n = [...checked]; n[i] = !n[i]; setChecked(n) }}
            >
              <div className="ce-mp-check-box">
                {checked[i] && <Check size={13} strokeWidth={3} />}
              </div>
              <span className="ce-mp-check-text">{item}</span>
            </button>
          ))}
        </div>
      </ScreenShell>
    )
  }

  function Wall() {
    return (
      <div className="ce-mp-wall-screen">
        <div style={{ width: '100%', maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p className="ce-mp-eyebrow ce-mp-eyebrow-sage" style={{ marginBottom: 12 }}>Mission Wall</p>
              <h2 className="ce-mp-h2" style={{ color: '#FAF7F2' }}>What we've built together.</h2>
            </div>
          </div>
          <div className="ce-mp-wall-grid">
            {WALL_STATS.map(stat => (
              <div key={stat.label} className="ce-mp-wall-stat">
                <p className="ce-mp-wall-value">{stat.value}</p>
                <p className="ce-mp-wall-label">{stat.label}</p>
                <p className="ce-mp-wall-sub">{stat.sub}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 64, padding: '28px 32px', background: 'rgba(168,213,181,0.07)', border: '1px solid rgba(168,213,181,0.15)', borderRadius: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontStyle: 'italic', color: 'rgba(250,247,242,0.7)', lineHeight: 1.7, margin: 0 }}>
              "Every number here is a family that trusted us. Every hour is a moment of peace we gave someone."
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 52, flexWrap: 'wrap' }}>
            <button className="ce-mp-btn ce-mp-btn-ghost" onClick={() => go('checklist')} style={{ gap: 6 }}>
              <ArrowLeft size={15} /> Back
            </button>
            <button className="ce-mp-btn ce-mp-btn-sage" onClick={() => go('profile')} style={{ flex: 1 }}>
              View My Profile <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  function Profile() {
    const initials = (authUser?.name || 'CE').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const joinDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    return (
      <ScreenShell step="profile" title="Your Profile" eyebrow="Employee Profile" onBack={() => go('wall')} onNext={() => go('recognition')}>
        <div className="ce-mp-profile-card">
          <div className="ce-mp-profile-avatar">{initials}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0E2A1F', margin: '0 0 4px', letterSpacing: '-0.01em' }}>{authUser?.name || '—'}</h2>
          <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 28px' }}>Team Member · CloseEye</p>
          <div>
            {[
              ['Email', authUser?.email || '—'],
              ['Employee ID', `CE-${authUser?.id?.slice(0, 8).toUpperCase() || '000000'}`],
              ['Joining Date', joinDate],
              ['Status', 'Active'],
              ['Mission Progress', `${progressPct}%`],
              ['Promise', promised ? 'Signed ✓' : 'Pending'],
            ].map(([k, v]) => (
              <div key={k} className="ce-mp-profile-field">
                <span className="ce-mp-profile-key">{k}</span>
                <span className="ce-mp-profile-val" style={v === 'Signed ✓' ? { color: '#0E2A1F' } : undefined}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </ScreenShell>
    )
  }

  function Recognition() {
    return (
      <ScreenShell step="recognition" title="Recognition" eyebrow="Awards & Milestones" onBack={() => go('profile')} onNext={() => go('congratulations')}>
        <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.65, marginBottom: 36 }}>
          We celebrate the people who make this mission possible. These awards are earned — not given.
        </p>
        <div className="ce-mp-recog-grid">
          {RECOGNITIONS.map(r => (
            <div key={r.title} className="ce-mp-recog-card">
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1.5px solid #C9A84C' }}>
                <span style={{ fontSize: 20 }}>◆</span>
              </div>
              <p className="ce-mp-recog-title">{r.title}</p>
              <p className="ce-mp-recog-desc">{r.desc}</p>
            </div>
          ))}
        </div>
      </ScreenShell>
    )
  }

  function Congratulations() {
    const first = authUser?.name?.split(' ')[0] || 'there'
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    return (
      <div className="ce-mp-congrats-screen">
        {showCert && <Confetti />}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <p className="ce-mp-eyebrow ce-mp-eyebrow-forest" style={{ marginBottom: 24 }}>Congratulations</p>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800, color: '#0E2A1F', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
            Welcome to<br /><span style={{ color: '#7FBF94' }}>CloseEye.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#6E6E73', lineHeight: 1.7, marginBottom: 48 }}>
            Thank you for becoming someone's Trusted Presence.
          </p>

          <div className="ce-mp-cert" style={{ textAlign: 'left' }}>
            <div className="ce-mp-cert-border" />
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <span className="ce-mp-cert-badge">Certificate of Mission</span>
            </div>
            <p style={{ fontSize: 13, color: '#AEAEAE', textAlign: 'center', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>This certifies that</p>
            <p className="ce-mp-cert-name" style={{ textAlign: 'center' }}>{authUser?.name || '—'}</p>
            <p className="ce-mp-cert-text" style={{ textAlign: 'center' }}>
              has completed the CloseEye Mission onboarding, taken the CloseEye Promise, and
              officially joined the world's trusted presence network.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20, borderTop: '1px solid #EDE8E0' }}>
              <div>
                <p style={{ fontSize: 11, color: '#AEAEAE', margin: '0 0 4px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Date</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0E2A1F', margin: 0 }}>{today}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <LogoLockup fontSize={16} color="dark" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <button
              className="ce-mp-btn ce-mp-btn-sage"
              onClick={() => setShowCert(true)}
              style={{ flex: 1 }}
            >
              Celebrate 🎉
            </button>
            <a href="/admin" className="ce-mp-btn ce-mp-btn-forest" style={{ flex: 1, textDecoration: 'none' }}>
              Go to Dashboard <ArrowRight size={16} />
            </a>
          </div>
          <p style={{ fontSize: 13, color: '#AEAEAE', marginTop: 24 }}>
            Your certificate and profile have been saved.
          </p>
        </div>
      </div>
    )
  }

  /* ── Screen shell (post-login wrapper) ─────────────────────────── */

  function ScreenShell({
    step: _step, title, eyebrow, onBack, onNext, children,
  }: {
    step: Step; title: string; eyebrow: string
    onBack: () => void; onNext?: () => void; children: React.ReactNode
  }) {
    return (
      <div className="ce-mp-light" style={{ paddingTop: 56, minHeight: '100svh' }}>
        <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 48px' }}>
            <button className="ce-mp-back ce-mp-back-light" onClick={onBack}>
              <ArrowLeft size={14} /> Back
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#C7C7CC', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {POST_STEPS.indexOf(_step) + 1} / {POST_STEPS.length}
            </span>
          </div>
          <p className="ce-mp-eyebrow ce-mp-eyebrow-forest" style={{ marginBottom: 10 }}>{eyebrow}</p>
          <h1 className="ce-mp-h2" style={{ color: '#0E2A1F', marginBottom: 40 }}>{title}</h1>
          {children}
          {onNext && (
            <button className="ce-mp-btn ce-mp-btn-forest" onClick={onNext} style={{ marginTop: 48, minWidth: 200 }}>
              Continue <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div ref={shellRef} className="ce-mp-shell">
      {isPost && step !== 'congratulations' && (
        <div className="ce-mp-progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="ce-mp-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {isPost && step !== 'congratulations' && step !== 'welcome' && step !== 'wall' && (
        <nav className="ce-mp-top-nav">
          <LogoLockup fontSize={16} color="dark" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#C7C7CC', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Mission Onboarding
          </span>
        </nav>
      )}

      <div className={`ce-mp-view${fading ? ' ce-mp-fading' : ''}`}>
        {step === 'splash'          && <Splash />}
        {step === 'story'           && <Story />}
        {step === 'mission'         && <Mission />}
        {step === 'timeline'        && <Timeline />}
        {step === 'login'           && <Login />}
        {step === 'welcome'         && <Welcome />}
        {step === 'video'           && <Video />}
        {step === 'brand'           && <Brand />}
        {step === 'values'          && <Values />}
        {step === 'promise'         && <Promise />}
        {step === 'team'            && <Team />}
        {step === 'how'             && <How />}
        {step === 'tools'           && <Tools />}
        {step === 'checklist'       && <Checklist />}
        {step === 'wall'            && <Wall />}
        {step === 'profile'         && <Profile />}
        {step === 'recognition'     && <Recognition />}
        {step === 'congratulations' && <Congratulations />}
      </div>
    </div>
  )
}
