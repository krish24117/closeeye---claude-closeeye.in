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
import { GoogleGlyph } from '@/components/ui/google-glyph'
import { requestUnderstanding } from '@/lib/connect/understand-client'
import type { Decision } from '@/lib/connect/pipeline'
import type { Understanding } from '@/lib/connect/comprehension'
import { readRefusal } from '@/lib/platform/refusal'
import { setConnectDraft, getConnectDraft, provisionFamilySpace, buildDraftUnderstanding, saveConnectSession, getConnectSession, clearConnectSession } from '@/lib/db/space'
import { PHASE_2_ENABLED } from '@/lib/connect/phase'
import { emergencyDial, DEFAULT_REGION_CODE } from '@/lib/platform/regions'
import { formatMoney } from '@/lib/platform/currency'
import { CARE_ENABLED } from '@/lib/platform/capability'

const WA = 'https://wa.me/919000221261'
const SAMPLE = 'My mother lives alone and I worry about her. How do I know she’s okay?'
const SAMPLE2 = 'My father gets stressed every year with his tax filing. Can someone help him through it?'
/**
 * THE DEMONSTRATION.
 *
 * Close Eye is a new category, and the one thing that makes it one cannot be explained —
 * only witnessed. Every AI a family has used performs omniscience. This is the first that
 * says "I don't know that yet, and I won't pretend." An explanation of honesty is just a
 * claim; so the input performs it, then hands over the pen.
 *
 * It plays INSIDE the input's own space and gives the pixels back, so the transformation
 * is the hero without the primary action paying for it. It ends on the visitor's turn.
 *
 * The ○ line is the point. Do not remove it to save a beat.
 */
const DEMO_SENTENCE = 'My mother lives alone and I worry about her.'
const DEMO_KNOWS: { mark: 'know' | 'open'; label: string; body: string }[] = [
  { mark: 'know', label: 'Someone you love', body: 'Your mother.' },
  { mark: 'know', label: 'Her days', body: 'She lives alone.' },
  { mark: 'open', label: 'Her health', body: 'I don’t know yet.' }, // ← the category, in one line
]
// The demo closes on the trust line ("nothing is assumed"), matching the approved artifact —
// understanding, then the promise it's all the family's own words. No presence claim.
/** Beat boundaries, ms from start. Typing runs to BEAT.know. */
const BEAT = { type: 1500, know: 1700, answer: 4300, clear: 6200 }
const DEMO_SEEN_KEY = 'closeeye.connect.demo'
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// s1 = the whole understanding→reflection conversation (one async Decision, not staged reveals);
// s4 = the "create your space" beat. Sign-in / provisioning / payment / seal are the tail.
type Stage = 's0' | 's1' | 's4' | 's4b' | 's4c' | 's4d' | 's5' | 'resuming' | 'retry'
const THREAD: Record<Stage, number> = { s0: 8, s1: 48, s4: 80, s4b: 88, retry: 88, resuming: 92, s4c: 90, s4d: 95, s5: 100 }
// the conversational thread — the beats a person moves through in one continuous exchange
const CONVO: Stage[] = ['s1', 's4']
// the stable resting points a refresh can safely restore to (transient stages —
// sign-in, provisioning, retry, seal — are never persisted as the resume point)
const STABLE: Stage[] = ['s0', 's1']
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A value is genuinely known — not the engine's "unknown" / "none_stated" sentinels. */
const KNOWN = (s: string | undefined): boolean => !!s && s !== 'unknown' && s !== 'none_stated'
const understandingOf = (d: Decision | null): Understanding | null =>
  d && 'understanding' in d ? d.understanding : null

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
  { id: 'home-wellbeing', name: 'Home Wellbeing Visit', price: 1000, blurb: 'A companion visits her at home, checks in with warmth, sends you a personal update.' },
  { id: 'hospital-companion', name: 'Hospital Companion', price: 2000, blurb: 'Someone stays beside her through appointments and recovery — never alone.' },
  { id: 'custom', name: 'Custom Request', price: 500, blurb: 'Groceries, medicines, a festival visit — something only your family understands.' },
]
const inr = (n: number) => formatMoney(n, DEFAULT_REGION_CODE)
// capitalise only the first letter — for a lowercase subject at the start of a sentence
const cap1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// The three story cards — they replace every explanatory paragraph and expand in
// place (never navigate away). Copy is fixed; the title alone tells the story.
// The four pillars of the family-intelligence system (design-approved artifact). Static
// icon-badge cards — each states the capability + one real demonstration. Presence (Care) is
// appended only when CARE_ENABLED — a phase-2 capability, never promised on the global door.
const CAP_ICON: Record<string, React.ReactElement> = {
  understand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7z" /><path d="M9 12l2 2 4-4" /></svg>,
  remember: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>,
  notice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /></svg>,
  protect: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /></svg>,
  support: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M11 13l2 2 4-4" /><path d="M20.5 12a8.5 8.5 0 10-8.5 8.5" /></svg>,
}
const STORY_CARDS: { id: string; icon: string; title: string; body: string; demo: React.ReactNode }[] = [
  { id: 'understand', icon: 'understand', title: 'Understands your family', body: 'Reads what you mean, not just what you type — so a person is never mistaken for a place.', demo: <>“my mother” → <b>a person</b>, not a city.</> },
  { id: 'remember', icon: 'remember', title: 'Remembers what matters', body: 'Holds every fact, photo and moment your family shares — for years, in one place.', demo: <>Recalls <b>Siyah’s birthday</b> next March.</> },
  { id: 'notice', icon: 'notice', title: 'Notices what’s changed', body: 'Surfaces what’s gone quiet or shifted across everyone you love — before you have to ask.', demo: <>“It’s been 3 weeks since <b>your father’s</b> update.”</> },
  { id: 'protect', icon: 'protect', title: 'Private by design', body: 'Never invents. Your family’s life stays yours alone — only ever seen by you.', demo: <><b>Deterministic</b> safety on every message.</> },
  ...(CARE_ENABLED ? [{ id: 'support', icon: 'support', title: 'Real people, on the ground', body: 'When understanding isn’t enough, Close Eye brings trusted people and professionals to your family.', demo: <>A verified person, <b>when you need one</b>.</> }] : []),
]
// Breadth — the parts of family life Close Eye holds intelligence for. Honest, Connect-native
// (no Care/presence claim on the global door). "Close Eye will grow with your family" carries the rest.
const CARE_CATS = ['Health & wellbeing', 'Everyday life', 'Memories & milestones']

// The family-graph illustration (design-approved artifact) — a sample of what Close Eye holds:
// everyone you love, known facts (●) and what it's still learning (○). Illustrative, pre-sign-in.
const FGRAPH: { id: string; av: string; name: string; facts: { t: string; open?: boolean }[] }[] = [
  { id: 'm', av: 'M', name: 'Mother', facts: [{ t: 'Lives alone' }, { t: 'Loves her morning coffee' }, { t: 'Her health — learning', open: true }] },
  { id: 'f', av: 'F', name: 'Father', facts: [{ t: 'Retired · gardening' }, { t: 'Blood-pressure tablet — mornings' }, { t: 'His routine — learning', open: true }] },
  { id: 's', av: 'S', name: 'Siyah', facts: [{ t: 'Turns 6 · March 12' }, { t: 'Photos & memories kept' }, { t: 'School year — learning', open: true }] },
]


export function ConnectExperience() {
  const router = useRouter()
  const reduce = prefersReduced()
  const [stage, setStageRaw] = React.useState<Stage>('s0')
  const [text, setText] = React.useState('')                  // the accumulating input (original + any clarifying answers)
  const [decision, setDecision] = React.useState<Decision | null>(null) // the verified understanding, from /api/understand
  const [thinking, setThinking] = React.useState(false)       // an async comprehension call is in flight
  const [answer, setAnswer] = React.useState('')              // the visitor's reply to a single clarifying question
  const [subject, setSubject] = React.useState('Their')
  const [selfSpace, setSelfSpace] = React.useState(false) // a request for the user themselves — "your space", not "their"
  const [error, setError] = React.useState('')
  const [pending, setPending] = React.useState<'google' | 'email' | null>(null)
  const [showEmail, setShowEmail] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  // hero unfold — cinematic on first visit, settled at once for returning visitors
  const [heroN, setHeroN] = React.useState(0)
  const [heroSettled, setHeroSettled] = React.useState(false)
  /* ── the demonstration ──
     phase 0 nothing · 1 writing · 2 understanding · 3 answering · 4 her turn (settled).
     It NEVER runs for someone who has seen it, or who asked for less motion, or who has
     already started typing — the demo exists to invite a first sentence, and once she is
     writing it would only be in the way. */
  const [demo, setDemo] = React.useState(0)
  const [typed, setTyped] = React.useState('')
  const demoDone = demo >= 4
  /* The timers must be killable from outside the effect. Skipping is not a dependency
     change, so the effect's own cleanup never runs — and the queued beats would resurrect
     the demo a second after she touched the paper, taking the pen back out of her hand.
     Once she reaches for it, the demonstration is over for good. */
  const demoTimers = React.useRef<ReturnType<typeof setTimeout>[]>([])
  const skipDemo = React.useCallback(() => {
    demoTimers.current.forEach(clearTimeout)
    demoTimers.current = []
    setDemo(4); setTyped('')
    try { sessionStorage.setItem(DEMO_SEEN_KEY, '1') } catch { /* private mode */ }
  }, []) // story card expanded in place
  const [signedIn, setSignedIn] = React.useState(false) // a returning, already-signed-in visitor
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

  /* The demo's timeline. One effect, one set of timers, cleared on unmount or skip. */
  React.useEffect(() => {
    // The card is opacity:0 while the hero unfolds (.stage.unfolding .s0-ask). Starting
    // the demo before then plays it to an empty screen — it must begin when she can see it.
    if (stage !== 's0' || !heroSettled) return
    let seen = false
    try { seen = sessionStorage.getItem(DEMO_SEEN_KEY) === '1' } catch { /* private mode */ }
    // Reduced motion, a returning visitor, or a visitor already writing: no demo, no delay.
    if (reduce || seen || text.trim()) { setDemo(4); return }
    const t = demoTimers.current
    const chars = DEMO_SENTENCE.length
    setDemo(1)
    for (let i = 1; i <= chars; i++) t.push(setTimeout(() => setTyped(DEMO_SENTENCE.slice(0, i)), (BEAT.type / chars) * i))
    t.push(setTimeout(() => setDemo(2), BEAT.know))
    t.push(setTimeout(() => setDemo(3), BEAT.answer))
    t.push(setTimeout(() => {
      setDemo(4); setTyped('')
      try { sessionStorage.setItem(DEMO_SEEN_KEY, '1') } catch { /* private mode */ }
    }, BEAT.clear))
    return () => { t.forEach(clearTimeout); demoTimers.current = [] }
  }, [stage, reduce, heroSettled]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── the one comprehension call — real understanding from /api/understand, never a
        local re-parse. ALWAYS returns a safe Decision (transport failure degrades to "ask"),
        so the UI never crashes and never fabricates. ── */
  const runUnderstand = React.useCallback(async (input: string) => {
    setThinking(true)
    try { setDecision(await requestUnderstanding(input)) }
    finally { setThinking(false) }
  }, [])

  /* ── ask → understand (from the landing) ── */
  function ask() {
    const q = text.trim()
    if (q.length < 8 || thinking) return
    setDecision(null); setAnswer('')
    setStage('s1')
    void runUnderstand(q)
  }

  /* ── one honest clarifying question at a time: the visitor's reply is appended to the
        original words and the whole thing is re-understood. No fabricated list of blanks. ── */
  function clarify() {
    const extra = answer.trim()
    if (!extra || thinking) return
    const combined = `${text.trim()}. ${extra}`.trim()
    setText(combined)
    setAnswer('')
    void runUnderstand(combined)
  }

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

  /* ── returning visitor: if they're already signed in (and not mid-OAuth), offer
        a quiet path back to their Family Space. ── */
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') || params.has('error')) return // the OAuth return effect owns this
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) setSignedIn(!!data.session) }).catch(() => {})
    return () => { alive = false }
  }, [])

  /* ── restore the words after a refresh — so it never feels like Connect forgot. We restore
        the typed text at the landing; comprehension re-runs freshly on submit. We never rebuild
        a stale Decision from an old string. Never runs over an OAuth return. ── */
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') || params.has('error')) return
    const s = getConnectSession()
    if (s?.text) setText(s.text)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── autosave the typed words to localStorage so a refresh recovers them. ── */
  React.useEffect(() => {
    if (!STABLE.includes(stage)) return
    if (text.trim()) saveConnectSession({ text, stage, told: [], againCount: 0 })
  }, [text, stage])

  /* ── provision + branch by phase. NEVER navigates to an empty Space; a failure
        surfaces a calm retry with the draft intact. ── */
  async function finishAndProvision() {
    // Name the seal / "opening …" screens from the VERIFIED understanding carried in the draft —
    // never a re-parse. du.name is already lowercased mid-sentence ("your mother", "Amma").
    const du = getConnectDraft()?.u
    setSubject(du ? (du.isSelf ? 'your' : du.name) : 'their')
    setSelfSpace(du ? du.isSelf : false)
    // Only a real error retries. `{error:null, lovedOneId:null}` means the draft was
    // ALREADY provisioned — e.g. a slow first attempt finished after our 10s timeout
    // and cleared the draft — so the space now exists; proceed instead of looping.
    // (/space self-corrects to /connect if somehow absent.)
    if (PHASE_2_ENABLED) {
      setStage('resuming')
      const res = await provisionOrTimeout()
      if (res.error) { setError(recoveryMessage(res.error)); setStage('retry'); return }
      setStage('s4c')
      return
    }
    // Phase 1: seal (with the promise line) while provisioning; only land on success.
    setStage('s5')
    const [res] = await Promise.all([provisionOrTimeout(), delay(reduce ? 0 : 2400)])
    if (res.error) { setError(recoveryMessage(res.error)); setStage('retry'); return }
    clearConnectSession() // the conversation is now a real Family Space — done
    router.replace('/space')
  }
  function recoveryMessage(err: string | null): string {
    if (err === 'not-signed-in') return 'Your sign-in didn’t hold. Nothing is lost — please try once more.'
    if (err === 'network') return 'The connection dropped for a moment. Nothing you told me is lost — try again.'
    if (err === 'timeout') return 'This is taking longer than it should — nothing you told me is lost. Let’s try again.'
    return 'Something interrupted us — but everything you told me is safe. Let’s try again.'
  }

  // preserve the words AND the verified understanding through the sign-in round-trip, so
  // provisioning names the Space from truth (buildDraftUnderstanding), never a re-parse.
  function saveDraft() {
    const u = understandingOf(decision)
    if (u) setConnectDraft(text, [], buildDraftUnderstanding(u))
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
  /* ── returning sign-in (no draft): straight to Google, land on the Family Space.
        No new person is created — /space shows their space (or routes on if none). ── */
  async function signInReturning() {
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/space`, queryParams: { prompt: 'select_account' } },
      })
      if (err) setError('Sign-in couldn’t start. Please try again.')
    } catch { setError('We couldn’t reach the sign-in service. Check your connection and try again.') }
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
        if (!up.session) { setPending(null); return setError('Account created — confirm the link in your email, then come back here and sign in. Everything you told me is saved.') }
      }
    } catch { setPending(null); return setError('We couldn’t reach the server. Check your connection and try again.') }
    setPending(null)
    await finishAndProvision()
  }

  /* ── Phase 2 payment (dark until launch; verify with live keys on 15 Aug) ── */
  async function payVisit() {
    if (!PHASE_2_ENABLED) return
    setPending('email')
    const du = getConnectDraft()?.u
    const { data: auth } = await supabase.auth.getUser()
    const { data: br, error: brErr } = await supabase.functions.invoke('submit-booking-request', {
      body: { service_id: visit.id, recipient_name: du?.name, city: du?.city },
    })
    // A guard that turns us away wrote honest words that offer a person — show those,
    // not our generic "try again shortly".
    if (brErr) {
      const refusal = await readRefusal(brErr)
      if (refusal) { setPending(null); setError(refusal.message); return }
    }
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
  // The current verified understanding + its storable shape (names, self/loved), derived once.
  const u = understandingOf(decision)
  const cdu = u ? buildDraftUnderstanding(u) : null
  const them = 'them' // gender is never inferred — the safe, non-misgendering default
  // mid-sentence subject — "your mother" / "Amma"; used by the "story begins" + seal beats.
  const subjMid = cdu ? (cdu.isSelf ? 'you' : cdu.name) : 'your family'
  const forLoved = cdu ? !cdu.isSelf : true
  const personKnown = !!u && KNOWN(u.subject.who)
  const truncate = (s: string, n = 72) => { const t = s.trim().replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }
  const CHECK = (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
  )

  // The whole flow is one continuous conversation. Back steps to the previous beat;
  // Edit reopens your words; Change the person begins a fresh understanding. Nothing
  // is committed to the immutable ledger until you create the space.
  const PREV: Record<string, Stage> = { s1: 's0', s4: 's1', s4b: 's4' }
  function editWords() { setError(''); setStage('s0') }
  function changePerson() {
    clearConnectSession() // a fresh start — drop the saved conversation
    clearTimers(); setError(''); setText(''); setDecision(null); setAnswer(''); setStage('s0')
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

  /* ── the living understanding — ✓ what I know, ○ what I don't yet. Rendered from the
        VERIFIED Understanding (/api/understand); every ✓ line traces to the family's words,
        never an inference. It is never a progress bar and never a guess. ── */
  function hasKnown(cu: Understanding): boolean {
    return KNOWN(cu.subject.who) || KNOWN(cu.situation) ||
      !!(cu.locations.from || cu.locations.to || cu.locations.lives_in) || cu.facts.length > 0
  }
  function understandingLedger(cu: Understanding) {
    const rows: { mark: '✓' | '○'; label: string; body: string; open?: boolean }[] = []
    if (KNOWN(cu.subject.who)) rows.push({ mark: '✓', label: 'Someone you love', body: cu.subject.who })
    else rows.push({ mark: '○', label: 'Who this is', body: 'still to know', open: true })
    if (KNOWN(cu.situation)) rows.push({ mark: '✓', label: 'What’s happening', body: cu.situation })
    const loc = [
      cu.locations.from && `from ${cu.locations.from}`,
      cu.locations.to && `to ${cu.locations.to}`,
      cu.locations.lives_in && `lives in ${cu.locations.lives_in}`,
    ].filter(Boolean).join(' · ')
    if (loc) rows.push({ mark: '✓', label: 'Where', body: loc })
    // the family's exact words — never a line whose value duplicates the situation already shown
    for (const f of cu.facts) if (f.value !== cu.situation) rows.push({ mark: '✓', label: f.label, body: f.value })
    const allStated = rows.every((r) => r.mark === '✓')
    return (
      <div className="uledger">
        <p className="lh">What I understand</p>
        {rows.map((r, i) => (
          <div key={i} className={`uline ${r.mark === '✓' ? 'know' : 'open'} in`}>
            <span className="mk" aria-hidden="true">{r.mark === '✓' ? CHECK : <span className="cxring" />}</span>
            <p><span className="lbl">{r.label}</span>{r.body}<span className="from-words">{r.mark === '✓' ? 'from your words' : 'tell me'}</span></p>
          </div>
        ))}
        {allStated && rows.length > 0 && <p className="ledger-note">Everything above comes from what you wrote — nothing else.</p>}
      </div>
    )
  }

  /* ── the conversation body — one Decision, rendered by lane. Crisis escalates (deterministic,
        already ran first); unsure asks ONE honest question; understood shows the ledger + a
        grounded reflection, then opens the space. Never fabricates, never a wall of blanks. ── */
  function conversationBody() {
    if (thinking) return <div className="think working"><span className="ld" /><span>Reading your words…</span></div>
    if (!decision) return null

    if (decision.lane === 'escalate') {
      // A signed-out visitor has no known region. On the India front door (closeeye.in) we can
      // safely offer 108; on the GLOBAL front door (closeeye.app) we NEVER show a country's number
      // we aren't sure of — the honest, universally-safe instruction is "your local emergency
      // number". Showing the wrong country's number in a real emergency is a life-safety failure.
      const host = typeof window !== 'undefined' ? window.location.hostname : ''
      const india = /(^|\.)closeeye\.in$/i.test(host)
      const d = india ? emergencyDial('IN') : null
      return (
        <div className="counsel">
          <p><b>This sounds urgent.</b> {decision.safety.message || 'Please get help now.'}</p>
          {d?.href
            ? <a className="dial" href={d.href}>{d.text}</a>
            : <span className="dial">Call your local emergency number now.</span>}
          <a className="wa-prominent" href={WA} target="_blank" rel="noopener">Reach a real person now →</a>
        </div>
      )
    }
    if (decision.lane === 'decline') {
      return (
        <div className="counsel">
          <p>Hello — I’m here for the people you love. Tell me about one of them, and I’ll begin to understand.</p>
          <div className="act"><button className="btn" onClick={editWords}>Tell Connect about someone →</button></div>
        </div>
      )
    }

    const cu = decision.understanding
    if (decision.lane === 'medical') {
      // Close Eye is not a medical AI. Honest decline → a doctor for anything clinical, and a
      // trusted person Close Eye CAN bring. Never a symptom read, a dose, or a diagnosis.
      const obj = personKnown ? subjMid : 'them'
      const poss = obj === 'you' ? 'your' : obj === 'them' ? 'their' : `${obj}’s`
      return (
        <div className="counsel">
          <p><b>Close Eye doesn’t give medical advice.</b> For anything clinical — a symptom, a dose, a reading, a medication — a doctor is the right person; they know {poss} full health picture.</p>
          <p>What Close Eye can do is remember what matters about {obj} and help you think it through, so you walk into that conversation prepared.</p>
          {CARE_ENABLED && <a className="wa-prominent" href={WA} target="_blank" rel="noopener">Talk to a real person on WhatsApp →</a>}
        </div>
      )
    }
    if (decision.lane === 'ask') {
      // Unsure → show what we DO understand, then ONE honest question. No fabricated list of blanks.
      return (
        <>
          {hasKnown(cu) && understandingLedger(cu)}
          <div className="again" style={{ marginTop: 12 }}>
            <p className="fixhint">{decision.question}</p>
            <textarea className="again-ta" rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="Tell me in your words…" autoFocus />
            <div className="act"><button type="button" className={`btn${answer.trim() ? ' inked' : ' ghost'}`} onClick={clarify}>Tell Connect more</button></div>
            {CARE_ENABLED && <a className="wa-prominent" href={WA} target="_blank" rel="noopener">Talk to a real person on WhatsApp →</a>}
          </div>
        </>
      )
    }

    // answer | care — understood: the ledger, a grounded reflection, then create the space.
    return (
      <>
        {understandingLedger(cu)}
        {cu.reflection && <div className="counsel" style={{ marginTop: 14 }}><p>{boldLead(cu.reflection)}</p></div>}
        {decision.lane === 'care' && (
          CARE_ENABLED
            ? <p className="trustline" style={{ marginTop: 16 }}>It sounds like you’d like someone there. Close Eye can arrange it.</p>
            // Care is a phase-2 launch — acknowledge the wish for presence WITHOUT promising a
            // service that isn't live yet, and without the India-only WhatsApp CTA below.
            : <p className="trustline" style={{ marginTop: 16 }}>It sounds like you’d like someone there. Real-world presence is arriving region by region — I’ll tell you the moment Close Eye can be there for your family.</p>
        )}
        <div className="act">
          <button className="btn" onClick={() => setStage('s4')}>This is what I’ve been looking for</button>
          {decision.lane === 'care' && CARE_ENABLED && <a className="qlink" href={WA} target="_blank" rel="noopener" style={{ marginTop: 10 }}>Talk to a real person on WhatsApp →</a>}
        </div>
      </>
    )
  }


  const inThread = CONVO.includes(stage)

  // The masthead — the official Close Eye lockup (one connected asset, never rebuilt
  // in code) + CONNECT + the trust triad, centred as one unit. Shared by the mobile
  // header and the desktop left panel.
  /* ── ONE source per block, composed differently per breakpoint ──
     The story cards and the footer were written out twice — once in the desktop cover,
     once in the column — as byte-identical JSX. Two copies of a thing are two chances to
     change one and forget the other, which had already happened to the footer. The
     LAYOUTS stay distinct (the cover is a persistent panel; the column is a flow); only
     the duplicated markup goes. */
  function storyCards(extra?: string) {
    return (
      <div className={`storycards${extra ? ` ${extra}` : ''}`} aria-label="What Close Eye does">
        {STORY_CARDS.map((c) => (
          <div key={c.id} className="scard">
            <span className="scard-ic" aria-hidden="true">{CAP_ICON[c.icon]}</span>
            <h3 className="scard-t">{c.title}</h3>
            <p className="scard-body">{c.body}</p>
            <p className="scard-demo">{c.demo}</p>
          </div>
        ))}
      </div>
    )
  }

  /* Separators are rendered by CSS (::after), never as elements: a separator that is its
     own node can wrap onto the next line and sit there alone, which is exactly what it
     did at 1024 and 1728. */
  function footerLinks() {
    // GLOBAL Connect footer — Family-Intelligence, not Care. India-specific Care links (companion
    // vetting, visit pricing/date, WhatsApp-a-human) are shown only when Care is live in the region.
    return (
      <div className="footlinks">
        <a href="/how-it-works">How it works</a>
        {CARE_ENABLED && <a href="/how-companions-are-verified">How companions are verified</a>}
        <a href="/privacy">Privacy</a>
        <a className="last" href="/terms">Terms</a>
      </div>
    )
  }

  function mastheadUnit() {
    return (
      <div className="mast-unit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mast-logo" src="/brand/close-eye-horizontal.svg" alt="Close Eye" width={207} height={40} />
        <div className="mast-tag">Connect</div>
      </div>
    )
  }

  return (
    <>
      <div className="thread"><i ref={threadRef} /></div>
      {/* Desktop sign-in — the standard top-right of the whole viewport, where the
          full "Already with us? Sign in" always fits without colliding with the
          centred lockup or the flow card. Hidden below 1024, where the .mast corner
          shows "Sign in" alone (the 480px column has no room for the prefix). */}
      {stage === 's0' && !signedIn && (
        <span className="shell-signin"><span className="msi-pre">Already with us?</span><button type="button" className="msi-link" onClick={signInReturning}>Sign in</button></span>
      )}
      {/* shell is display:contents below 1024 (mobile untouched) and a two-panel
          grid at ≥1024: a persistent cover on the left, the flow on the right. */}
      <div className="shell">
        {/* LEFT · the cover — desktop only (display:none below 1024). Duplicates the
            promise so it persists across every stage; the mobile column is unchanged. */}
        <aside className="deskcover">
          <div className="dc-mast">
            {mastheadUnit()}
            {stage === 's0' && signedIn && (
              <p className="welcome-back"><a href="/space" onClick={(e) => { e.preventDefault(); router.push('/space') }}>Welcome back — your Family Space →</a></p>
            )}
          </div>
          <div className="dc-body">
            <h1 className="dc-head">The intelligence that knows<br />the people you <em>love.</em></h1>
            <p className="dc-supp">Close Eye understands your family, remembers what matters, and notices what’s changed — so you’re never left guessing from far away.</p>
            <p className="dc-accent">Apps answer. Close Eye understands — and remembers.</p>
            {storyCards('dc-cards')}
          </div>
          <div className="dc-foot">
            {footerLinks()}
            <p className="footnote">Your Trusted Presence</p>
          </div>
        </aside>
      <div className="app">
        <header className="mast">
          {mastheadUnit()}
          {stage === 's0' && !signedIn && (
            <span className="mast-signin"><span className="msi-pre">Already with us?</span><button type="button" className="msi-link" onClick={signInReturning}>Sign in</button></span>
          )}
        </header>
        {stage === 's0' && signedIn && (
          <p className="welcome-back">Welcome back — <a href="/space" onClick={(e) => { e.preventDefault(); router.push('/space') }}>your Family Space →</a></p>
        )}
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
                {/* HERO — one responsibility: the emotional promise. It used to say
                    "Know the people you love — even from far away", which the card then
                    repeated as "When someone you love is far away". One feeling, once. */}
                <h1 className={`h-serif hero-head${heroSettled ? ' in' : ''}`}>The intelligence that knows<br />the people you <em>love.</em></h1>
                {/* CATEGORY — the sentence that teaches the mental model. "before it answers"
                    is what separates this from every AI she has met; the family-intelligence
                    framing (understands · remembers) replaces the old presence promise. */}
                <p className={`whatis hero-cat${heroSettled ? ' in' : ''}`}>Close Eye understands your family <b>before it answers</b> — and remembers what matters, privately, for years.</p>
              </div>
            </div>
            <div className="s0-ask">
              {/* THE TRANSITION. Not the label I removed — that one sat INSIDE the card,
                  naming a section on a one-section card. This one has a job: it turns
                  "here is what Close Eye is" into "now experience it", and it introduces
                  Connect one beat before the button uses the word. It also does
                  permanently what the demo's "Now —" did for six seconds, so the handoff
                  no longer depends on an animation a visitor may never see. */}
              <p className={`exp-k s0-lead${heroSettled ? ' in' : ''}`}>Experience Close Eye Connect</p>
              <div className={`deskcard${deskDrawn ? ' drawn' : ''}`} ref={deskRef}>
                {/* No "EXPERIENCE CLOSE EYE" label — a section label on a card with one
                    section. No lede, no sub: the hero above says it once, and the demo
                    below shows it. What remains is the thing itself. */}
                <div className="ruled" onPointerDown={demoDone ? undefined : skipDemo}>
                  <span className="pen" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4.5-1L20 7.5 16.5 4 5 15.5z" /><path d="M14.5 6L18 9.5" /></svg></span>
                  {/* During the demo the box shows ITS sentence and cannot be typed in; the
                      first touch anywhere on the paper hands it straight back. */}
                  {/* While the demo writes, the box is hidden from assistive tech AND
                      taken out of the tab order — aria-hidden on a tabbable field means a
                      screen-reader user can land on an input that officially isn't there.
                      Tab reaches it the moment it's hers; focus alone ends the demo. */}
                  <textarea rows={3} value={demoDone ? text : typed} readOnly={!demoDone}
                    onChange={(e) => setText(e.target.value)}
                    onFocus={demoDone ? undefined : skipDemo}
                    aria-hidden={!demoDone} tabIndex={demoDone ? 0 : -1}
                    placeholder="Tell Close Eye about someone you love…" />
                </div>
                {/* THE DEMONSTRATION. Understanding, then the answer — in that order,
                    because that order IS the product. It borrows this space and gives it
                    back: the ○ line is the two seconds that define the category. */}
                <div className={`demo${demo >= 4 ? ' settled' : ''}`} aria-hidden="true">
                  <p className="demo-h">What I understand</p>
                  <div className="demo-know">
                    {DEMO_KNOWS.map((k, i) => (
                      <div key={k.label} className={`dline ${k.mark}${demo >= 2 ? ' in' : ''}`} style={{ transitionDelay: `${i * 260}ms` }}>
                        <span className="dm">{k.mark === 'know' ? CHECK : <span className="cxring" />}</span>
                        <div className="dbody">
                          <p className="drow"><span className="dl">{k.label}</span><span className="dprov">{k.mark === 'know' ? 'from your words' : 'tell me'}</span></p>
                          <p className="dval">{k.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className={`demo-note${demo >= 3 ? ' in' : ''}`}>Everything above is your words. Nothing is assumed.</p>
                </div>
                <div className="act">

                  <button className={`btn${text.trim().length > 0 ? ' inked' : ' ghost'}`} onClick={ask}>Let Connect understand</button>
                  {/* Two lines became one, and it moved ABOVE nothing — it sits with the
                      act it enables rather than after it. */}
                  <p className="privacy">Private. One sentence is enough.</p>
                  {error && <p className="privacy" style={{ color: 'hsl(var(--error))' }}>{error}</p>}
                </div>
              </div>
            </div>
            {storyCards()}
            <section className="fgraph" aria-label="Your family graph">
              <p className="fg-k">Your family graph</p>
              <h2 className="fg-h">The private intelligence only your family has.</h2>
              <p className="fg-sub">Everyone you love, everything Close Eye has learned, and what it’s still getting to know — growing every time you tell it something.</p>
              <div className="fg-nodes">
                {FGRAPH.map((n) => (
                  <div key={n.id} className="fg-node">
                    <div className="fg-nm"><span className="fg-av" aria-hidden="true">{n.av}</span>{n.name}</div>
                    <div className="fg-facts">
                      {n.facts.map((f, i) => (
                        <span key={i} className={`fg-fct${f.open ? ' open' : ''}`}><span className="fg-d" aria-hidden="true" />{f.t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <div className="breadth" aria-label="For the whole family">
              <p className="breadth-h">For the whole family.</p>
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
              {footerLinks()}
              <p className="footnote">Your Trusted Presence</p>
            </div>
          </section>
        )}

        {/* S1 · THE CONVERSATION — one Decision from /api/understand: understanding first, then
            a grounded reflection (or one honest question). Nothing resets between turns. */}
        {stage === 's1' && (
          <section className="stage on convo">
            {nav}

            {/* Beat · your words — the root of the thread, kept as one calm line */}
            {text.trim() && (
              <div className="beat you collapsed">
                <p className="beat-line"><span className="bk">You told Connect</span><q className="clamp">{truncate(text)}</q><button type="button" className="mini-edit" onClick={editWords}>Edit</button></p>
              </div>
            )}

            {/* Beat · understanding / answer — the whole verified Decision */}
            <div className="beat now" ref={activeBeatRef}>
              {conversationBody()}
            </div>
          </section>
        )}

        {/* S4 · KEEP IT → create the space (only once a real person is understood) */}
        {stage === 's4' && personKnown && (
          <section className="stage on convo">
            {nav}
            <div className="beat now" ref={activeBeatRef}>
              <h1 className="h-serif" style={{ fontSize: 26 }}>{forLoved
                ? <>Today is where {subjMid}’s<br />story <em>begins.</em></>
                : <>Today is where your<br />story <em>begins.</em></>}</h1>
              {/* The Space timeline holds what Connect understood and what the family tells it —
                  never a record we don't keep. */}
              <p className="lede">{forLoved
                ? `Everything above is kept here — privately, for you. What I know about ${subjMid}, and what I’m still learning.`
                : 'Everything above is kept here — privately, only for you. What I know, and what I’m still learning.'}</p>
              <p className="trustline">Close Eye never invents information about your family.</p>
              <div className="act">
                <button className="btn" onClick={() => { saveDraft(); setStage('s4b') }}>{forLoved ? `Create ${subjMid}’s Family Space` : 'Create your space'}</button>
                <p className="privacy">Private by design. You stay in control.</p>
              </div>
            </div>
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
                <GoogleGlyph />
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
            <p className="lede">A verified companion goes to {them}. You receive a written report on WhatsApp.</p>
            <a className="qlink" href="/how-companions-are-verified">How companions are verified →</a>
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
            <p className="lede"><a href="/cancellation-policy" target="_blank" rel="noopener" style={{ color: 'inherit', borderBottom: '1px dotted var(--hair2)', textDecoration: 'none' }}>Cancel or reschedule</a> any time before the visit. <a href="/refund-policy" target="_blank" rel="noopener" style={{ color: 'inherit', borderBottom: '1px dotted var(--hair2)', textDecoration: 'none' }}>Full refund</a>.</p>
            <div className="paysum">
              <div className="prow"><span className="k">For</span><span className="v">{subject}{cdu?.city ? ` · ${cdu.city}` : ''}</span></div>
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
