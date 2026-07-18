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
import { deriveSnapshot, deriveRecommendations, groupUnderstanding, askSuggestions, type UnderstandingInput } from '@/lib/space/understanding'
import { emergencyDial, DEFAULT_REGION_CODE } from '@/lib/platform/regions'
import { can } from '@/lib/platform/capability'
import { PHASE_2_ENABLED, VISITS_OPEN_LABEL } from '@/lib/connect/phase'

const WA = 'https://wa.me/919000221261'
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

  // ── Family Page v2 · the deterministic derivations (lib/space/understanding.ts).
  //    Snapshot (how he is), Recommendations (what's next), Understanding (organised).
  //    Everything derived from the graph — nothing asserted; the Snapshot never fakes calm.
  const uInput: UnderstandingInput = {
    subject: { name: lo.name, relationship: lo.relationship, city: lo.city },
    gender: space.gender, known, learned, blanks, observedCount: space.observedCount,
  }
  const recommendations = deriveRecommendations(uInput)
  const snapshot = deriveSnapshot(uInput, recommendations)
  const sections = groupUnderstanding(uInput)
  const suggestions = askSuggestions(uInput)

  // ── Phase 5 · CapabilityRouter. The Family Graph, the Snapshot, the Ask line are Connect
  //    — global, always shown. Physical presence (booking a visit, a Presence Manager, a
  //    bookable errand like a move) is Care, and Care is regional. `careHere` gates exactly
  //    those surfaces to this family's region. India → true → everything shows, byte-identical
  //    to today; a Connect-only region simply never renders a promise it cannot keep.
  const careHere = can(lo.regionCode, 'presence')
  const shownRecs = recommendations.filter((r) => r.action !== 'book' || careHere)

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
            <button className="fchip add" onClick={() => router.push('/connect')}><span className="fa">+</span>Add someone</button>
          </div>
          {space.members.length === 1 && (
            <p className="fam-hint">Everyone you love, in one place — add another whenever you’re ready.</p>
          )}

          {/* ── 1 · SNAPSHOT — how your father is (derived, never asserted) ── */}
          <p className="sh">How {person} is</p>
          <div className={`snap ${snapshot.state}`}>
            <div className="snap-state"><span className="snap-dot" /> {snapshot.headline}</div>
            <p className="snap-sub">{snapshot.sub}</p>
            <div className="snap-grid">
              {snapshot.cells.map((c) => (
                <div key={c.k} className="snap-cell"><div className="sc-k">{c.k}</div><div className={`sc-v${c.dim ? ' dim' : ''}`}>{c.v}</div></div>
              ))}
            </div>
          </div>

          {/* ── 2 · WHAT SHOULD HAPPEN NEXT — recommendations from the graph ── */}
          {shownRecs.length > 0 && (<>
            <p className="sh">What should happen next</p>
            <div className="recs">
              {shownRecs.map((r) => (
                <button key={r.id} type="button" className={`rec ${r.tone}`}
                  onClick={() => {
                    if (r.action === 'book') { PHASE_2_ENABLED ? router.push('/connect') : setQnote(`Visits open ${VISITS_OPEN_LABEL}.`); return }
                    const b = blanks.find((x) => new RegExp(r.id === 'reach' ? 'reach' : r.id === 'health' ? 'health|manages' : r.id).test(x.text.toLowerCase()))
                    if (b) { setActiveBlank(b); setFillText(''); setSaveError('') }
                  }}>
                  <span className="rec-t"><span className="rec-why">{r.why} · </span>{r.text}</span>
                  <span className="rec-go">{r.action === 'book' ? 'Book →' : 'Add →'}</span>
                </button>
              ))}
            </div>
          </>)}

          {/* ── 3 · CONNECT'S UNDERSTANDING — a mental model, organised ── */}
          <p className="sh">What Close Eye understands</p>
          <div className="usections">
            {sections.map((sec) => (
              <div key={sec.category} className="usec">
                <div className="usec-h">{sec.category}<span className="usec-c">{sec.knownCount > 0 && `${sec.knownCount} known`}{sec.knownCount > 0 && sec.learningCount > 0 && ' · '}{sec.learningCount > 0 && `${sec.learningCount} learning`}</span></div>
                {sec.items.map((it, idx) => (it.kind === 'blank' ? (
                  <React.Fragment key={it.key}>
                    <button className="ufact open" onClick={() => { setActiveBlank({ key: it.key, text: it.text }); setFillText(''); setSaveError('') }}>
                      <span className="umk o">○</span><span className="ubd o">{it.text}</span><span className="uedit">tell me</span>
                    </button>
                    {activeBlank?.key === it.key && (
                      <div className="fill">
                        <textarea rows={1} value={fillText} onChange={(e) => setFillText(e.target.value)} placeholder="Write it as you’d tell a friend…" autoFocus />
                        {saveError && <p className="learned show" style={{ color: '#B23A2E' }}>{saveError}</p>}
                        <div className="frow"><button className="save" onClick={saveFill}>Connect, remember this</button><button className="cancel" onClick={() => setActiveBlank(null)}>not now</button></div>
                      </div>
                    )}
                  </React.Fragment>
                ) : (
                  <div key={idx} className="ufact"><span className="umk k">✓</span><span className="ubd">{it.body}</span><span className={`usrc${it.provenance === 'inferred' ? ' inf' : ''}`}>{it.provenance === 'inferred' ? 'my reading' : 'from your words'}</span></div>
                )))}
              </div>
            ))}
            {learnedNote && <p className="learned show">{learnedNote}</p>}
            {blanks.length === 0 && <p className="learned show" style={{ marginTop: 4 }}>Close Eye understands {person}. It will keep listening.</p>}
          </div>

          {/* ── 4 · ASK — conversational, with suggestions that evolve from context ── */}
          <div className="askline">
            <p className="sh" style={{ margin: '0 0 6px' }}>Ask Close Eye</p>
            <div className="ruled">
              <textarea rows={1} value={askText} onChange={(e) => setAskText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doAsk() } }} placeholder={`Ask about ${person}, or anything…`} />
              <button className="go" onClick={doAsk}>Ask</button>
            </div>
            {!answer && suggestions.length > 0 && (
              <div className="asksugg">{suggestions.map((s) => (<button key={s} type="button" onClick={() => { setAskText(s) }}>{s}</button>))}</div>
            )}
            {answer && (
              <div className="answer">
                <p>{answer.text}</p>
                {answer.dial && (() => { const d = emergencyDial(lo.regionCode); return d.href ? <a className="dial" href={d.href}>{d.text}</a> : <span className="dial">{d.text}</span> })()}
                {answer.whatsapp && <a className="wa" href={WA} target="_blank" rel="noopener">Talk to a real person on WhatsApp →</a>}
              </div>
            )}
          </div>

          {/* ── 5 · TIMELINE — his living memory, kept below the present ── */}
          <p className="sh">{Person}’s story with Close Eye</p>
          <div className="tl">
            {space.timeline.map((e) => (
              <div key={e.id} className={`tle ${e.kind}`}>
                <span className="nd" /><div className="when">{e.when}</div><p>{e.title}</p>{e.sub && <div className="sub">{e.sub}</div>}
              </div>
            ))}
          </div>

          {/* Phase 5 · the Care action bar — shown only where Care is live (India today). A
              Connect-only region ends on the timeline; no unbookable visit, no absent PM. */}
          {careHere && (
            <div className="qacts">
              {PHASE_2_ENABLED ? (
                <button className="qbtn primary" onClick={() => router.push('/connect')}>Book {them === 'her' ? 'her' : them === 'him' ? 'his' : 'their'} next visit</button>
              ) : (
                <button className="qbtn primary" onClick={() => setQnote(`Visits open ${VISITS_OPEN_LABEL}.`)}>Book a visit</button>
              )}
              <a className="qbtn" href={WA} target="_blank" rel="noopener">Message your Presence Manager</a>
              <button className="qbtn" onClick={() => setQnote('Reports will appear here after the first visit.')}>Reports</button>
            </div>
          )}
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
