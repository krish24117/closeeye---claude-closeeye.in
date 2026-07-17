'use client'

/**
 * /space — the private Family Space. Ported from the approved design
 * (docs/close_eye_family_space.html): a living family journal — timeline, the
 * learning ledger ("tell me" blanks), an honest Ask line, and the profile page.
 *
 * Everything shown is REAL: the timeline is derived from actual events, the ledger
 * from what the family told us (never invented). "Tell me" saves to the immutable
 * family_ledger and feeds the Understanding Engine. Reads are resilient (a failure
 * shows a calm retry, never an infinite spinner) and bounded (recency windows +
 * progressive disclosure keep it calm across years). No software metaphors.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchSpace, appendLearning, askConnect, personName, type SpaceData, type AskAnswer } from '@/lib/db/space'
import type { Blank, LedgerLine } from '@/lib/connect/ledger'
import { PHASE_2_ENABLED, VISITS_OPEN_LABEL } from '@/lib/connect/phase'

const WA = 'https://wa.me/919000221261'
const RECENT = 5 // learned lines shown before "show earlier"
const initial = (s: string) => (s || '?').trim().charAt(0).toUpperCase()
const cap1 = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export default function SpacePage() {
  const router = useRouter()
  const [space, setSpace] = React.useState<SpaceData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState(false)
  const [view, setView] = React.useState<'space' | 'profile'>('space')
  // Which family member the Space is showing. null = the first, i.e. exactly what it did
  // before. Switching refetches THAT member's ledger — one query, not twenty.
  const [memberId, setMemberId] = React.useState<string | null>(null)

  // live, editable copies
  const [known, setKnown] = React.useState<LedgerLine[]>([])
  const [learned, setLearned] = React.useState<LedgerLine[]>([])
  const [showEarlier, setShowEarlier] = React.useState(false)
  const [blanks, setBlanks] = React.useState<Blank[]>([])
  const [callName, setCallName] = React.useState<string | null>(null)
  const [activeBlank, setActiveBlank] = React.useState<Blank | null>(null)
  const [fillText, setFillText] = React.useState('')
  const [saveError, setSaveError] = React.useState('')
  const [learnedNote, setLearnedNote] = React.useState('')
  const [askText, setAskText] = React.useState('')
  const [answer, setAnswer] = React.useState<AskAnswer | null>(null)
  const [qnote, setQnote] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true); setLoadError(false)
    try {
      // /space is a signed-in surface. Signed out → go straight to sign-in
      // (returns here). Coming back from Google, wait for the code exchange
      // (detectSessionInUrl) before deciding — never bounce into a sign-in loop.
      const url = new URL(window.location.href)
      if (url.searchParams.has('error')) { router.replace('/connect'); return } // sign-in was declined — don't loop
      const returning = url.searchParams.has('code')
      let session = (await supabase.auth.getSession()).data.session
      if (!session && returning) {
        // returning from Google — wait for the PKCE code exchange to complete
        for (let i = 0; i < 16 && !session; i++) {
          await new Promise((r) => setTimeout(r, 250))
          session = (await supabase.auth.getSession()).data.session
        }
        window.history.replaceState({}, '', url.pathname) // drop ?code from the address bar
        // Exchange failed (expired code / opened in another browser). Offer a retry —
        // NEVER re-redirect to Google, which would bounce in a loop. "Try again"
        // reloads with no ?code and starts a clean sign-in.
        if (!session) { setLoadError(true); setLoading(false); return }
      }
      if (!session) {
        // a fresh, signed-out visit → straight to sign-in (returns to /space)
        await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${url.origin}/space` } })
        return // browser is redirecting to Google — keep the calm spinner
      }

      const s = await fetchSpace(memberId ?? undefined)
      if (!s) { router.replace('/connect'); return }
      setSpace(s); setKnown(s.known); setLearned(s.learned); setBlanks(s.blanks); setCallName(s.callName)
      setLoading(false)
    } catch {
      setLoadError(true); setLoading(false) // a real read failure — offer retry, never hang
    }
  }, [router, memberId])

  React.useEffect(() => { load() }, [load])

  if (loadError) {
    return (
      <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', textAlign: 'center' }}>
        <div>
          <p className="status" style={{ justifyContent: 'center' }}><span className="ld" />We couldn’t open your space just now.</p>
          <button className="qbtn primary" style={{ marginTop: 16 }} onClick={load}>Try again</button>
        </div>
      </div>
    )
  }
  if (loading || !space) {
    return (
      <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <span className="status"><span className="ld" />Opening your family space…</span>
      </div>
    )
  }

  const lo = space.lovedOne
  const h = new Date().getHours()
  const greeting = (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + `, ${space.userName}.`
  const them = space.gender === 'he' ? 'him' : space.gender === 'they' ? 'them' : 'her'
  // The name we show: what the family calls this person ("Amma"), else the
  // relationship lowercased mid-sentence ("your mother"). `person` reads inside a
  // sentence; `Person` starts one.
  const person = personName({ callName, lovedOne: lo })
  const Person = cap1(person)

  const shownLearned = showEarlier ? learned : learned.slice(-RECENT)
  const hiddenCount = learned.length - shownLearned.length

  async function saveFill() {
    const b = activeBlank
    const text = fillText.trim()
    if (!b || !text) return
    setSaveError('')
    const { line, error } = await appendLearning(lo.id, b.key, text)
    if (error || !line) { setSaveError('Couldn’t save that just now — please try again.'); return }
    setBlanks((prev) => prev.filter((x) => x.key !== b.key))
    setActiveBlank(null); setFillText('')
    if (b.key === 'callname') {
      setCallName(text) // becomes the name everywhere, at once — not a note in the ledger
      setLearnedNote(`I’ll call ${them} ${text} from now on.`)
    } else {
      setLearned((prev) => [...prev, line])
      setLearnedNote(`Connect knows ${person} a little better now.`)
    }
    window.setTimeout(() => setLearnedNote(''), 3500)
  }

  function doAsk() {
    const q = askText.trim()
    if (!q || !space) return
    setAnswer(askConnect(q, { ...space, callName, known, learned, blanks }))
    setAskText('')
  }

  async function signOut() {
    try { await supabase.auth.signOut() } catch {}
    router.replace('/connect')
  }

  return (
    <div className="app">
      <header className="mast">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="wm"><img className="wmark" src="/brand/close-eye-icon.svg" alt="" width={22} height={22} />close eye <small>CONNECT</small></span>
        <button className="avatar" onClick={() => { setView('profile'); window.scrollTo(0, 0) }} aria-label="Your page">{initial(space.userName)}</button>
      </header>

      <main id="main">
        {/* ============ FAMILY SPACE ============ */}
        <section className={`view${view === 'space' ? ' on' : ''}`} aria-label={`${person}’s space`}>
          <div className="greet">
            <h1>{greeting}</h1>
            <div className="status"><span className="ld" /><span>We’re just getting to know {person}. Everything here comes from what your family shares — never assumptions.</span></div>
          </div>

          {/* One chip per member. This row rendered a single hardcoded chip while the
              query already fetched up to 20 — so a second person was understood,
              provisioned, stored, and then never shown. Adding family worked; the family
              never appeared. The selected member owns the timeline, the ledger and the
              blanks below, so switching changes the whole Space. */}
          <div className="fam">
            {space.members.map((m) => {
              const on = m.id === space.selectedId
              const label = on ? Person : (/^your\s/i.test(m.name) ? m.name : m.name)
              return (
                <button key={m.id} type="button" className={`fchip${on ? ' pick' : ''}`}
                  aria-current={on ? 'true' : undefined}
                  onClick={() => { if (!on) { setMemberId(m.id); setActiveBlank(null); setAskText(''); setAnswer(null); setLearnedNote('') } }}>
                  <span className="fa">{initial(label)}</span>{label}
                </button>
              )
            })}
            <button className="fchip add" onClick={() => router.push('/connect')}><span className="fa">+</span>Add family</button>
          </div>

          <p className="sh">{Person}’s timeline</p>
          <div className="tl">
            {space.timeline.map((e) => (
              <div key={e.id} className={`tle ${e.kind}`}>
                <span className="nd" />
                <div className="when">{e.when}</div>
                <p>{e.title}</p>
                {e.sub && <div className="sub">{e.sub}</div>}
              </div>
            ))}
          </div>

          <p className="sh">What Connect knows</p>
          <div className="ledger">
            {known.map((l, i) => (
              <div key={`k${i}`} className="lline"><span className="ld" /><p>{l.quote ? <><span className="lbl">In your words</span><q>{l.body}</q></> : <>{l.label && <span className="lbl">{l.label}</span>}{l.body}</>}</p></div>
            ))}

            {hiddenCount > 0 && (
              <button className="blank" onClick={() => setShowEarlier(true)} style={{ paddingBottom: 2 }}>
                <span className="ld" style={{ border: 'none', background: 'var(--hair2)' }} /><p style={{ fontStyle: 'italic', fontSize: 15 }}>Show {hiddenCount} earlier {hiddenCount === 1 ? 'note' : 'notes'}…</p>
              </button>
            )}
            {shownLearned.map((l, i) => (
              <div key={`l${i}`} className="lline new"><span className="ld" /><p><span className="lbl">{l.label} · you told me</span>{l.body}</p></div>
            ))}

            {blanks.length > 0 && <p className="sh" style={{ marginTop: 18 }}>Still learning · tap a line to tell me</p>}
            <div>
              {blanks.map((b) => (
                <React.Fragment key={b.key}>
                  <button className="blank" onClick={() => { setActiveBlank(b); setFillText(''); setSaveError('') }}>
                    <span className="ld" /><p>{b.text}<span className="dots" /><span className="tellme">tell me</span></p>
                  </button>
                  {activeBlank?.key === b.key && (
                    <div className="fill">
                      <textarea rows={1} value={fillText} onChange={(e) => setFillText(e.target.value)} placeholder="Write it as you’d tell a friend…" autoFocus />
                      {saveError && <p className="learned show" style={{ color: '#B23A2E' }}>{saveError}</p>}
                      <div className="frow">
                        <button className="save" onClick={saveFill}>Connect, remember this</button>
                        <button className="cancel" onClick={() => setActiveBlank(null)}>not now</button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            {learnedNote && <p className="learned show">{learnedNote}</p>}
            {blanks.length === 0 && <p className="learned show" style={{ marginTop: 4 }}>Every line is filled. Connect will keep listening.</p>}
          </div>

          <div className="askline">
            <p className="sh" style={{ margin: '0 0 6px' }}>Ask Connect</p>
            <div className="ruled">
              <textarea rows={1} value={askText} onChange={(e) => setAskText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doAsk() } }} placeholder={`Ask about ${person}, or anything…`} />
              <button className="go" onClick={doAsk}>Ask</button>
            </div>
            {answer && (
              <div className="answer">
                <p>{answer.text}</p>
                {answer.dial && <a className="dial" href="tel:108">Call emergency services · 108</a>}
                {answer.whatsapp && <a className="wa" href={WA} target="_blank" rel="noopener">Talk to a real person on WhatsApp →</a>}
              </div>
            )}
          </div>

          <div className="qacts">
            {PHASE_2_ENABLED ? (
              <button className="qbtn primary" onClick={() => router.push('/connect')}>Book {them === 'her' ? 'her' : them === 'him' ? 'his' : 'their'} next visit</button>
            ) : (
              <button className="qbtn primary" onClick={() => setQnote(`Visits open ${VISITS_OPEN_LABEL}.`)}>Book a visit</button>
            )}
            <a className="qbtn" href={WA} target="_blank" rel="noopener">Message your Presence Manager</a>
            <button className="qbtn" onClick={() => setQnote('Reports will appear here after the first visit.')}>Reports</button>
          </div>
          {qnote && <p className="qnote">{qnote}</p>}

          <p className="footnote">Your Trusted Presence</p>
        </section>

        {/* ============ YOUR PAGE ============ */}
        <section className={`view${view === 'profile' ? ' on' : ''}`} aria-label="Your page">
          <button className="back" onClick={() => { setView('space'); window.scrollTo(0, 0) }}>← {Person}’s space</button>

          <div className="pid">
            <span className="pa">{initial(space.userName)}</span>
            <div>
              <h2>{space.userName}</h2>
              <div className="em">{space.email}</div>
            </div>
          </div>

          <p className="sh">Your family</p>
          <div className="pcard">
            <div className="prow"><span className="k">{Person}</span><span className="v">{lo.city || 'Family Space'}<small>space opened today</small></span></div>
            <div className="prow"><span className="k">Add someone</span><span className="v"><button className="plink" onClick={() => router.push('/connect')}>anyone you love →</button></span></div>
          </div>

          <p className="sh">How Connect speaks to you</p>
          <div className="pcard">
            <div className="prow"><span className="k">WhatsApp updates</span><span className="v">On<small>we reach you on WhatsApp</small></span></div>
            <div className="prow"><span className="k">Language</span><span className="v">English<small>Telugu &amp; Hindi coming</small></span></div>
          </div>

          <p className="sh">Your control</p>
          <div className="pcard">
            <div className="prow"><span className="k">Your data</span><span className="v"><a className="plink" href={WA} target="_blank" rel="noopener">Ask us anything →</a></span></div>
            <div className="prow"><span className="k">Companions</span><span className="v"><a className="plink" href="/how-companions-are-verified">How they’re verified →</a></span></div>
            <div className="prow"><span className="k">Policies</span><span className="v"><a className="plink" href="https://www.closeeye.in/cancellation-policy" target="_blank" rel="noopener">Cancellation</a> · <a className="plink" href="https://www.closeeye.in/refund-policy" target="_blank" rel="noopener">Refunds</a></span></div>
          </div>

          <p className="privacy">Your family’s information belongs only to your family.</p>
          <button className="signout" onClick={signOut}>Sign out</button>
        </section>
      </main>
    </div>
  )
}
