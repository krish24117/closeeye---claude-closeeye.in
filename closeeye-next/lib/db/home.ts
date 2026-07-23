/**
 * Sprint 2 — the Workspace Home data. Family-level, state-driven (lib/space/state). Reads the
 * Family Graph directly (no FamilyDataProvider — /space runs in AppShell "lite" mode), one
 * batched ledger query across every person. Fail-safe: throws on a real read error so the Home
 * can show a calm retry instead of hanging.
 *
 * Sprint-2 signals are the ones we can honestly derive now: a positive signal (a guardian/visit
 * observation) → healthy, else getting-to-know. Active-care, emergency and attention-from-blanks
 * wire in as their sources land (People & Activity S4, Care S5) — the state FRAMEWORK is already
 * complete and tested (lib/space/state); Home simply feeds it more signals over time.
 */
import { supabase } from '@/lib/supabase'
import { fetchMyBookingRequests, fetchReportedBookingIds, fetchVisitReport } from '@/lib/db/family'
import { derivePersonState, rollUp, type WorkspaceState, type PersonSignals } from '@/lib/space/state'
import { formatTime, formatDate } from '@/lib/platform/locale'
import { DEFAULT_REGION_CODE } from '@/lib/platform/regions'

export interface HomePerson {
  id: string
  name: string
  relationship: string | null
  regionCode: string | null
  state: WorkspaceState
  /** Card title — a relationship subject reads as "Mother" (not "Your Mother"), a named one as "Amma". */
  label: string
  /** Sentence form — "your mother" (relationship) or "Amma" (named); reads right in possessives. */
  natural: string
  /** Up to two stated facts Close Eye holds — the family's own words (never inferred). */
  known: string[]
  /** A short, honest "still learning" line, derived from which essentials are missing. */
  learning: string | null
}

/** Split a stored name into its display forms. A relationship subject is stored as "your mother";
 *  `firstName` on it wrongly yields "Your". This keeps "your mother" whole for sentences and
 *  offers a clean "Mother" for the card. A real name ("Amma") stays itself. */
function nameParts(fullName: string, relationship: string | null): { label: string; natural: string } {
  const f = (fullName || '').trim()
  if (/^your\s/i.test(f)) {
    const rel = (f.replace(/^your\s/i, '').trim() || (relationship ?? 'family')).toLowerCase()
    // label keeps a Title-case word for the person card ("Mother"); `natural` stays lowercase so
    // sentences read as natural, global English ("your mother"), never "your Mother".
    return { label: rel.charAt(0).toUpperCase() + rel.slice(1), natural: `your ${rel}` }
  }
  if (f.toLowerCase() === 'you') return { label: 'You', natural: 'you' }
  return { label: f, natural: f.split(/\s+/)[0] || f }
}
export interface HomeActivity { id: string; when: string; text: string; person: string; personId: string }
export interface HomeAlert { id: string; text: string; actionLabel: string; href: string }
/** The "what I'm noticing" synthesis — the single most important thing across the family. */
export interface HomeNotice { title: string; why: string; personId: string; personName: string }
/** The one thing that would deepen understanding — a real open essential, phrased as a question. */
export interface HomePrompt { text: string; personId: string }
/** STAGE 3+ — the next scheduled Guardian visit (once a family is a member and has booked). */
export interface HomeVisit { id: string; whenLabel: string; personName: string; guardianAssigned: boolean }
/** STAGE 4 — the most recent completed visit and its Guardian report (summary/mood/photos), when filed. */
export interface HomeLatestVisit { id: string; whenLabel: string; personName: string; summary: string | null; mood: number | null; hasPhotos: boolean }
/** STAGE 5 — a grounded understanding synthesis. Deterministic, drawn only from REAL recorded
 *  observations; every field traces to stored data. Null until genuine accumulation (never fabricated). */
export interface HomeUnderstanding { personId: string; personName: string; headline: string; observationCount: number; weeksObserved: number; snippets: { text: string; when: string }[] }

export interface HomeData {
  userName: string
  /** The rolled-up Workspace state — the most urgent person's state. */
  state: WorkspaceState
  people: HomePerson[]
  activity: HomeActivity[]
  alerts: HomeAlert[]
  notice: HomeNotice | null
  prompt: HomePrompt | null
  /** True when the family has a live Close Eye Connect membership — drives the Home's calm
   *  membership moment (an invitation when false, a quiet "Connect is active" when true).
   *  Only a paid 'active' subscription counts; a chosen-but-unpaid 'created' is not "on Connect". */
  connectActive: boolean
  /** STAGE 3/4 signals — a scheduled visit, whether a visit has ever completed, and the family's
   *  emergency contact. All best-effort: absent data simply hides the relevant calm card. */
  upcomingVisit: HomeVisit | null
  hasCompletedVisit: boolean
  /** STAGE 4 — the latest completed visit + report; null until a visit has happened. */
  latestVisit: HomeLatestVisit | null
  /** STAGE 5 — the grounded understanding synthesis; null until real observations accumulate. */
  understanding: HomeUnderstanding | null
  emergency: { name: string; phone: string | null } | null
}

/** The essentials Close Eye wants to know about anyone it cares for. A person's stated facts are
 *  matched against these; whatever isn't covered is honestly "still learning". No fabrication —
 *  a fact is "known" only if the family actually said something that matches. */
const ESSENTIALS = [
  { key: 'health', label: 'health', re: /health|medical|condition|medicine|medication|diabet|\bbp\b|blood|allerg|pain|mobility|doctor/i, q: (n: string) => `How is ${n}’s health these days?`, notice: (n: string) => `how ${n}’s health is` },
  { key: 'nearby', label: 'who’s nearby', re: /neighbour|neighbor|nearby|relative|next door|close by|lives with|alone/i, q: (n: string) => `Who’s nearby if ${n} needs someone?`, notice: (n: string) => `who’s nearby for ${n}` },
  { key: 'routine', label: 'their days', re: /routine|morning|evening|day|wakes|sleep|walk|meal|breakfast|tea|coffee/i, q: (n: string) => `What do ${n}’s mornings look like now?`, notice: (n: string) => `how ${n}’s days go` },
] as const

const firstName = (s: string) => (s || '').trim().split(/\s+/)[0] || s

function whenLabel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  const time = formatTime(d, DEFAULT_REGION_CODE, { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  return d.toDateString() === now.toDateString() ? `Today · ${time}` : formatDate(d, DEFAULT_REGION_CODE, { day: 'numeric', month: 'short' })
}

interface LedgerRow { loved_one_id: string; label: string | null; body: string; entry_type: string; source: string | null; created_at: string }

export async function fetchHome(): Promise<HomeData | null> {
  const { data: auth, error: authErr } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  const user = auth.user
  if (!user) return null

  const [profRes, losRes, subRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('loved_ones').select('id, full_name, relationship, region_code, emergency_contact_name, emergency_contact_phone').eq('family_user_id', user.id).order('created_at', { ascending: true }).limit(20),
    // Membership state — best-effort; a failed/absent read simply reads as "not on Connect"
    // (an invitation), never blocks the Home.
    supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
  ])
  if (losRes.error) throw new Error(losRes.error.message)
  const userName = (profRes.data?.full_name || (user.user_metadata?.full_name as string) || 'there').split(' ')[0] || 'there'
  const connectActive = ((subRes.data as { status?: string } | null)?.status ?? '') === 'active'
  const members = losRes.data ?? []
  if (!members.length) return { userName, state: 'getting_to_know', people: [], activity: [], alerts: [], notice: null, prompt: null, connectActive, upcomingVisit: null, hasCompletedVisit: false, latestVisit: null, understanding: null, emergency: null }

  const ids = members.map((m) => m.id)
  const ledgerRes = await supabase
    .from('family_ledger')
    .select('loved_one_id, label, body, entry_type, source, created_at')
    .in('loved_one_id', ids)
    .order('created_at', { ascending: false })
    .limit(80)
  if (ledgerRes.error) throw new Error(ledgerRes.error.message)
  const entries = (ledgerRes.data ?? []) as LedgerRow[]
  const nameOf = new Map(members.map((m) => [m.id, m.full_name]))
  const isObservation = (t: string) => t === 'guardian_observation' || t === 'visit_observation'

  // stated facts (the family's own words) about a person — never the raw quote, never inferred.
  const factsOf = (id: string) => entries.filter((e) => e.loved_one_id === id && e.entry_type === 'family_fact' && e.source === 'connect_experience' && e.label !== 'In your words')
  const missingEssentials = (id: string) => {
    const text = factsOf(id).map((e) => `${e.label ?? ''} ${e.body}`).join(' ')
    return ESSENTIALS.filter((es) => !es.re.test(text))
  }

  const people: HomePerson[] = members.map((m) => {
    const own = entries.filter((e) => e.loved_one_id === m.id)
    const signals: PersonSignals = {
      hasPositiveSignal: own.some((e) => isObservation(e.entry_type)),
      openEssentialBlanks: missingEssentials(m.id).length,
      hasActiveVisit: false, // wires with Care in Sprint 5
      hasEmergency: false, // transient; handled real-time in the crisis flow
    }
    const { label, natural } = nameParts(m.full_name, m.relationship)
    // Don't surface the SUBJECT itself as a "known fact" ("Your mother.") — it's redundant with
    // the card title (older spaces stored the subject as a ledger row).
    const subjectLike = new Set([natural, label, m.relationship ?? '', `your ${m.relationship ?? ''}`].map((s) => s.trim().toLowerCase()))
    const known = factsOf(m.id).map((e) => e.body.trim()).filter((b) => b && !subjectLike.has(b.replace(/[.\s]+$/, '').toLowerCase())).slice(0, 2)
    const miss = missingEssentials(m.id)
    const learning = miss.length ? `Learning: ${miss.slice(0, 2).map((es) => es.label).join(' & ')}` : null
    return { id: m.id, name: m.full_name, relationship: m.relationship, regionCode: m.region_code ?? null, state: derivePersonState(signals), label, natural, known, learning }
  })

  const state = rollUp(people.map((p) => p.state))

  // "What I'm noticing" + the proactive prompt — the first person with an open essential. Honest:
  // it only fires on a real gap in what the family has told Close Eye, never an invented concern.
  let notice: HomeNotice | null = null
  let prompt: HomePrompt | null = null
  for (const m of members) {
    const miss = missingEssentials(m.id)[0]
    if (!miss) continue
    const { natural } = nameParts(m.full_name, m.relationship)
    notice = { title: `Add a few details about ${natural}.`, why: `Add their health, daily routine, and who’s around them — the more Close Eye knows, the more it can help.`, personId: m.id, personName: natural }
    prompt = { text: miss.q(natural), personId: m.id }
    break
  }

  const activity: HomeActivity[] = entries
    .filter((e) => e.entry_type === 'family_fact' || isObservation(e.entry_type))
    .slice(0, 8)
    .map((e, i) => ({ id: `act-${i}`, when: whenLabel(e.created_at), text: e.body, person: firstName(nameOf.get(e.loved_one_id) ?? ''), personId: e.loved_one_id }))

  const alerts: HomeAlert[] = people
    .filter((p) => p.state === 'getting_to_know')
    .map((p) => ({ id: `alert-${p.id}`, text: `Still getting to know ${firstName(p.name)}.`, actionLabel: 'Tell Close Eye more', href: '/space/connect' }))

  // STAGE 3/4 — the next visit + whether one has ever completed. Best-effort; a missing table or read
  // simply hides the calm visit cards. Same completed/assigned rules as the dashboard derivation.
  const COMPLETED = ['confirmed', 'scheduled', 'companion_confirmed', 'paid']
  const GUARDIAN_ASSIGNED = ['companion_confirmed', 'paid']
  let upcomingVisit: HomeVisit | null = null
  let hasCompletedVisit = false
  let latestVisit: HomeLatestVisit | null = null
  let moodScoresAsc: number[] = [] // real visit mood scores, oldest→newest — feeds the Stage 5 trend
  try {
    const nowMs = Date.now()
    const visits = await fetchMyBookingRequests(user.id)
    const liveVisits = visits.filter((v) => v.status !== 'cancelled')
    const bookingIds = liveVisits.map((v) => v.booking_id).filter(Boolean) as string[]
    const reported = bookingIds.length ? await fetchReportedBookingIds(bookingIds) : new Set<string>()
    const isDone = (v: (typeof liveVisits)[number]) =>
      (!!v.booking_id && reported.has(v.booking_id)) ||
      (!!v.scheduled_at && new Date(v.scheduled_at).getTime() < nowMs && COMPLETED.includes(v.status))
    hasCompletedVisit = liveVisits.some(isDone)
    const next = liveVisits.filter((v) => !isDone(v)).sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))[0]
    if (next) upcomingVisit = { id: next.id, whenLabel: whenLabel(next.scheduled_at), personName: firstName(next.recipient_name ?? '') || 'your loved one', guardianAssigned: GUARDIAN_ASSIGNED.includes(next.status) || !!next.booking_id }
    // STAGE 4/5 — the completed visits, oldest→newest. Fetch their reports once: the newest feeds
    // the Stage 4 latest-visit card; every real mood score feeds the Stage 5 trend.
    const whenKey = (v: (typeof liveVisits)[number]) => v.scheduled_at ?? v.created_at ?? ''
    const doneAsc = liveVisits.filter(isDone).sort((a, b) => whenKey(a).localeCompare(whenKey(b)))
    if (doneAsc.length) {
      const reports = await Promise.all(
        doneAsc.slice(-12).map((v) => (v.booking_id ? fetchVisitReport(v.booking_id).catch(() => null) : Promise.resolve(null))),
      )
      moodScoresAsc = reports.map((r) => r?.mood).filter((m): m is number => typeof m === 'number')
      const last = doneAsc[doneAsc.length - 1]!
      const lastReport = reports[reports.length - 1] ?? null
      latestVisit = {
        id: last.id,
        whenLabel: whenLabel(whenKey(last)),
        personName: firstName(last.recipient_name ?? '') || 'your loved one',
        summary: lastReport?.summary ?? null,
        mood: lastReport?.mood ?? null,
        hasPhotos: (lastReport?.photoPaths.length ?? 0) > 0,
      }
    }
  } catch { /* best-effort — no visit data simply hides the calm visit cards */ }

  // STAGE 5 — Understanding. A deterministic synthesis, drawn ONLY from real recorded observations;
  // it appears solely after genuine accumulation and never states anything not backed by a stored
  // entry (Understanding Constitution: the graph is truth, never fabricate).
  let understanding: HomeUnderstanding | null = null
  {
    const OBS_MIN = 6, WEEKS_MIN = 4, WEEK_MS = 604800000
    const obsByPerson = new Map<string, LedgerRow[]>()
    for (const e of entries) {
      if (!isObservation(e.entry_type)) continue
      const arr = obsByPerson.get(e.loved_one_id) ?? []
      arr.push(e)
      obsByPerson.set(e.loved_one_id, arr)
    }
    // The most-understood person — the one with the most recorded observations.
    let best: { id: string; obs: LedgerRow[] } | null = null
    for (const [id, obs] of obsByPerson) if (!best || obs.length > best.obs.length) best = { id, obs }
    if (best && best.obs.length >= OBS_MIN) {
      const times = best.obs.map((e) => new Date(e.created_at).getTime()).sort((a, b) => a - b)
      const weeks = Math.floor((times[times.length - 1]! - times[0]!) / WEEK_MS)
      if (weeks >= WEEKS_MIN) {
        const m = members.find((x) => x.id === best!.id)
        const { label, natural } = nameParts(nameOf.get(best.id) ?? '', m?.relationship ?? null)
        const snippets = best.obs
          .slice()
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 2)
          .map((e) => ({ text: e.body, when: whenLabel(e.created_at) }))
        // Mood clause — added ONLY with a single loved one (so the visit scores unambiguously belong
        // to them) and ≥3 real scores that support a clear, honest read. Otherwise the volume stands alone.
        let mood = ''
        if (members.length === 1 && moodScoresAsc.length >= 3) {
          const half = Math.floor(moodScoresAsc.length / 2)
          const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / (a.length || 1)
          if (moodScoresAsc.every((s) => s >= 4)) mood = `, and ${natural}’s recorded spirits have stayed steady and positive`
          else if (avg(moodScoresAsc.slice(-half)) >= avg(moodScoresAsc.slice(0, half)) + 0.5) mood = `, and ${natural}’s recorded spirits have been lifting across recent visits`
        }
        const headline = `Close Eye has held ${best.obs.length} observations about ${natural} over ${weeks} weeks${mood}.`
        understanding = { personId: best.id, personName: label, headline, observationCount: best.obs.length, weeksObserved: weeks, snippets }
      }
    }
  }

  const em = members[0] as { emergency_contact_name?: string | null; emergency_contact_phone?: string | null } | undefined
  const emergency = em?.emergency_contact_name ? { name: em.emergency_contact_name, phone: em.emergency_contact_phone ?? null } : null

  return { userName, state, people, activity, alerts, notice, prompt, connectActive, upcomingVisit, hasCompletedVisit, latestVisit, understanding, emergency }
}
