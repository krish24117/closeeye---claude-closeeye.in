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
import { readLedger, counsel, understandingSummary, KEY_LABEL, type ReadLedger } from '@/lib/connect/ledger'
import { logUnderstanding, newUnderstandingSession } from '@/lib/connect/log'
import { CONVERSATION_BUDGET } from '@/lib/platform/trust'
import { readRefusal } from '@/lib/platform/refusal'
import { setConnectDraft, getConnectDraft, provisionFamilySpace, saveConnectSession, getConnectSession, clearConnectSession } from '@/lib/db/space'
import { PHASE_2_ENABLED } from '@/lib/connect/phase'
import { emergencyDial, DEFAULT_REGION_CODE } from '@/lib/platform/regions'

const WA = 'https://wa.me/919000221261'
const SAMPLE = 'My mother lives alone in Hyderabad. How do I know she’s okay?'
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
const DEMO_SENTENCE = 'Amma lives alone in Hyderabad and I worry about her.'
const DEMO_KNOWS: { mark: 'know' | 'open'; label: string; body: string }[] = [
  { mark: 'know', label: 'Someone you love', body: 'Amma.' },
  { mark: 'know', label: 'Her days', body: 'She lives alone, in Hyderabad.' },
  { mark: 'open', label: 'Her health', body: 'I don’t know yet.' }, // ← the category, in one line
]
const DEMO_ANSWER = 'Because she lives alone, what I’d put in place is a gentle rhythm — a trusted person who can be there in a way a phone call can’t.'
/** Beat boundaries, ms from start. Typing runs to BEAT.know. */
const BEAT = { type: 1500, know: 1700, answer: 4300, clear: 6200 }
const DEMO_SEEN_KEY = 'closeeye.connect.demo'
// warm, specific prompts for the moment a line is empty — "tell me something only
// your family would know." Pronoun-free so they never mis-gender anyone.
const FILL_PH: Record<string, string> = {
  city: 'A city or neighbourhood is enough',
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
// the stable resting points a refresh can safely restore to (transient stages —
// sign-in, provisioning, retry, seal — are never persisted as the resume point)
const STABLE: Stage[] = ['s0', 's1', 's2', 's3', 's4']
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
  { id: 'home-wellbeing', name: 'Home Wellbeing Visit', price: 1000, blurb: 'A companion visits her at home, checks in with warmth, sends you a personal update.' },
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
  const [againText, setAgainText] = React.useState('') // "who is this for?" — closes the loop when understanding is insufficient
  const [againCount, setAgainCount] = React.useState(0) // clarification rounds — hard-capped at 2, then hand to a human
  const [feedback, setFeedback] = React.useState<'none' | 'right' | 'wrong'>('none') // the "Did I get this right?" signal
  /* WHICH line the visitor says is wrong. "Not quite" used to open one box for the whole
     understanding — a retry, not a repair: the person we just failed had to re-explain
     from scratch, and the engine was told nothing about WHICH slot it got wrong, so it
     could make the same mistake twice. Now they tap the line itself. */
  const [fixing, setFixing] = React.useState<{ label: string; body: string } | null>(null)
  // understanding reveal (the known facts appearing, line by line)
  const [s1n, setS1n] = React.useState(0)
  const [s1live, setS1live] = React.useState(-1)
  const [s1done, setS1done] = React.useState(false)
  // hero unfold — cinematic on first visit, settled at once for returning visitors
  const [heroN, setHeroN] = React.useState(0)
  const [heroSettled, setHeroSettled] = React.useState(false)
  const [openCard, setOpenCard] = React.useState<string | null>(null)
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

  /* ── the counsel, once ──
     A city the family gives us on the "which city" line must reach the ANSWER — otherwise
     we'd ask where they are and then ignore it. It is passed as context rather than
     folded into the ledger, so answering a question never reshuffles the understanding
     they are looking at. */
  const toldCity = told.find((t) => t.key === 'city')?.body ?? null
  const counselData = React.useMemo(
    () => (rl ? counsel(rl, { location: rl.city ?? toldCity }) : null),
    [rl, toldCity],
  )

  /* ── ask → understand ── */
  function ask() {
    const q = text.trim()
    if (q.length < 8) return
    setTold([]); setActiveKey(null); setFill(''); setAgainText(''); setAgainCount(0); setFeedback('none')
    const rl0 = readLedger(q)
    newUnderstandingSession()             // one funnel per attempt
    logUnderstanding('first', q, rl0, 0)  // learning loop: first-try understood?
    setRl(rl0)
    setStage('s1')
  }

  /* ── close the question loop: when the answer needs more ("who is this for?"),
        re-run understanding on the ORIGINAL words + what they just added. ── */
  function understandAgain() {
    const extra = againText.trim()
    if (!extra) return
    /* A CORRECTION OUTRANKS WHAT IT CORRECTS — so it goes FIRST, not last.
       This used to append: "Amma lives alone… . it is my father not my mother". The
       engine resolves the EARLIEST mention (see relationships() — hits are sorted by
       index), so "Amma" always beat the correction and the ledger confidently repeated
       "Your mother" no matter how many times you fixed it. The repair loop re-parsed and
       changed nothing; measured in a browser, not read.
       Prepending puts the newer words where the engine looks first, and costs nothing:
       "it is my father not my mother. Amma lives alone in Hyderabad" still yields
       Hyderabad and lives-alone — only the thing they corrected moves. */
    const combined = `${extra}. ${(rl?.rawText || text).trim()}`
    const next = againCount + 1
    const rl2 = readLedger(combined)      // deterministic re-understanding
    logUnderstanding('clarify', combined, rl2, next)
    if (!rl2.subjectKnown && next >= CONVERSATION_BUDGET) logUnderstanding('handoff', combined, rl2, next)
    setText(combined)                     // Edit / the draft carry the full, combined words
    setTold([]); setActiveKey(null); setFill(''); setAgainText(''); setFeedback('none'); setFixing(null)
    setAgainCount(next)                    // count the round — capped at 2 downstream
    setS1n(0); setS1live(-1); setS1done(false)
    setRl(rl2)
    setStage('s1')                        // watch it understand again, from the top
  }

  /* ── "Did I get this right?" — the quiet Ledger affordance that feeds the
        user-flagged-wrong metric and opens an inline correction. ── */
  function flagWrong() {
    if (rl) logUnderstanding('flag', rl.rawText, rl, againCount)
    setAgainText(''); setFixing(null); setFeedback('wrong')
  }

  /* ── the human handoff: a WhatsApp link pre-filled with the visitor's own words
        AND what Connect understood, so they never repeat themselves. ── */
  function waHandoffLink(): string {
    const written = (rl?.rawText || text).trim()
    const summary = rl ? understandingSummary(rl) : ''
    const msg = `Hi Close Eye — I was using Connect and would like a real person to help.\n\nWhat I wrote:\n"${written}"\n\nWhat Connect understood:\n${summary}`
    return `${WA}?text=${encodeURIComponent(msg)}`
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

  /* ── returning visitor: if they're already signed in (and not mid-OAuth), offer
        a quiet path back to their Family Space. ── */
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') || params.has('error')) return // the OAuth return effect owns this
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) setSignedIn(!!data.session) }).catch(() => {})
    return () => { alive = false }
  }, [])

  /* ── restore an in-progress conversation after a refresh — so it never feels like
        Connect forgot. Never runs over an OAuth return (the effects above own that);
        rl is re-derived deterministically from the saved text. ── */
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') || params.has('error')) return
    const s = getConnectSession()
    if (!s) return
    const rl0 = readLedger(s.text)
    setText(s.text); setRl(rl0); setTold(s.told || []); setAgainCount(s.againCount || 0)
    const st = STABLE.includes(s.stage as Stage) ? (s.stage as Stage) : 's0'
    if (st !== 's0') {
      setS1n(rl0.ledger.filter((l) => !l.quote).length); setS1live(-1); setS1done(true) // the reveal already happened
      setStage(st)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── autosave the conversation to localStorage so a refresh recovers it. Only
        stable resting points are persisted; transient stages keep the last one. ── */
  React.useEffect(() => {
    if (!STABLE.includes(stage)) return
    if (text.trim() || told.length) saveConnectSession({ text, stage, told, againCount })
  }, [text, stage, told, againCount])

  /* ── provision + branch by phase. NEVER navigates to an empty Space; a failure
        surfaces a calm retry with the draft intact. ── */
  async function finishAndProvision() {
    const draft = getConnectDraft()
    const rl2 = draft ? readLedger(draft.rawText) : rl
    // lowercase mid-sentence subject ("your mother", "Lakshmi") — capitalised only
    // where it starts a sentence (the seal), never "Your Mother's" mid-sentence.
    setSubject(rl2 ? (rl2.name || (rl2.relationshipWord ? `your ${rl2.relationshipWord}` : rl2.subjectLabel)) : 'their')
    setSelfSpace(rl2 ? !rl2.forLoved : false)
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
    const draft = getConnectDraft()
    const rl2 = draft ? readLedger(draft.rawText) : rl
    const { data: auth } = await supabase.auth.getUser()
    const { data: br, error: brErr } = await supabase.functions.invoke('submit-booking-request', {
      body: { service_id: visit.id, recipient_name: rl2?.subjectLabel, city: rl2?.city },
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
  const them = rl?.gender === 'he' ? 'him' : rl?.gender === 'she' ? 'her' : 'them'
  // a natural name for the signature "Getting to know …" state (never invented)
  const knowName = rl?.name || (rl?.relationshipWord ? `your ${rl.relationshipWord}` : 'your family')
  // mid-sentence possessive subject — a name stays capitalised ("Lakshmi's"), a
  // relationship reads lowercase in a sentence ("your father's"), not "Your Father's".
  const subjMid = rl?.name || (rl?.relationshipWord ? `your ${rl.relationshipWord}` : rl?.subjectLabel) || ''
  // A subject — a person, the family, or the visitor — must be understood before a
  // space can be created. Without one, the answer stays open (we ask "who is this
  // for?") until the 2-round cap, then hands to a human.
  const personKnown = !!rl?.subjectKnown
  // WHO alone is not understanding. A subject with no NEED is a "not enough" state, and it
  // must not wear "understood" chrome: it used to print "Now I can answer you properly"
  // directly above "I'm not yet sure what you need". Both must be filled — and a NEED is
  // never fabricated, so if the visitor didn't say it, it stays a blank and we ask.
  // (A person subject can't reach this — readLedger promotes unclear->wellbeing when
  // forLoved — so this is the family/self path, e.g. "This is for my family".)
  const needKnown = !!rl && rl.need !== 'unclear'
  const understood = personKnown && needKnown
  const truncate = (s: string, n = 72) => { const t = s.trim().replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }
  const CHECK = (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
  )

  // The whole flow is one continuous conversation. Back steps to the previous beat;
  // Edit reopens your words; Change the person begins a fresh understanding. Nothing
  // is committed to the immutable ledger until you create the space.
  const PREV: Record<string, Stage> = { s1: 's0', s2: 's1', s3: 's2', s4: 's3', s4b: 's4' }
  function editWords() { setError(''); setStage('s0') }
  function changePerson() {
    clearConnectSession() // a fresh start — drop the saved conversation
    clearTimers(); setError(''); setText(''); setRl(null); setTold([]); setActiveKey(null); setFill(''); setAgainText(''); setAgainCount(0); setFeedback('none')
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
    const repairing = onLedger && feedback === 'wrong' && openReady // "not quite" → tap the wrong line
    const nothingYet = known.length === 0 && openBlanks.length === 0 && told.length === 0
    return (
      <div className="uledger">
        <p className="lh">What I understand{revealing ? '' : ' so far'}</p>
        {/* How much is left, always. Not a progress bar toward a sale — a count of what
            Connect still doesn't know, which shrinks as you tell it. The list getting
            SHORTER is the product; a chatbot's box never does. */}
        {interactive && rl.blanks.length > 0 && (
          <div className="uprog" aria-hidden="true">
            {rl.blanks.map((b) => (
              <span key={b.key} className={`ub${told.some((x) => x.key === b.key) ? ' on' : ''}`} />
            ))}
            <span className="ut">{openBlanks.length === 0 ? 'done' : `${told.length} of ${rl.blanks.length}`}</span>
          </div>
        )}
        {nothingYet && (
          <p className="empty">I don’t want to guess. Tell me who this is for — in your own words — and I’ll begin to understand.</p>
        )}
        {/* The legend explains ✓ vs ○ — so it belongs only where a ○ is actually on the
            page, which is now s2 alone. */}
        {interactive && openBlanks.length > 0 && (
          <p className="ulegend"><span className="lg ok">✓</span> what I know<span className="dot-sep">·</span><span className="lg op">○</span> what I don’t yet</p>
        )}
        {known.map((l, i) => {
          const shown = !revealing || i < s1n
          /* "from your words" belongs ONLY to lines the visitor actually wrote. An
             inferred line is Connect's reading — chipping it "from your words" would
             put words in their mouth on the very page that promises we don't. */
          const body = (
            <>
              <span className="mk" aria-hidden="true">{CHECK}</span>
              <p>{l.label && <span className="lbl">{l.label}</span>}{l.body}
                {onLedger && <span className="from-words">{l.inferred ? 'my reading' : 'from your words'}</span>}
                {repairing && <span className="tellme">Not this</span>}
              </p>
            </>
          )
          /* Only tappable AFTER "Not quite" — a phone has no hover, so a line that is
             silently clickable is a line nobody discovers. Saying "not quite" first is
             what makes the affordance appear, and it is the one the page already offers. */
          return repairing ? (
            <button key={`k${i}`} type="button"
              className={`uline know tap in fixable${fixing?.body === l.body ? ' asking' : ''}`}
              onClick={() => { setFixing({ label: l.label ?? '', body: l.body }); setAgainText('') }}>
              {body}
            </button>
          ) : (
            <div key={`k${i}`} className={`uline know${shown ? ' in' : ''}${revealing && i === s1live ? ' live' : ''}`}>
              {body}
            </div>
          )
        })}
        {told.map((item) => (
          <div key={`t${item.key}`} className="uline know mem in">
            <span className="mk" aria-hidden="true">{CHECK}</span>
            <p><span className="lbl">{item.label} · you told me</span>{item.body}</p>
          </div>
        ))}
        {/* The note has to stay true line-by-line: once a reading is on the page,
            "everything above comes from what you wrote" is no longer accurate. */}
        {onLedger && openReady && known.length > 0 && (
          <p className="ledger-note">{known.some((l) => l.inferred)
            ? 'The facts above are your words. The last line is my reading of them — nothing is assumed.'
            : 'Everything above comes from what you wrote — nothing else.'}</p>
        )}
        {/* NEVER show a question that cannot be answered.
            s1 used to list every open blank as dead text — "Which city she is in", "Her
            health…" — with no way to answer any of it. The only way forward was "That's
            exactly it", a button confirming the READING, which silently unlocked s2: the
            same list, same place, same words, now tappable. Two identical screens and a
            mode switch the visitor had to guess at.
            Now the blanks exist only on s2, where every one of them is answerable. A
            question you can't answer is worse than no question — it teaches people the
            page is decorative. */}
        {interactive && openBlanks.map((b) => (
          <React.Fragment key={b.key}>
            <button type="button" className={`uline open tap in${activeKey === b.key ? ' asking' : ''}`} onClick={() => { setActiveKey(activeKey === b.key ? null : b.key); setFill('') }}>
              <span className="mk" aria-hidden="true"><span className="cxring" /></span>
              {/* The chip is the invitation — so it goes away once the box is open beneath
                  it. Rendering an empty span is not the same as rendering nothing: the
                  arrow comes from .tellme::after, and an empty chip leaves it orphaned
                  after the question. */}
              <p>{b.text}{activeKey !== b.key && <span className="tellme">Tell Connect</span>}</p>
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
        ))}
        {interactive && rl.blanks.length > 0 && openBlanks.length === 0 && (
          <p className="later">Thank you — that’s everything I hoped to understand for now.</p>
        )}
      </div>
    )
  }

  /* The first question opens itself.
     s2 used to render every blank as a closed circle: you had to TAP one to discover it
     was a button at all, on a screen whose whole job is to ask you something. The first
     unanswered question is now already open with the cursor in it — the rest queue
     behind. Only ever the first, and only if nothing is open: this must never steal focus
     from a question the visitor chose. */
  React.useEffect(() => {
    if (stage !== 's2' || !rl || activeKey) return
    const first = rl.blanks.find((b) => !told.some((x) => x.key === b.key))
    if (first) { setActiveKey(first.key); setFill('') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, rl?.rawText])

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
    )
  }

  /* Separators are rendered by CSS (::after), never as elements: a separator that is its
     own node can wrap onto the next line and sit there alone, which is exactly what it
     did at 1024 and 1728. */
  function footerLinks() {
    return (
      <div className="footlinks">
        <a href="/how-it-works">How it works</a>
        {!PHASE_2_ENABLED && <span className="plain">What it costs · visits open 15 August</span>}
        <a href="/how-companions-are-verified">How companions are verified</a>
        <a className="last" href={WA} target="_blank" rel="noopener">Ask a real person on WhatsApp</a>
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
            <h1 className="dc-head">Know the people you love —<br /><em>even from far away.</em></h1>
            <p className="dc-supp">Close Eye helps you stay close — it understands your family, remembers what matters, and brings trusted people when they’re needed.</p>
            <p className="dc-accent">Apps can answer. Close Eye can show up.</p>
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
                <h1 className={`h-serif hero-head${heroSettled ? ' in' : ''}`}>When you can’t be there,<br /><em>Close Eye can.</em></h1>
                {/* CATEGORY — the only sentence that teaches the mental model, and it used
                    to sit BELOW the card where a phone never reads it. "before it answers"
                    is what separates this from every AI she has met. */}
                <p className={`whatis hero-cat${heroSettled ? ' in' : ''}`}>Close Eye understands your family <b>before it answers</b> — then brings real people when they’re needed.</p>
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
                  <span className="pen" aria-hidden="true" />
                  <div className="rules" aria-hidden="true"><span className="rule" /><span className="rule" /><span className="rule" /></div>
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
                  <div className="demo-know">
                    {DEMO_KNOWS.map((k, i) => (
                      <p key={k.label} className={`dline ${k.mark}${demo >= 2 ? ' in' : ''}`} style={{ transitionDelay: `${i * 260}ms` }}>
                        <span className="dm">{k.mark === 'know' ? CHECK : <span className="cxring" />}</span>
                        <span className="dl">{k.label}</span>{k.body}
                      </p>
                    ))}
                  </div>
                  <p className={`demo-ans${demo >= 3 ? ' in' : ''}`}>{DEMO_ANSWER}</p>
                </div>
                <div className="act">

                  <button className={`btn${text.trim().length > 0 ? ' inked' : ' ghost'}`} onClick={ask}>Let Connect understand</button>
                  {/* Two lines became one, and it moved ABOVE nothing — it sits with the
                      act it enables rather than after it. */}
                  <p className="privacy">Private. One sentence is enough.</p>
                </div>
              </div>
            </div>
            {storyCards()}
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
              {footerLinks()}
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

            {/* Beat · your words — the root of the thread, kept as one calm line */}
            <div className="beat you collapsed">
              <p className="beat-line"><span className="bk">You told Connect</span><q className="clamp">{truncate(rl.rawText)}</q><button type="button" className="mini-edit" onClick={editWords}>Edit</button></p>
            </div>

            {/* Beat · understanding — active through s1→s2, then a one-line record */}
            <div className={`beat${(stage === 's1' || stage === 's2') ? ' now' : ' collapsed'}`} ref={(stage === 's1' || stage === 's2') ? activeBeatRef : undefined}>
              {(stage === 's1' || stage === 's2') ? (
                <>
                  <div className={`think${stage === 's1' && !s1done ? ' working' : ''}`}><span className="ld" /><span>{
                    stage === 's1' && !s1done ? `Getting to know ${knowName}…`
                      : stage === 's2' ? 'Only what helps me care for them — I won’t guess.'
                      : 'Understand first. Answer second.'
                  }</span></div>
                  {understanding()}
                  {((stage === 's1' && s1done) || stage === 's2') && (
                    feedback === 'wrong' ? (
                      // "Not quite" → an inline correction that re-runs understanding
                      <div className="again" style={{ marginTop: 6 }}>
                        {/* The repair is TARGETED. Tapping the wrong line tells us which slot
                            failed, so the correction lands on it instead of asking the visitor
                            to describe the whole family again. Until they pick one, we say so
                            plainly rather than opening a box with no subject. */}
                        <p className="fixhint">{fixing
                          ? <>Tell me again about <b>{(fixing.label || 'this').toLowerCase()}</b> — in your words.</>
                          : <>Tap the line I got wrong — or just tell me below.</>}</p>
                        <textarea className="again-ta" rows={2} value={againText} onChange={(e) => setAgainText(e.target.value)}
                          placeholder={fixing ? 'Say it again, in your words…' : 'What did I miss? Tell me in your words…'} autoFocus />
                        <div className="act"><button type="button" className={`btn${againText.trim() ? ' inked' : ' ghost'}`} onClick={understandAgain}>Connect, understand again</button></div>
                      </div>
                    ) : (
                      <p className="gotit">Did I get this right? <button type="button" onClick={flagWrong}>Not quite</button></p>
                    )
                  )}
                  {stage === 's1' && feedback !== 'wrong' && (
                    <div className="act" style={{ opacity: s1done ? 1 : 0, pointerEvents: s1done ? 'auto' : 'none' }}>
                      {understood ? (
                        // We already understand enough to help — so the payoff is NOT gated
                        // behind a wall of questions. The summary and the human hand-off come
                        // now; the blanks become OPTIONAL enrichment, offered as a quiet second
                        // path ("a few things would help"), never a form to clear first.
                        // (understood = a person AND a need; see personKnown/needKnown.)
                        <>
                          <button className="btn" onClick={() => setStage('s3')}>Yes — that’s right</button>
                          {rl.blanks.length > 0 && (
                            <button type="button" className="second" onClick={() => setStage('s2')}>
                              A few things would help Close Eye prepare →
                            </button>
                          )}
                        </>
                      ) : (
                        // We do NOT have enough yet — here the questions are the way forward,
                        // not a detour, so the one button leads into them.
                        <button className="btn" onClick={() => setStage(rl.blanks.length ? 's2' : 's3')}>Yes — that’s right</button>
                      )}
                    </div>
                  )}
                  {stage === 's2' && feedback !== 'wrong' && (
                    // Never trapped: leaving is always one tap, and skipping costs nothing —
                    // an unanswered blank simply stays a ○, honestly.
                    <div className="act"><button className="btn" onClick={() => setStage('s3')}>
                      {rl.blanks.every((b) => told.some((x) => x.key === b.key)) ? 'Continue' : 'That’s enough for now'}
                    </button></div>
                  )}
                </>
              ) : (
                <p className="beat-line"><span className="bk">Understood</span>{personKnown ? <b>{cap1(subjMid)}</b> : <span>what you shared</span>}<button type="button" className="mini-edit" onClick={() => setStage(rl.blanks.length ? 's2' : 's1')}>Edit</button></p>
              )}
            </div>

            {/* Beat · the answer — full while active, one line once you move on */}
            {order(stage) >= order('s3') && counselData && (
              <div className={`beat${stage === 's3' ? ' now' : ' collapsed'}`} ref={stage === 's3' ? activeBeatRef : undefined}>
                {stage === 's3' ? (
                  <>
                    <div className="think" style={{ marginBottom: 14 }}><span className="ld" style={{ animation: 'none' }} /><span>{understood ? 'Now I can answer you properly.' : againCount >= CONVERSATION_BUDGET ? 'Let’s get you to a real person.' : 'Let me make sure I understand.'}</span></div>
                    <div className="counsel">
                      {/* the "question" is never repeated verbatim — it varies each round */}
                      {(understood || againCount === 0) ? (
                        <>{counselData.paragraphs.map((p, i) => <p key={i}>{boldLead(p)}</p>)}<p className="sig">{counselData.signature}</p></>
                      ) : againCount >= CONVERSATION_BUDGET ? (
                        <p>I’d rather hand this to a person than guess. A real person at Close Eye is one tap away — I’ll pass along what you wrote so you won’t repeat yourself.</p>
                      ) : (
                        <p>Still with you — even a few words help. Who is this for, and what’s going on?</p>
                      )}
                    </div>
                    {/* The number now comes from the region config, not a literal. Phase 0 pins
                        it to India (108); per-user resolution lands with region_code. */}
                    {rl.need === 'emergency' && (() => {
                      const d = emergencyDial(DEFAULT_REGION_CODE)
                      return d.href ? <a className="dial" href={d.href}>{d.text}</a> : <span className="dial">{d.text}</span>
                    })()}
                    {understood ? (
                      <>
                        <p className="trustline" style={{ marginTop: 20 }}>Sometimes care needs a real person. Close Eye knows when.</p>
                        {/* needsHuman, not aiConfident: a need that wants presence we can't
                            promise here must still offer a person — otherwise the words say
                            "a real person is one message away" with no way to reach one. */}
                        {counselData.needsHuman && <a className="qlink" href={WA} target="_blank" rel="noopener" style={{ marginTop: 10 }}>Talk to a real person on WhatsApp →</a>}
                        <div className="act"><button className="btn" onClick={() => setStage('s4')}>{counselData.needsHuman ? 'Keep this, and continue' : 'This is what I’ve been looking for'}</button></div>
                      </>
                    ) : againCount >= CONVERSATION_BUDGET ? (
                      // Two rounds is the floor — a designed human handoff, never a dead end.
                      // The link pre-fills their words + what was understood, so no repeating.
                      <div className="again">
                        <a className="wa-prominent primary" href={waHandoffLink()} target="_blank" rel="noopener">Message a real person →</a>
                        <button type="button" className="restart-link" onClick={changePerson}>or start over</button>
                      </div>
                    ) : (
                      // Insufficient understanding — never a dead end. Give a place to
                      // answer right here (varied each round), and a real person on WhatsApp.
                      <div className="again">
                        <textarea className="again-ta" rows={2} value={againText} onChange={(e) => setAgainText(e.target.value)}
                          placeholder={personKnown ? 'Tell me what’s happening — even a few words' : againCount === 0 ? 'Tell me here — who is this for?' : 'In your words — who is it for, and what would help?'}
                          aria-label={personKnown ? 'What is happening?' : 'Who is this for?'} autoFocus />
                        <div className="act"><button type="button" className={`btn${againText.trim() ? ' inked' : ' ghost'}`} onClick={understandAgain}>Tell me more</button></div>
                        <a className="wa-prominent" href={waHandoffLink()} target="_blank" rel="noopener">Talk to a real person on WhatsApp →</a>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="beat-line"><span className="bk">The answer</span>kept for you</p>
                )}
              </div>
            )}

            {/* Beat · keep it, safely → create the space (only when a person is known) */}
            {stage === 's4' && personKnown && (
              <div className="beat now" ref={activeBeatRef}>
                <h1 className="h-serif" style={{ fontSize: 26 }}>{rl.forLoved
                  ? <>Today is where {subjMid}’s<br />story <em>begins.</em></>
                  : <>Today is where your<br />story <em>begins.</em></>}</h1>
                {/* No "every visit written down": the Space timeline holds what Connect
                    understood and what the family tells it — a visit has never landed
                    there. Promising a record we don't keep, one line above "Close Eye
                    never invents information about your family", is the loudest possible
                    way to break that promise. */}
                <p className="lede">{rl.forLoved
                  ? `Everything above is kept here — privately, for you. What I know about ${subjMid}, and what I’m still learning.`
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
            <p className="lede">A verified companion goes to {rl?.gender === 'he' ? 'him' : rl?.gender === 'they' ? 'them' : 'her'}. You receive a written report on WhatsApp.</p>
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
