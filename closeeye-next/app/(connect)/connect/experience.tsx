'use client'

/**
 * Close Eye Connect — the staged experience. Ported exactly from the approved
 * design (docs/close_eye_connect_experience.html): what/how → ask → understanding
 * ledger → blanks → answer → sign-in → (Phase 2: visit + payment) → seal → Space.
 *
 * The ledger, blanks and counsel are written LIVE by the Understanding Engine from
 * what the visitor actually typed — never inferred. Google sign-in returns to
 * /connect, which provisions the Family Space and lands on /space.
 *
 * Phase 1 (now): answer → sign-in → Family Space. No visit, no payment, no prices.
 * Phase 2 (behind PHASE_2_ENABLED): visit selection + Razorpay, exactly as designed.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { signInWithPassword, signUpWithPassword } from '@/lib/auth-actions'
import { readLedger, counsel, type ReadLedger } from '@/lib/connect/ledger'
import { setConnectDraft, getConnectDraft, provisionFamilySpace } from '@/lib/db/space'
import { PHASE_2_ENABLED } from '@/lib/connect/phase'

const WA = 'https://wa.me/919000221261'
const SAMPLE = 'My mother lives alone in Hyderabad. How do I know she’s okay?'
// short, warm labels for the lines the visitor fills in
const KEY_LABEL: Record<string, string> = {
  health: 'Health', mornings: 'Her days', nearby: 'Nearby help', when_where: 'When & where',
  reach: 'How to reach', details: 'What’s needed', seeing: 'What you see', meds: 'Medicines',
  doctor: 'Doctor', where: 'Where', with: 'Who’s there', days: 'Her days', loves: 'What she loves',
  often: 'How often', which: 'Papers', whose: 'Photos', from: 'Roots',
}
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type Stage = 's0' | 's1' | 's2' | 's3' | 's4' | 's4b' | 's4c' | 's4d' | 's5' | 'resuming' | 'retry'
const THREAD: Record<Stage, number> = { s0: 8, s1: 20, s2: 34, s3: 48, s4: 60, s4b: 72, retry: 72, resuming: 80, s4c: 84, s4d: 93, s5: 100 }
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Phase 2 visit catalogue (from closeeye.in — prices shown ONLY when Phase 2 is on).
const VISITS = [
  { id: 'home-wellbeing', name: 'Home Wellbeing Visit', price: 1000, blurb: 'A Guardian visits her at home, checks in with warmth, sends you a personal update.' },
  { id: 'hospital-companion', name: 'Hospital Companion', price: 2000, blurb: 'Someone stays beside her through appointments and recovery — never alone.' },
  { id: 'custom', name: 'Custom Request', price: 500, blurb: 'Groceries, medicines, a festival visit — something only your family understands.' },
]
const inr = (n: number) => '₹' + n.toLocaleString('en-IN')

export function ConnectExperience() {
  const router = useRouter()
  const reduce = prefersReduced()
  const [stage, setStageRaw] = React.useState<Stage>('s0')
  const [text, setText] = React.useState('')
  const [rl, setRl] = React.useState<ReadLedger | null>(null)
  const [subject, setSubject] = React.useState('Their')
  const [error, setError] = React.useState('')
  const [pending, setPending] = React.useState<'google' | 'email' | null>(null)
  const [showEmail, setShowEmail] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  // what the visitor tells us on the "still open" lines — held, then preserved to the ledger
  const [told, setTold] = React.useState<{ key: string; label: string; body: string }[]>([])
  const [activeKey, setActiveKey] = React.useState<string | null>(null)
  const [fill, setFill] = React.useState('')
  // ledger / blank reveal
  const [s1n, setS1n] = React.useState(0)
  const [s1live, setS1live] = React.useState(-1)
  const [s1done, setS1done] = React.useState(false)
  const [s2n, setS2n] = React.useState(0)
  // Phase 2 selection
  const [visit, setVisit] = React.useState(VISITS[0]!)
  const threadRef = React.useRef<HTMLElement | null>(null)
  const timers = React.useRef<number[]>([])
  const t = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const setStage = React.useCallback((s: Stage) => {
    setStageRaw(s)
    if (threadRef.current) threadRef.current.style.height = THREAD[s] + '%'
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  React.useEffect(() => { if (threadRef.current) threadRef.current.style.height = THREAD.s0 + '%' }, [])
  React.useEffect(() => () => clearTimers(), [])

  /* ── the counsel, once ── */
  const counselData = React.useMemo(() => (rl ? counsel(rl) : null), [rl])

  /* ── ask → understand ── */
  function ask() {
    const q = text.trim()
    if (q.length < 8) return
    setRl(readLedger(q))
    setStage('s1')
  }

  /* ── S1 ledger reveal ── */
  React.useEffect(() => {
    if (stage !== 's1' || !rl) return
    clearTimers(); setS1n(0); setS1live(-1); setS1done(false)
    if (reduce) { setS1n(rl.ledger.length); setS1done(true); return }
    rl.ledger.forEach((_, i) => t(650 + i * 820, () => { setS1n(i + 1); setS1live(i) }))
    t(650 + (rl.ledger.length - 1) * 820 + 900, () => { setS1live(-1); setS1done(true) })
  }, [stage, rl]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── S2 blanks reveal ── */
  React.useEffect(() => {
    if (stage !== 's2' || !rl) return
    clearTimers(); setS2n(0)
    if (reduce) { setS2n(rl.blanks.length); return }
    rl.blanks.forEach((_, i) => t(450 + i * 500, () => setS2n(i + 1)))
  }, [stage, rl]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── OAuth return: handle cancel/error, else provision the Space ── */
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cleanUrl = () => window.history.replaceState({}, '', window.location.pathname)
    // Google returns ?error=access_denied when the user cancels.
    if (params.has('error')) {
      cleanUrl()
      if (getConnectDraft()) { setError('Sign-in was cancelled. You can pick up right where you left off.'); setStage('s4b') }
      return
    }
    if (!params.has('code') || !getConnectDraft()) return
    let cancelled = false
    ;(async () => {
      cleanUrl() // so a refresh never reprocesses the code
      setStage('resuming')
      let ok = false
      for (let i = 0; i < 40 && !cancelled; i++) {
        try { const { data } = await supabase.auth.getSession(); if (data.session) { ok = true; break } } catch { /* keep waiting */ }
        await delay(300)
      }
      if (cancelled) return
      if (!ok) { setError('We couldn’t finish signing you in. Your details are safe — please try again.'); setStage('s4b'); return }
      await finishAndProvision()
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── provision + branch by phase. NEVER navigates to an empty Space; a failure
        surfaces a calm retry with the draft intact. ── */
  async function finishAndProvision() {
    const draft = getConnectDraft()
    setSubject(draft ? readLedger(draft.rawText).subjectLabel : rl?.subjectLabel ?? 'Their')
    if (PHASE_2_ENABLED) {
      setStage('resuming')
      const res = await provisionFamilySpace()
      if (res.error || !res.lovedOneId) { setError(recoveryMessage(res.error)); setStage('retry'); return }
      setStage('s4c')
      return
    }
    // Phase 1: seal (with the promise line) while provisioning; only land on success.
    setStage('s5')
    const [res] = await Promise.all([provisionFamilySpace(), delay(reduce ? 0 : 2400)])
    if (res.error || !res.lovedOneId) { setError(recoveryMessage(res.error)); setStage('retry'); return }
    router.replace('/space')
  }
  function recoveryMessage(err: string | null): string {
    if (err === 'not-signed-in') return 'Your sign-in didn’t hold. Nothing is lost — please try once more.'
    if (err === 'network') return 'The connection dropped for a moment. Nothing you told me is lost — try again.'
    return 'Something interrupted us — but everything you told me is safe. Let’s try again.'
  }

  // preserve the words + anything told on the open lines through the sign-in round-trip
  function saveDraft() { setConnectDraft(text, told.map((x) => ({ label: x.label, body: x.body }))) }
  const shortLabel = (key: string) => KEY_LABEL[key] || (key.charAt(0).toUpperCase() + key.slice(1))
  function saveTold(key: string) {
    const v = fill.trim(); if (!v) return
    setTold((prev) => [...prev, { key, label: shortLabel(key), body: v }])
    setActiveKey(null); setFill('')
  }

  /* ── sign-in ── */
  async function google() {
    setError(''); setPending('google')
    saveDraft()
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/connect`, queryParams: { prompt: 'select_account' } },
      })
      if (err) { setPending(null); setError('Sign-in couldn’t start. Please try again.') }
      // web redirects away; the return effect above resumes on /connect
    } catch { setPending(null); setError('We couldn’t reach the sign-in service. Check your connection and try again.') }
  }
  async function emailContinue() {
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Please enter a valid email address.')
    if (password.length < 8) return setError('Please use a password with at least 8 characters.')
    setPending('email'); saveDraft()
    try {
      // Try sign-in; if the account doesn't exist, create it.
      const { error: err } = await signInWithPassword(email, password)
      if (err) {
        const up = await signUpWithPassword(email, password)
        if (up.error) { setPending(null); return setError(up.error) }
        if (!up.session) { setPending(null); return setError('Account created. Please confirm your email, then continue.') }
      }
    } catch { setPending(null); return setError('We couldn’t reach the server. Check your connection and try again.') }
    setPending(null)
    await finishAndProvision()
  }

  /* ── Phase 2 payment (dark until launch; verify with live keys on 15 Aug) ── */
  async function payVisit() {
    if (!PHASE_2_ENABLED) return
    setPending('email')
    const draft = getConnectDraft()
    const rl2 = draft ? readLedger(draft.rawText) : rl
    const { data: auth } = await supabase.auth.getUser()
    const { data: br, error: brErr } = await supabase.functions.invoke('submit-booking-request', {
      body: { service_id: visit.id, recipient_name: rl2?.subjectLabel, city: rl2?.city },
    })
    if (brErr || !br?.booking_request_id) { setPending(null); setError('This visit isn’t ready yet. Please try again shortly.'); return }
    const { payForBooking } = await import('@/lib/razorpay') // loaded only when paying (Phase 2)
    const out = await payForBooking({
      bookingRequestId: br.booking_request_id,
      prefill: { name: (auth.user?.user_metadata?.full_name as string) || '', email: auth.user?.email || '' },
    })
    setPending(null)
    if (out.status === 'success') { setStage('s5'); await delay(reduce ? 0 : 2400); router.replace('/space') }
    else if (out.status !== 'dismissed') setError(out.message)
  }

  /* ── render helpers ── */
  const boldLead = (p: string) => {
    if (p.startsWith('Because')) { const i = p.indexOf(','); if (i > 0) return <><b>{p.slice(0, i + 1)}</b>{p.slice(i + 1)}</> }
    return p
  }

  // Persistent navigation — the whole flow is one continuous conversation. Back
  // steps to the previous screen; Edit returns to the start with the words intact
  // (nothing is committed to the ledger until you create the space).
  const PREV: Record<string, Stage> = { s1: 's0', s2: 's1', s3: 's2', s4: 's3', s4b: 's4' }
  const nav = (
    <div className="cxnav">
      <button type="button" onClick={() => setStage(PREV[stage] || 's0')}>← Back</button>
      <button type="button" className="edit" onClick={() => { setError(''); setStage('s0') }}>Edit what I said</button>
    </div>
  )

  return (
    <>
      <div className="thread"><i ref={threadRef} /></div>
      <div className="app">
        <header className="mast" style={{ flexDirection: 'column', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="wm"><img className="wmark" src="/brand/close-eye-icon.svg" alt="" width={24} height={24} />close eye</span>
          <div className="tag">Connect</div>
        </header>
        <main id="main">

        {/* S0 · WHAT · HOW · EXPERIENCE */}
        {stage === 's0' && (
          <section className="stage on">
            <h1 className="h-serif">Someone you love,<br /><em>understood.</em></h1>
            <p className="whatis">Close Eye learns about the people you love, so answers come from understanding — not guesses. When needed, <b>trusted local people step in to help.</b></p>
            <p className="principles"><b>Learns your family</b><span className="sep">·</span><b>Private by design</b><span className="sep">·</span><b>Real people when needed</b></p>
            <div className="howit" aria-label="How Close Eye works">
              <div className="hrow"><span className="hn">01</span><span className="ld" /><p>Tell Connect about someone you love.</p></div>
              <div className="hrow"><span className="hn">02</span><span className="ld" /><p>Connect begins understanding them.</p></div>
              <div className="hrow"><span className="hn">03</span><span className="ld" /><p>Answers come from understanding — <i>real people help when needed.</i></p></div>
            </div>
            <p className="exp-k">Experience Close Eye</p>
            <p className="lede" style={{ marginBottom: 0 }}>Tell Connect about someone you love.</p>
            <div className="ask-wrap" style={{ marginTop: 6 }}>
              <div className="ruled">
                <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE} />
              </div>
              <div className="try">or begin with —<br />
                <button type="button" onClick={() => setText(SAMPLE)}>“{SAMPLE}”</button>
              </div>
            </div>
            <div className="act">
              <button className="btn" onClick={ask} disabled={text.trim().length < 8}>Let Connect understand</button>
              <p className="privacy">Nothing you write is sold or shared. Ever.</p>
              <div className="footlinks">
                <a href="https://www.closeeye.in/#how-it-works" target="_blank" rel="noopener">How it works</a><span className="sep">·</span>
                <a href="https://www.closeeye.in/services" target="_blank" rel="noopener">Services &amp; pricing</a><span className="sep">·</span>
                <a href="https://www.closeeye.in/trust-safety" target="_blank" rel="noopener">How Guardians are verified</a><span className="sep">·</span>
                <a href="https://www.closeeye.in/membership" target="_blank" rel="noopener">Membership</a><span className="sep">·</span>
                <a href={WA} target="_blank" rel="noopener">Ask a real person on WhatsApp</a>
              </div>
              <p className="footnote">Your Trusted Presence</p>
            </div>
          </section>
        )}

        {/* S1 · UNDERSTANDING */}
        {stage === 's1' && rl && (
          <section className="stage on">
            {nav}
            <div className="think"><span className="ld" /><span>Understand first. Answer second.</span></div>
            <div className="ledger">
              <p className="lh">What I understood</p>
              {rl.ledger.map((l, i) => (
                <div key={i} className={`lline${i < s1n ? ' in' : ''}${i === s1live ? ' live' : ''}`}>
                  <span className="ld" />
                  <p>{l.label && <span className="lbl">{l.label}</span>}{l.quote ? <q>{l.body}</q> : l.body}</p>
                </div>
              ))}
            </div>
            <div className="act">
              <button className="btn" onClick={() => setStage(rl.blanks.length ? 's2' : 's3')} style={{ opacity: s1done ? 1 : 0, pointerEvents: s1done ? 'auto' : 'none' }}>That’s exactly it</button>
            </div>
          </section>
        )}

        {/* S2 · WHAT I STILL NEED — tap a line and tell me, inline */}
        {stage === 's2' && rl && (
          <section className="stage on">
            {nav}
            <h1 className="h-serif" style={{ fontSize: 26 }}>What I’d still like<br />to understand.</h1>
            <p className="lede">Tap a line to tell me — right here, whenever you like. I won’t guess.</p>
            <div className="ledger">
              <p className="lh">Still open</p>
              {told.map((item) => (
                <div key={item.key} className="told">
                  <span className="ck" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg></span>
                  <p><span className="lbl">{item.label} · you told me</span>{item.body}</p>
                </div>
              ))}
              {rl.blanks.filter((b) => !told.some((x) => x.key === b.key)).map((b, i) => (
                <React.Fragment key={b.key}>
                  <button className={`blank${i < s2n ? ' in' : ''}`} onClick={() => { setActiveKey(activeKey === b.key ? null : b.key); setFill('') }}>
                    <span className="ld" /><p>{b.text}<span className="tellme">Tell Connect</span></p>
                  </button>
                  {activeKey === b.key && (
                    <div className="fill">
                      <textarea rows={1} value={fill} onChange={(e) => setFill(e.target.value)} placeholder="Tell me as you’d tell a friend…" autoFocus />
                      <div className="frow">
                        <button className="save" onClick={() => saveTold(b.key)}>Save</button>
                        <button className="skip" onClick={() => setActiveKey(null)}>not now</button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
              {rl.blanks.length > 0 && rl.blanks.every((b) => told.some((x) => x.key === b.key)) && <p className="later">Thank you — that’s everything I hoped to understand for now.</p>}
            </div>
            <div className="act"><button className="btn" onClick={() => setStage('s3')}>Continue</button></div>
          </section>
        )}

        {/* S3 · THE ANSWER */}
        {stage === 's3' && counselData && (
          <section className="stage on">
            {nav}
            <div className="think" style={{ marginBottom: 14 }}><span className="ld" style={{ animation: 'none' }} /><span>Now I can answer you properly.</span></div>
            <div className="counsel">
              {counselData.paragraphs.map((p, i) => <p key={i}>{boldLead(p)}</p>)}
              <p className="sig">{counselData.signature}</p>
            </div>
            <p className="trustline" style={{ marginTop: 20 }}>Sometimes care needs a real person. Close Eye knows when.</p>
            {rl && !rl.aiConfident && <a className="qlink" href={WA} target="_blank" rel="noopener" style={{ marginTop: 10 }}>Talk to a real person on WhatsApp →</a>}
            <div className="act"><button className="btn" onClick={() => setStage('s4')}>{rl && !rl.aiConfident ? 'Keep this, and continue' : 'This is what I’ve been looking for'}</button></div>
          </section>
        )}

        {/* S4 · TRUST → FAMILY SPACE */}
        {stage === 's4' && rl && (
          <section className="stage on">
            {nav}
            <h1 className="h-serif" style={{ fontSize: 26 }}>Keep what I now know<br />about {rl.gender === 'he' ? 'him' : rl.gender === 'she' ? 'her' : 'them'} — <em>safely.</em></h1>
            <p className="lede">{subjectPronounTitle(rl)} private journal: what I know, what I’m learning, every visit written down.</p>
            <p className="trustline">Close Eye never invents information about your family.</p>
            <div className="ledger">
              <p className="lh">{subjectPronounTitle(rl)} page, so far</p>
              {rl.ledger.filter((l) => !l.quote).map((l, i) => (
                <div key={i} className="lline in"><span className="ld" /><p>{l.body}</p></div>
              ))}
              {rl.question && <div className="lline in"><span className="ld" /><p>In your words: <q>{rl.question}</q></p></div>}
              <div className="blank in"><span className="ld" /><p>Three lines still waiting for you<span className="dots" /></p></div>
            </div>
            <div className="act">
              <button className="btn" onClick={() => { saveDraft(); setStage('s4b') }}>Create {rl.subjectLabel === 'Someone you love' ? 'their' : rl.subjectLabel + '’s'} Family Space</button>
              <p className="privacy">Private by design. You stay in control.</p>
            </div>
          </section>
        )}

        {/* S4b · SIGN IN — Google primary, email secondary */}
        {stage === 's4b' && (
          <section className="stage on">
            {nav}
            <h1 className="h-serif" style={{ fontSize: 26 }}>Keep {rl?.gender === 'he' ? 'him' : rl?.gender === 'she' ? 'her' : 'them'} close.<br /><em>Bring the others in.</em></h1>
            <p className="whatis">Sign in so this page is yours alone — then add your family, one by one. The more Connect understands them, <b>the better every answer becomes.</b></p>
            <div className="act">
              <button className="btn-google" onClick={google} disabled={pending !== null} aria-label="Continue with Google">
                <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                {pending === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
              </button>
              {!showEmail ? (
                <button className="ghost" onClick={() => setShowEmail(true)}>Continue with email</button>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <input className="cx-field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
                  <input className="cx-field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="A password (8+ characters)" onKeyDown={(e) => { if (e.key === 'Enter') emailContinue() }} />
                  <button className="btn" onClick={emailContinue} disabled={pending !== null}>{pending === 'email' ? 'One moment…' : 'Continue with email'}</button>
                </div>
              )}
              {error && <p className="privacy" style={{ color: '#B23A2E' }}>{error}</p>}
              <p className="privacy">Your family’s information belongs only to your family.</p>
            </div>
          </section>
        )}

        {/* resuming (post-OAuth provisioning) */}
        {stage === 'resuming' && (
          <section className="stage on">
            <div className="think" style={{ marginTop: 40 }}><span className="ld" /><span>Opening {subject}’s space…</span></div>
          </section>
        )}

        {/* retry — a calm recovery; the draft is intact, nothing is lost */}
        {stage === 'retry' && (
          <section className="stage on">
            <h1 className="h-serif" style={{ fontSize: 26 }}>Let’s try that<br /><em>once more.</em></h1>
            <p className="whatis">{error || 'Something interrupted us — but everything you told me is safe.'}</p>
            <div className="act">
              <button className="btn" onClick={() => { setError(''); finishAndProvision() }}>Try again</button>
              <p className="privacy">Nothing you shared has been lost.</p>
            </div>
          </section>
        )}

        {/* S4c · FIRST VISIT (Phase 2 only) */}
        {stage === 's4c' && PHASE_2_ENABLED && (
          <section className="stage on">
            <h1 className="h-serif" style={{ fontSize: 26 }}>{subject}’s space is open.<br /><em>Begin with a visit.</em></h1>
            <p className="lede">A verified Guardian goes to {rl?.gender === 'he' ? 'him' : rl?.gender === 'they' ? 'them' : 'her'}. You receive a written report on WhatsApp.</p>
            <a className="qlink" href="https://www.closeeye.in/trust-safety" target="_blank" rel="noopener">How our Guardians are verified →</a>
            <div style={{ marginTop: 18 }}>
              {VISITS.map((v) => (
                <button key={v.id} className={`plan${visit.id === v.id ? ' pick' : ''}`} onClick={() => setVisit(v)}>
                  <span className="ld" />
                  <span className="pt"><h3>{v.name}</h3><p>{v.blurb}</p></span>
                  <span className="pr">{inr(v.price)}<small>starting at</small></span>
                </button>
              ))}
            </div>
            <div className="act">
              <button className="btn" onClick={() => setStage('s4d')}>Continue — {inr(visit.price)}</button>
              <p className="privacy">Your Presence Manager confirms the time with you first.</p>
            </div>
          </section>
        )}

        {/* S4d · PAYMENT (Phase 2 only) */}
        {stage === 's4d' && PHASE_2_ENABLED && (
          <section className="stage on">
            <h1 className="h-serif" style={{ fontSize: 26 }}>One last thing,<br /><em>quietly.</em></h1>
            <p className="lede"><a href="https://www.closeeye.in/cancellation-policy" target="_blank" rel="noopener" style={{ color: 'inherit', borderBottom: '1px dotted var(--hair2)', textDecoration: 'none' }}>Cancel or reschedule</a> any time before the visit. <a href="https://www.closeeye.in/refund-policy" target="_blank" rel="noopener" style={{ color: 'inherit', borderBottom: '1px dotted var(--hair2)', textDecoration: 'none' }}>Full refund</a>.</p>
            <div className="paysum">
              <div className="prow"><span className="k">For</span><span className="v">{subject}{rl?.city ? ` · ${rl.city}` : ''}</span></div>
              <div className="prow"><span className="k">Visit</span><span className="v">{visit.name}</span></div>
              <div className="prow total"><span className="k">Today</span><span className="v">{inr(visit.price)}</span></div>
            </div>
            <div className="act">
              <button className="btn" onClick={payVisit} disabled={pending !== null}>{pending ? 'Opening payment…' : `Pay ${inr(visit.price)}`}</button>
              {error && <p className="privacy" style={{ color: '#B23A2E' }}>{error}</p>}
              <p className="privacy">Secured by Razorpay. Your payment details never touch Close Eye’s servers.</p>
            </div>
          </section>
        )}

        {/* S5 · SEAL — the promise line, once */}
        {stage === 's5' && (
          <section className="stage on">
            <div className="seal">
              <div className="ring"><span className="ld" /></div>
              <h2>{subject}’s space is open.</h2>
              <p>Everything Close Eye understands is kept here, privately — opening it for you now.</p>
              <p className="promise">When you can’t be there, Close&nbsp;Eye can.</p>
            </div>
          </section>
        )}
        </main>
      </div>
    </>
  )
}

/** "Her" / "His" / "Their" — a title-case possessive for headings. */
function subjectPronounTitle(rl: ReadLedger): string {
  return rl.gender === 'he' ? 'His' : rl.gender === 'she' ? 'Her' : 'Their'
}
