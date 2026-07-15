'use client'

/**
 * Close Eye Connect — the staged experience. Ported from the approved design
 * (docs/close_eye_connect_experience.html) and raised to a CONTINUOUS conversation:
 * understanding, open questions and the answer accumulate in one living thread —
 * nothing resets, everything builds. The understanding is written LIVE by the
 * Understanding Engine from what the visitor actually typed — never inferred.
 *
 * Google sign-in returns to /connect, which provisions the Family Space and lands
 * on /space. Phase 1 (now): answer → sign-in → Family Space. No visit, no payment,
 * no prices. Phase 2 (behind PHASE_2_ENABLED): visit selection + Razorpay.
 *
 * SPRINT 1 (interaction only — architecture, engine and data are frozen): the
 * conversation is one accumulating thread; understanding is shown GROWING as
 * ✓ known / ○ still-open (never a progress bar); Back / Edit / Change-the-person
 * on every step.
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
const SAMPLE2 = 'My father gets stressed every year with his tax filing. Can someone help him through it?'
// short, warm labels for the lines the visitor fills in
const KEY_LABEL: Record<string, string> = {
  health: 'Health', mornings: 'Her days', nearby: 'Nearby help', when_where: 'When & where',
  reach: 'How to reach', details: 'What’s needed', seeing: 'What you see', meds: 'Medicines',
  doctor: 'Doctor', where: 'Where', with: 'Who’s there', days: 'Her days', loves: 'What she loves',
  often: 'How often', which: 'Papers', whose: 'Photos', from: 'Roots',
  due: 'By when', papers: 'Papers', helps: 'Who helps',
}
// warm, specific prompts for the moment a line is empty — "tell me something only
// your family would know." Pronoun-free so they never mis-gender anyone.
const FILL_PH: Record<string, string> = {
  health: 'The day-to-day things you’d tell a nurse',
  mornings: 'What the mornings look like now',
  nearby: 'A neighbour, a relative — anyone close by',
  when_where: 'Where it needs to happen, and when',
  reach: 'A number, or who to ask for',
  details: 'Anything needed on the day — bags, papers',
  seeing: 'What you’ve noticed — even something small',
  meds: 'What’s taken each day, if you know',
  doctor: 'A name, a clinic — whatever you have',
  where: 'Where they are right now',
  with: 'Anyone there right now',
  days: 'How the days tend to go',
  loves: 'What lights them up — a place, a memory',
  often: 'Once a week? Every day? Whatever feels right',
  which: 'The papers you’d hate to lose',
  whose: 'Whose photos to keep first',
  from: 'The town or village where it began',
  due: 'A date, or the season it falls in',
  papers: 'A drawer, a folder, an email inbox',
  helps: 'A relative, an accountant, or no one yet',
}
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type Stage = 's0' | 's1' | 's2' | 's3' | 's4' | 's4b' | 's4c' | 's4d' | 's5' | 'resuming' | 'retry'
const THREAD: Record<Stage, number> = { s0: 8, s1: 30, s2: 48, s3: 66, s4: 80, s4b: 88, retry: 88, resuming: 92, s4c: 90, s4d: 95, s5: 100 }
// the conversational thread — these stages accumulate as one continuous exchange
const CONVO: Stage[] = ['s1', 's2', 's3', 's4']
const order = (s: Stage) => CONVO.indexOf(s)
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Provisioning must never leave the seal spinning forever — a 10s ceiling falls back
// to the honest retry screen. An infinite spinner is worse than an honest error.
const PROVISION_TIMEOUT_MS = 10000
function provisionOrTimeout(): Promise<{ lovedOneId: string | null; error: string | null }> {
  return Promise.race([
    provisionFamilySpace(),
    new Promise<{ lovedOneId: string | null; error: string | null }>((r) =>
      setTimeout(() => r({ lovedOneId: null, error: 'timeout' }), PROVISION_TIMEOUT_MS)),
  ])
}

// Phase 2 visit catalogue (from closeeye.in — prices shown ONLY when Phase 2 is on).
const VISITS = [
  { id: 'home-wellbeing', name: 'Home Wellbeing Visit', price: 1000, blurb: 'A Guardian visits her at home, checks in with warmth, sends you a personal update.' },
  { id: 'hospital-companion', name: 'Hospital Companion', price: 2000, blurb: 'Someone stays beside her through appointments and recovery — never alone.' },
  { id: 'custom', name: 'Custom Request', price: 500, blurb: 'Groceries, medicines, a festival visit — something only your family understands.' },
]
const inr = (n: number) => '₹' + n.toLocaleString('en-IN')
// capitalise only the first letter — for a lowercase subject at the start of a sentence
const cap1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// The three story cards — they replace every explanatory paragraph and expand in
// place (never navigate away). Copy is fixed; the title alone tells the story.
const STORY_CARDS = [
  { id: 'understand', title: 'Understands your family', link: 'Learn more', body: 'Close Eye learns what matters about the people you love, so every conversation begins with understanding — not assumptions.', tag: 'this is Understanding.' },
  { id: 'support', title: 'Real people, on the ground', link: 'See how', body: 'When understanding isn’t enough, Close Eye helps your family connect with trusted people and professionals.', tag: 'this is Presence.' },
  { id: 'space', title: 'One private Family Space', link: 'Explore', body: 'Memories, conversations, updates, documents and trusted support stay together in one place.', tag: 'this is Trust.' },
]
// "More than care" — only the live capabilities are shown; nothing implied that
// isn't real yet. "Close Eye will grow with your family" carries the rest.
const CARE_CATS = ['Health & wellbeing', 'Trusted local support']

export function ConnectExperience() {
  const router = useRouter()
  const reduce = prefersReduced()
  const [stage, setStageRaw] = React.useState<Stage>('s0')
  const [text, setText] = React.useState('')
  const [rl, setRl] = React.useState<ReadLedger | null>(null)
  const [subject, setSubject] = React.useState('Their')
  const [selfSpace, setSelfSpace] = React.useState(false) // a request for the user themselves — "your space", not "their"
  const [error, setError] = React.useState('')
  const [pending, setPending] = React.useState<'google' | 'email' | null>(null)
  const [showEmail, setShowEmail] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  // what the visitor tells us on the "still open" lines — held, then preserved to the ledger
  const [told, setTold] = React.useState<{ key: string; label: string; body: string }[]>([])
  const [activeKey, setActiveKey] = React.useState<string | null>(null)
  const [fill, setFill] = React.useState('')
  // understanding reveal (the known facts appearing, line by line)
  const [s1n, setS1n] = React.useState(0)
  const [s1live, setS1live] = React.useState(-1)
  const [s1done, setS1done] = React.useState(false)
  // hero unfold — cinematic on first visit, settled at once for returning visitors
  const [heroN, setHeroN] = React.useState(0)
  const [heroSettled, setHeroSettled] = React.useState(false)
  const [openCard, setOpenCard] = React.useState<string | null>(null) // story card expanded in place
  const [deskDrawn, setDeskDrawn] = React.useState(false) // writing-desk rules draw in once, on scroll into view
  const deskRef = React.useRef<HTMLDivElement | null>(null)
  // Phase 2 selection
  const [visit, setVisit] = React.useState(VISITS[0]!)
  const threadRef = React.useRef<HTMLElement | null>(null)
  const activeBeatRef = React.useRef<HTMLDivElement | null>(null)
  const timers = React.useRef<number[]>([])
  const t = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms))
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const setStage = React.useCallback((s: Stage) => {
    setStageRaw(s)
    if (threadRef.current) threadRef.current.style.height = THREAD[s] + '%'
  }, [])

  React.useEffect(() => { if (threadRef.current) threadRef.current.style.height = THREAD.s0 + '%' }, [])
  React.useEffect(() => () => clearTimers(), [])

  // The hero unfolds once, slowly, on a first visit — logo → signature → three
  // feelings → the settled promise → the input wakes. Returning visitors (and
  // reduced-motion) land on the settled headline at once; their time is respected.
  React.useEffect(() => {
    let seen = false
    try { seen = !!window.localStorage.getItem('ce_connect_hero_seen') } catch { /* private mode */ }
    if (seen || reduce) { setHeroN(4); setHeroSettled(true); return }
    const hs: number[] = []
    const at = (ms: number, fn: () => void) => hs.push(window.setTimeout(fn, ms))
    at(500, () => setHeroN(1)); at(1300, () => setHeroN(2)); at(2200, () => setHeroN(3)); at(3100, () => setHeroN(4))
    at(4300, () => setHeroSettled(true))
    try { window.localStorage.setItem('ce_connect_hero_seen', '1') } catch { /* private mode */ }
    return () => hs.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // The writing desk draws its rules in once, when it first enters view — the only
  // motion on the landing, so the eye goes exactly there. Reduced-motion: instant.
  React.useEffect(() => {
    if (reduce || typeof IntersectionObserver === 'undefined') { setDeskDrawn(true); return }
    const el = deskRef.current
    if (!el) { setDeskDrawn(true); return }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setDeskDrawn(true); io.disconnect() }
    }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [stage, reduce]) // re-observe if the desk (re)mounts on return to s0

  // Continuous thread: bring the newly-active beat into view instead of jumping to
  // the top — the conversation stays whole, the eye follows what just changed.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!CONVO.includes(stage)) {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
      const main = document.getElementById('main') // desktop: the right panel is its own scroll container
      if (main) main.scrollTop = 0
      return
    }
    const el = activeBeatRef.current
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }))
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── the counsel, once ── */
  const counselData = React.useMemo(() => (rl ? counsel(rl) : null), [rl])

  /* ── ask → understand ── */
  function ask() {
    const q = text.trim()
    if (q.length < 8) return
    setTold([]); setActiveKey(null); setFill('')
    setRl(readLedger(q))
    setStage('s1')
  }

  /* ── understanding reveal — the known facts appear one by one (✓), then the
        still-open lines settle in (○). Never a percentage; the understanding itself. ── */
  React.useEffect(() => {
    if (stage !== 's1' || !rl) return
    clearTimers(); setS1n(0); setS1live(-1); setS1done(false)
    const known = rl.ledger.filter((l) => !l.quote)
    if (reduce || known.length === 0) { setS1n(known.length); setS1done(true); return }
    known.forEach((_, i) => t(650 + i * 820, () => { setS1n(i + 1); setS1live(i) }))
    t(650 + (known.length - 1) * 820 + 900, () => { setS1live(-1); setS1done(true) })
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
    const rl2 = draft ? readLedger(draft.rawText) : rl
    // lowercase mid-sentence subject ("your mother", "Lakshmi") — capitalised only
    // where it starts a sentence (the seal), never "Your Mother's" mid-sentence.
    setSubject(rl2 ? (rl2.name || (rl2.relationshipWord ? `your ${rl2.relationshipWord}` : rl2.subjectLabel)) : 'their')
    setSelfSpace(rl2 ? !rl2.forLoved : false)
    if (PHASE_2_ENABLED) {
      setStage('resuming')
      const res = await provisionOrTimeout()
      if (res.error || !res.lovedOneId) { setError(recoveryMessage(res.error)); setStage('retry'); return }
      setStage('s4c')
      return
    }
    // Phase 1: seal (with the promise line) while provisioning; only land on success.
    setStage('s5')
    const [res] = await Promise.all([provisionOrTimeout(), delay(reduce ? 0 : 2400)])
    if (res.error || !res.lovedOneId) { setError(recoveryMessage(res.error)); setStage('retry'); return }
    router.replace('/space')
  }
  function recoveryMessage(err: string | null): string {
    if (err === 'not-signed-in') return 'Your sign-in didn’t hold. Nothing is lost — please try once more.'
    if (err === 'network') return 'The connection dropped for a moment. Nothing you told me is lost — try again.'
    if (err === 'timeout') return 'This is taking longer than it should — nothing you told me is lost. Let’s try again.'
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
  const them = rl?.gender === 'he' ? 'him' : rl?.gender === 'she' ? 'her' : 'them'
  // a natural name for the signature "Getting to know …" state (never invented)
  const knowName = rl?.name || (rl?.relationshipWord ? `your ${rl.relationshipWord}` : 'your family')
  // mid-sentence possessive subject — a name stays capitalised ("Lakshmi's"), a
  // relationship reads lowercase in a sentence ("your father's"), not "Your Father's".
  const subjMid = rl?.name || (rl?.relationshipWord ? `your ${rl.relationshipWord}` : rl?.subjectLabel) || ''
  const CHECK = (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
  )

  // The whole flow is one continuous conversation. Back steps to the previous beat;
  // Edit reopens your words; Change the person begins a fresh understanding. Nothing
  // is committed to the immutable ledger until you create the space.
  const PREV: Record<string, Stage> = { s1: 's0', s2: 's1', s3: 's2', s4: 's3', s4b: 's4' }
  function editWords() { setError(''); setStage('s0') }
  function changePerson() {
    clearTimers(); setError(''); setText(''); setRl(null); setTold([]); setActiveKey(null); setFill('')
    setS1n(0); setS1live(-1); setS1done(false); setStage('s0')
  }
  const nav = (
    <div className="cxnav">
      <button type="button" onClick={() => setStage(PREV[stage] || 's0')}>← Back</button>
      <span className="cxnav-r">
        <button type="button" className="edit" onClick={editWords}>Edit</button>
        <button type="button" className="edit" onClick={changePerson}>Change the person</button>
      </span>
    </div>
  )

  /* ── the living understanding — ✓ what I know, ○ what I don't yet. It GROWS as
        you tell me more; it is never a progress bar and never a guess. ── */
  function understanding() {
    if (!rl) return null
    const known = rl.ledger.filter((l) => !l.quote)
    const openBlanks = rl.blanks.filter((b) => !told.some((x) => x.key === b.key))
    const revealing = stage === 's1'
    const interactive = stage === 's2'
    const onLedger = revealing || interactive // the understanding Ledger stage (s1/s2)
    const openReady = !revealing || s1done // during reveal, open lines wait their turn
    const nothingYet = known.length === 0 && openBlanks.length === 0 && told.length === 0
    return (
      <div className="uledger">
        <p className="lh">What I understand{revealing ? '' : ' so far'}</p>
        {nothingYet && (
          <p className="empty">I don’t want to guess. Tell me who this is for — in your own words — and I’ll begin to understand.</p>
        )}
        {openReady && openBlanks.length > 0 && (
          <p className="ulegend"><span className="lg ok">✓</span> what I know<span className="dot-sep">·</span><span className="lg op">○</span> what I don’t yet</p>
        )}
        {known.map((l, i) => (
          <div key={`k${i}`} className={`uline know${!revealing || i < s1n ? ' in' : ''}${revealing && i === s1live ? ' live' : ''}`}>
            <span className="mk" aria-hidden="true">{CHECK}</span>
            <p>{l.label && <span className="lbl">{l.label}</span>}{l.body}{onLedger && <span className="from-words">from your words</span>}</p>
          </div>
        ))}
        {told.map((item) => (
          <div key={`t${item.key}`} className="uline know mem in">
            <span className="mk" aria-hidden="true">{CHECK}</span>
            <p><span className="lbl">{item.label} · you told me</span>{item.body}</p>
          </div>
        ))}
        {onLedger && openReady && known.length > 0 && (
          <p className="ledger-note">Everything above comes from what you wrote — nothing else.</p>
        )}
        {openBlanks.map((b) => (
          interactive ? (
            <React.Fragment key={b.key}>
              <button type="button" className="uline open tap in" onClick={() => { setActiveKey(activeKey === b.key ? null : b.key); setFill('') }}>
                <span className="mk" aria-hidden="true"><span className="cxring" /></span>
                <p>{b.text}<span className="tellme">Tell Connect</span></p>
              </button>
              {activeKey === b.key && (
                <div className="fill">
                  <textarea rows={1} value={fill} onChange={(e) => setFill(e.target.value)} placeholder={FILL_PH[b.key] || 'Tell me as you’d tell a friend…'} autoFocus />
                  <div className="frow">
                    <button type="button" className="save" onClick={() => saveTold(b.key)}>Save</button>
                    <button type="button" className="skip" onClick={() => setActiveKey(null)}>not now</button>
                  </div>
                </div>
              )}
            </React.Fragment>
          ) : (
            <div key={b.key} className={`uline open${openReady ? ' in' : ''}`}>
              <span className="mk" aria-hidden="true"><span className="cxring" /></span>
              <p>{b.text}</p>
            </div>
          )
        ))}
        {interactive && rl.blanks.length > 0 && openBlanks.length === 0 && (
          <p className="later">Thank you — that’s everything I hoped to understand for now.</p>
        )}
      </div>
    )
  }

  const inThread = CONVO.includes(stage)

  // The masthead — the official Close Eye lockup (one connected asset, never rebuilt
  // in code) + CONNECT + the trust triad, centred as one unit. Shared by the mobile
  // header and the desktop left panel.
  function mastheadUnit() {
    return (
      <div className="mast-unit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mast-logo" src="/brand/close-eye-horizontal.svg" alt="Close Eye" width={207} height={40} />
        <div className="mast-tag">Connect</div>
        <p className="mast-triad"><b>Trust</b><span className="sep">·</span><b>Presence</b><span className="sep">·</span><b>Understanding</b></p>
      </div>
    )
  }

  return (
    <>
      <div className="thread"><i ref={threadRef} /></div>
      {/* shell is display:contents below 1024 (mobile untouched) and a two-panel
          grid at ≥1024: a persistent cover on the left, the flow on the right. */}
      <div className="shell">
        {/* LEFT · the cover — desktop only (display:none below 1024). Duplicates the
            promise so it persists across every stage; the mobile column is unchanged. */}
        <aside className="deskcover">
          <div className="dc-mast">{mastheadUnit()}</div>
          <div className="dc-body">
            <h1 className="dc-head">Know the people you love —<br /><em>even from far away.</em></h1>
            <p className="dc-supp">Close Eye helps you stay close — it understands your family, remembers what matters, and brings trusted people when they’re needed.</p>
            <p className="dc-accent">Apps can answer. Close Eye can show up.</p>
            <div className="storycards dc-cards" aria-label="What Close Eye does">
              {STORY_CARDS.map((c) => {
                const on = openCard === c.id
                return (
                  <div key={c.id} className={`scard${on ? ' open' : ''}`}>
                    <button type="button" className="scard-h" aria-expanded={on} onClick={() => setOpenCard(on ? null : c.id)}>
                      <span className="ld" />
                      <span className="scard-t">{c.title}</span>
                      <span className="scard-more">{on
                        ? <span className="scard-x" role="img" aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></span>
                        : `${c.link} →`}</span>
                    </button>
                    <div className="scard-b"><div><p>{c.body}</p><p className="scard-tag">— {c.tag}</p></div></div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="dc-foot">
            <div className="footlinks">
              <a href="https://www.closeeye.in/#how-it-works" target="_blank" rel="noopener">How it works</a><span className="sep">·</span>
              <a href="https://www.closeeye.in/services" target="_blank" rel="noopener">Services &amp; pricing</a><span className="sep">·</span>
              <a href="https://www.closeeye.in/trust-safety" target="_blank" rel="noopener">How Guardians are verified</a><span className="sep">·</span>
              <a href="https://www.closeeye.in/membership" target="_blank" rel="noopener">Membership</a><span className="sep">·</span>
              <a href={WA} target="_blank" rel="noopener">Ask a real person on WhatsApp</a>
            </div>
            <p className="footnote">Your Trusted Presence</p>
          </div>
        </aside>
      <div className="app">
        <header className="mast">{mastheadUnit()}</header>
        <main id="main">

        {/* S0 · HERO (unfolds) · STORY CARDS · ASK (input) · MORE THAN CARE · FOOTER
            Order puts the input within one phone-scroll (hero → cards → input).
            Desktop: a balanced two-field canvas via grid-areas — mobile keeps the
            natural stacked order. */}
        {stage === 's0' && (
          <section className={`stage on s0${heroSettled ? '' : ' unfolding'}`}>
            <div className="s0-hero">
              <div className={`hero${heroSettled ? ' settled' : ''}`}>
                <div className="hero-feels" aria-hidden={heroSettled}>
                  <p className={`feel${heroN >= 2 ? ' in' : ''}`}>You love them.</p>
                  <p className={`feel${heroN >= 3 ? ' in' : ''}`}>You worry about them.</p>
                  <p className={`feel${heroN >= 4 ? ' in' : ''}`}>Distance shouldn’t mean uncertainty.</p>
                </div>
                <h1 className={`h-serif hero-head${heroSettled ? ' in' : ''}`}>Know the people you love —<br /><em>even from far away.</em></h1>
                <p className={`whatis hero-supp${heroSettled ? ' in' : ''}`}>Close Eye helps you stay close — it understands your family, remembers what matters, and brings trusted people when they’re needed.</p>
                <p className={`hero-accent${heroSettled ? ' in' : ''}`}>Apps can answer. Close Eye can show up.</p>
              </div>
            </div>
            <div className="storycards" aria-label="What Close Eye does">
              {STORY_CARDS.map((c) => {
                const on = openCard === c.id
                return (
                  <div key={c.id} className={`scard${on ? ' open' : ''}`}>
                    <button type="button" className="scard-h" aria-expanded={on} onClick={() => setOpenCard(on ? null : c.id)}>
                      <span className="ld" />
                      <span className="scard-t">{c.title}</span>
                      <span className="scard-more">{on
                        ? <span className="scard-x" role="img" aria-label="Close"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></span>
                        : `${c.link} →`}</span>
                    </button>
                    <div className="scard-b"><div><p>{c.body}</p><p className="scard-tag">— {c.tag}</p></div></div>
                  </div>
                )
              })}
            </div>
            <div className="s0-ask">
              <div className={`deskcard${deskDrawn ? ' drawn' : ''}`} ref={deskRef}>
                <p className="exp-k">Experience Close Eye</p>
                <p className="desk-lede">Tell Connect about someone you love.</p>
                <div className="ruled">
                  <span className="pen" aria-hidden="true" />
                  <div className="rules" aria-hidden="true"><span className="rule" /><span className="rule" /><span className="rule" /></div>
                  <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write as you would to a friend…" />
                </div>
                <div className="try">or begin with —
                  <button type="button" onClick={() => setText(SAMPLE)}>“{SAMPLE}”</button>
                  <button type="button" onClick={() => setText(SAMPLE2)}>“{SAMPLE2}”</button>
                </div>
                <div className="act">
                  <p className="desk-hint">One sentence is enough. Connect remembers from there.</p>
                  <button className={`btn${text.trim().length > 0 ? ' inked' : ' ghost'}`} onClick={ask}>Let Connect understand</button>
                  <p className="privacy">Nothing you write is sold or shared. Ever.</p>
                </div>
              </div>
            </div>
            <div className="breadth" aria-label="More than care">
              <p className="breadth-h">More than care.</p>
              <p className="breadth-who">Parents, partners, siblings, children — the people who matter most.</p>
              <p className="breadth-s">Close Eye helps families through everyday life.</p>
              <div className="catgrid">
                {CARE_CATS.map((label) => (
                  <div key={label} className="cat"><span className="cd" />{label}</div>
                ))}
              </div>
              <p className="breadth-grow">Close Eye will grow with your family.</p>
              <p className="breadth-f">Always beginning with understanding.</p>
            </div>
            <div className="s0-foot">
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

        {/* S1–S4 · ONE CONTINUOUS CONVERSATION — nothing resets, everything builds */}
        {inThread && rl && (
          <section className="stage on convo">
            {nav}

            {/* Memory Ribbon — what YOU have told Connect today, kept in view so it's
                clear nothing is lost. Grows as you add; this is what gets preserved. */}
            {told.length > 0 && (
              <div className="ribbon" aria-label="What you told Connect today">
                <p className="ribbon-k">Today · you told me</p>
                <div className="ribbon-items">
                  {told.map((item) => (
                    <span key={item.key} className="rib"><span className="rc" aria-hidden="true">{CHECK}</span>{item.label}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Beat · your words (always present, the root of the thread) */}
            <div className="beat you past">
              <p className="beat-k">You told Connect</p>
              <p className="you-words"><q>{rl.rawText}</q></p>
            </div>

            {/* Beat · understanding (active through s1→s2, then a quiet record) */}
            <div className={`beat${stage === 's1' || stage === 's2' ? ' now' : ' past'}`} ref={stage === 's1' || stage === 's2' ? activeBeatRef : undefined}>
              <div className={`think${stage === 's1' && !s1done ? ' working' : ''}`}><span className="ld" /><span>{
                stage === 's1' && !s1done ? `Getting to know ${knowName}…`
                  : stage === 's2' ? 'Only what helps me care for them — I won’t guess.'
                  : 'Understand first. Answer second.'
              }</span></div>
              {understanding()}
              {stage === 's1' && (
                <div className="act">
                  <button className="btn" onClick={() => setStage(rl.blanks.length ? 's2' : 's3')} style={{ opacity: s1done ? 1 : 0, pointerEvents: s1done ? 'auto' : 'none' }}>That’s exactly it</button>
                </div>
              )}
              {stage === 's2' && (
                <div className="act"><button className="btn" onClick={() => setStage('s3')}>Continue</button></div>
              )}
            </div>

            {/* Beat · the answer (appears when reached; stays visible after) */}
            {order(stage) >= order('s3') && counselData && (
              <div className={`beat${stage === 's3' ? ' now' : ' past'}`} ref={stage === 's3' ? activeBeatRef : undefined}>
                <div className="think" style={{ marginBottom: 14 }}><span className="ld" style={{ animation: 'none' }} /><span>Now I can answer you properly.</span></div>
                <div className="counsel">
                  {counselData.paragraphs.map((p, i) => <p key={i}>{boldLead(p)}</p>)}
                  <p className="sig">{counselData.signature}</p>
                </div>
                <p className="trustline" style={{ marginTop: 20 }}>Sometimes care needs a real person. Close Eye knows when.</p>
                {!rl.aiConfident && <a className="qlink" href={WA} target="_blank" rel="noopener" style={{ marginTop: 10 }}>Talk to a real person on WhatsApp →</a>}
                {stage === 's3' && (
                  <div className="act"><button className="btn" onClick={() => setStage('s4')}>{!rl.aiConfident ? 'Keep this, and continue' : 'This is what I’ve been looking for'}</button></div>
                )}
              </div>
            )}

            {/* Beat · keep it, safely → create the space */}
            {stage === 's4' && (
              <div className="beat now" ref={activeBeatRef}>
                <h1 className="h-serif" style={{ fontSize: 26 }}>{rl.forLoved
                  ? <>Today is where {subjMid}’s<br />story <em>begins.</em></>
                  : <>Today is where your<br />story <em>begins.</em></>}</h1>
                <p className="lede">{rl.forLoved
                  ? `Everything above is kept here — privately, for you. What I know, what I’m still learning, every visit written down.`
                  : 'Everything above is kept here — privately, only for you. What I know, and what I’m still learning.'}</p>
                <p className="trustline">Close Eye never invents information about your family.</p>
                <div className="act">
                  <button className="btn" onClick={() => { saveDraft(); setStage('s4b') }}>{rl.forLoved ? `Create ${subjMid}’s Family Space` : 'Create your space'}</button>
                  <p className="privacy">Private by design. You stay in control.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* S4b · SIGN IN — Google primary, email secondary */}
        {stage === 's4b' && (
          <section className="stage on">
            {nav}
            <h1 className="h-serif" style={{ fontSize: 26 }}>Keep {them} close.<br /><em>Bring the others in.</em></h1>
            <p className="whatis">Sign in so this page is yours alone — then add your family, one by one. The more Connect understands them, <b>the better every answer becomes.</b></p>
            <div className="ledger" style={{ marginTop: 4 }}>
              <p className="lh">With your family added</p>
              <div className="lline in"><span className="ld" /><p>Every answer begins with understanding — never a guess.</p></div>
              <div className="lline in"><span className="ld" /><p>One private Family Space for everyone you love.</p></div>
              <div className="lline in"><span className="ld" /><p>Trusted people, the moment they’re needed.</p></div>
            </div>
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
            <div className="think" style={{ marginTop: 40 }}><span className="ld" /><span>{selfSpace ? 'Opening your space…' : `Opening ${subject}’s space…`}</span></div>
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
            <h1 className="h-serif" style={{ fontSize: 26 }}>{cap1(subject)}’s space is open.<br /><em>Begin with a visit.</em></h1>
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
              <div className="cxring"><span className="ld" /></div>
              <h2>{selfSpace ? 'Your space is open.' : `${cap1(subject)}’s space is open.`}</h2>
              <p>Everything Close Eye understands is kept here, privately — opening it for you now.</p>
              <p className="promise">When you can’t be there, Close&nbsp;Eye can.</p>
            </div>
          </section>
        )}
        </main>
      </div>
      </div>
    </>
  )
}
