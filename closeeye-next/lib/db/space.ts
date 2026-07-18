/**
 * Close Eye Connect — the Family Space data layer.
 *
 * The bridge between the deterministic Understanding Engine (lib/connect) and the
 * database. Provisioning is TRANSACTIONAL and IDEMPOTENT (never a duplicate space,
 * never a lost draft, always retryable). Reads are RESILIENT (errors surface, never
 * hang) and BOUNDED (recency windows keep the journal calm across years of use).
 *
 * The engine stays independent: this layer only reads/writes rows and calls the
 * pure functions in lib/connect. The UI is a presentation layer over both.
 */
import { supabase } from '@/lib/supabase'
import { classify, pronoun, type Gender } from '@/lib/connect/understand'
import { readLedger, ledgerEntriesForStorage, blanksFor, KEY_LABEL, type Blank, type LedgerLine } from '@/lib/connect/ledger'
import { formatTime, formatDate } from '@/lib/platform/locale'
import { DEFAULT_REGION_CODE } from '@/lib/platform/regions'

/** Mid-sentence display name: the name the family gave ("Amma"), else the
 *  relationship lowercased ("your mother"), else a real name as typed. */
export function personName(space: Pick<SpaceData, 'callName' | 'lovedOne'>): string {
  if (space.callName) return space.callName
  const n = space.lovedOne.name
  return /^your\s/i.test(n) ? n.toLowerCase() : n
}

/** How many ledger entries a Space loads at once — keeps it calm at scale. */
const WINDOW = 50

/**
 * How long a just-created space may be REUSED instead of creating another (F9).
 *
 * Idempotency here exists for one thing: a double-invoke, a second tab, or a retry after a
 * failure — all of which happen within minutes, since the draft is cleared the moment
 * provisioning succeeds. It must NOT stretch far enough to merge two genuinely different
 * people who happen to share a label ("Your Sister"). An hour is generous for a retry and
 * far too short to collide with a real second person.
 */
const PROVISION_IDEMPOTENCY_MS = 60 * 60 * 1000

/* ── the pre-sign-in draft (survives the OAuth round-trip via localStorage) ── */
const DRAFT_KEY = 'closeeye.connect.draft'
export interface DraftExtra { label: string; body: string }
export interface ConnectDraft { rawText: string; at: number; extras?: DraftExtra[] }

export function setConnectDraft(rawText: string, extras?: DraftExtra[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ rawText, at: Date.now(), extras } satisfies ConnectDraft)) } catch {}
}
export function getConnectDraft(): ConnectDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as ConnectDraft
    return d && typeof d.rawText === 'string' ? d : null
  } catch { return null }
}
export function clearConnectDraft(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(DRAFT_KEY) } catch {}
}

/* ── in-progress conversation autosave (survives a browser refresh) ──
   Separate from the pre-sign-in DRAFT above: this restores a visitor to exactly
   where they were on /connect if the page reloads mid-conversation, so it never
   feels like Connect forgot what they typed. Deterministic `rl` is re-derived from
   the text on restore, so only the raw inputs are stored. */
const SESSION_KEY = 'closeeye.connect.session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h — recover a real session, not a stale one from days ago
export interface ConnectTold { key: string; label: string; body: string }
export interface ConnectSession { text: string; stage: string; told: ConnectTold[]; againCount: number; at: number }

export function saveConnectSession(s: Omit<ConnectSession, 'at'>): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, at: Date.now() } satisfies ConnectSession)) } catch {}
}
export function getConnectSession(): ConnectSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ConnectSession
    if (!s || typeof s.text !== 'string' || !s.text.trim()) return null
    if (typeof s.at === 'number' && Date.now() - s.at > SESSION_TTL_MS) { localStorage.removeItem(SESSION_KEY); return null }
    return s
  } catch { return null }
}
export function clearConnectSession(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

/** relationship → gender (single source of truth: the Understanding Engine). */
function genderForRelationship(rel: string | null): Gender | null {
  return rel ? classify(rel).gender : null
}

/* ── provisioning: turn a signed-in user + draft into a Family Space ──
   Transactional + idempotent: reuses an existing space for the same person,
   completes a partially-created one, and NEVER clears the draft until the space
   AND its ledger both exist — so any failure is safely retryable. */
export interface ProvisionResult { lovedOneId: string | null; error: string | null }
let inFlight: Promise<ProvisionResult> | null = null

export function provisionFamilySpace(): Promise<ProvisionResult> {
  if (typeof window === 'undefined') return Promise.resolve({ lovedOneId: null, error: null })
  if (!inFlight) {
    inFlight = doProvision()
    inFlight.finally(() => { inFlight = null })
  }
  return inFlight
}

async function doProvision(): Promise<ProvisionResult> {
  const draft = getConnectDraft()
  if (!draft) return { lovedOneId: null, error: null } // nothing to provision (already done)
  try {
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr) return { lovedOneId: null, error: 'network' }
    const user = auth.user
    if (!user) return { lovedOneId: null, error: 'not-signed-in' }

    // Completing the Connect experience IS this user's onboarding.
    await supabase.auth.updateUser({ data: { onboarding_complete: true } }).catch(() => {})

    const rl = readLedger(draft.rawText)

    // F8 — a space created for the VISITOR is theirs, not "your family". By this point they
    // are signed in, so we know their actual name; the engine can only ever say "You".
    const selfName = (user.user_metadata?.full_name as string | undefined)?.trim()
    const isSelf = rl.subjectKind === 'self'
    const spaceName = isSelf ? (selfName || 'You') : rl.subjectLabel
    const spaceRelationship = isSelf ? 'self' : rl.relationship

    // Idempotency: reuse an existing space for the same person (double-invoke / two tabs / retry).
    //
    // F9 — bounded by a RECENCY window, because `full_name` is not an identity. Labels like
    // "Your Sister" are not unique: a family with two sisters would have the second one's
    // space silently merged into the first's, mixing two people's facts in one ledger.
    // Merging two real people is far worse than an extra space, so reuse only extends as
    // far as the thing it exists for — a retry or a double-submit of THIS draft, which is
    // always recent. Beyond the window we create a new space rather than guess they're the
    // same person.
    const sinceIso = new Date(Date.now() - PROVISION_IDEMPOTENCY_MS).toISOString()
    const { data: existing, error: exErr } = await supabase
      .from('loved_ones')
      .select('id')
      .eq('family_user_id', user.id)
      .eq('full_name', spaceName)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (exErr) return { lovedOneId: null, error: 'network' } // draft kept → retryable

    let lovedOneId = existing?.id ?? null
    if (!lovedOneId) {
      const { data: lo, error: loErr } = await supabase
        .from('loved_ones')
        .insert({
          family_user_id: user.id, full_name: spaceName, relationship: spaceRelationship, city: rl.city,
          // the base loved_ones table has these columns NOT NULL — default to '' exactly
          // like the family "Add Loved One" flow (lib/db/family.ts); the Space treats
          // '' as "not provided yet". Without these, the insert fails a NOT NULL check.
          address: '', medical_notes: '', doctor_name: '', nearest_hospital: '',
          emergency_contact_name: '', emergency_contact_phone: '',
        })
        .select('id')
        .single()
      if (loErr || !lo) return { lovedOneId: null, error: 'could-not-create-space' } // draft kept
      lovedOneId = lo.id
    }

    // Ensure the Connect ledger exists (completes a partial provision without duplicating).
    const { count } = await supabase
      .from('family_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('loved_one_id', lovedOneId)
      .eq('source', 'connect_experience')
    if (!count) {
      const base = ledgerEntriesForStorage(rl).map((e) => ({ loved_one_id: lovedOneId, family_user_id: user.id, ...e }))
      // Anything the visitor told us on the "still open" lines — preserved, never lost.
      const extras = (draft.extras ?? []).filter((e) => e.body?.trim()).map((e) => ({
        loved_one_id: lovedOneId, family_user_id: user.id,
        entry_type: 'family_fact' as const, label: e.label, body: e.body.trim(), source: 'connect_experience' as const,
      }))
      /**
       * The engine's ORDER is part of the understanding, not decoration: subject first,
       * then what's happening, then the family's own words last. Inserted as one batch
       * they all took the same default now(), so `order by created_at` returned them
       * arbitrarily — /space rendered the quote first and the subject third, in an order
       * that could change between reads. A ledger that shows understanding in a random
       * order is not showing understanding.
       *
       * `id` cannot fix it (gen_random_uuid) and there is no sequence column, so the
       * order goes into the data where it belongs: one millisecond per entry, in engine
       * order. Stamped from the same clock that wrote them, and only ever compared to its
       * own siblings.
       */
      const t0 = Date.now()
      const rows = [...base, ...extras].map((r, i) => ({ ...r, created_at: new Date(t0 + i).toISOString() }))
      if (rows.length) {
        const { error: le } = await supabase.from('family_ledger').insert(rows)
        if (le) return { lovedOneId, error: 'ledger-failed' } // space exists; keep draft to retry the ledger
      }
    }

    clearConnectDraft() // only once the space AND its ledger are in place
    return { lovedOneId, error: null }
  } catch {
    return { lovedOneId: null, error: 'network' } // draft kept → retryable
  }
}

/* ── reading the Space (bounded + resilient) ── */
export interface TimelineEvent { id: string; when: string; title: string; sub?: string; kind: 'up' | 'now' | 'done' }
/** A person in this family — enough to draw a chip and switch to them. */
export interface SpaceMember { id: string; name: string; relationship: string | null }

export interface SpaceData {
  userName: string
  email: string
  /** The SELECTED member. Everything below (known/learned/blanks/timeline) is theirs. */
  lovedOne: { id: string; name: string; relationship: string | null; city: string | null; createdAt: string | null; regionCode: string }
  /** Everyone in the family, in the order they were added. The Space used to fetch up to
   *  20 and then use only `[0]` — so a second member was provisioned, stored, and never
   *  seen again. Adding family worked; the family just never appeared. */
  members: SpaceMember[]
  selectedId: string
  gender: Gender | null
  callName: string | null  // what the family calls this person ("Amma") — set via the "What you call her" line
  known: LedgerLine[]      // stated facts (what Connect knows)
  learned: LedgerLine[]    // lines the family told us later (most recent window, chronological)
  blanks: Blank[]          // still-open (unfilled) prompts
  timeline: TimelineEvent[]
  observedCount: number    // guardian/visit observations — the only basis for "calm"
}

function fmtWhen(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  // Through the LocaleService — India ('en-IN') renders exactly as before. Pinned to
  // DEFAULT_REGION_CODE for now; per-family locale threads through with region_code later.
  const time = formatTime(d, DEFAULT_REGION_CODE, { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  return d.toDateString() === now.toDateString() ? `Today · ${time}` : formatDate(d, DEFAULT_REGION_CODE, { day: 'numeric', month: 'short' })
}

/** Load the Space. Returns null when there's no session/space (caller routes to
 *  /connect). THROWS on a real read failure so the caller can show a retry state
 *  instead of hanging. */
export async function fetchSpace(memberId?: string): Promise<SpaceData | null> {
  const { data: auth, error: authErr } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  const user = auth.user
  if (!user) return null

  const [profRes, losRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('loved_ones').select('id, full_name, relationship, city, created_at, region_code').eq('family_user_id', user.id).order('created_at', { ascending: true }).limit(20),
  ])
  if (losRes.error) throw new Error(losRes.error.message)
  const all = losRes.data ?? []
  // The selected member — the one asked for, else the first. An unknown id (a stale link,
  // a deleted person) falls back rather than showing an empty Space.
  const lo = (memberId ? all.find((m) => m.id === memberId) : undefined) ?? all[0]
  if (!lo) return null
  const members: SpaceMember[] = all.map((m) => ({ id: m.id, name: m.full_name, relationship: m.relationship }))

  const userName = (profRes.data?.full_name || (user.user_metadata?.full_name as string) || 'there').split(' ')[0] || 'there'
  const gender = genderForRelationship(lo.relationship)

  // `id` is a secondary key ONLY to break ties deterministically — rows written before the
  // ordering fix share a timestamp, and a stable order beats one that changes per read.
  const entriesRes = await supabase.from('family_ledger').select('label, body, source, entry_type, created_at')
    .eq('loved_one_id', lo.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(WINDOW)
  if (entriesRes.error) throw new Error(entriesRes.error.message)

  const entries = (entriesRes.data ?? []).slice().reverse() // chronological
  const facts = entries.filter((e) => e.entry_type === 'family_fact')
  // The ONLY basis for the Snapshot to ever say "calm": a real person has observed him.
  // Zero today for most families, and that is correct — we never fake wellbeing.
  const observedCount = entries.filter((e) => e.entry_type === 'guardian_observation' || e.entry_type === 'visit_observation').length
  const known: LedgerLine[] = facts.filter((e) => e.source === 'connect_experience').map((e) => ({ label: e.label ?? '', body: e.body, quote: e.label === 'In your words' }))
  const spaceFacts = facts.filter((e) => e.source === 'family_space')

  // "What you call her" is stored as a fact but is a NAME, not a note — pull it out.
  const callEntry = spaceFacts.filter((e) => e.label === 'callname').slice(-1)[0]
  const callName = callEntry?.body?.trim() || null
  const learned: LedgerLine[] = spaceFacts.filter((e) => e.label !== 'callname').map((e) => ({ label: e.label ?? '', body: e.body }))

  // Never ask twice: a blank is "filled" if the family answered it in the Space
  // (learned label === key) OR already gave that fact during Connect (a known fact
  // whose label matches the blank's display label). The Space feels cumulative.
  const filledKeys = new Set(learned.map((l) => l.label))
  const knownLabels = new Set(known.map((l) => l.label))
  const alreadyKnown = (b: Blank) => { const lbl = KEY_LABEL[b.key]; return filledKeys.has(b.key) || (!!lbl && knownLabels.has(lbl)) }
  const them = pronoun.object(gender)
  const blanks: Blank[] = [
    // the first thing worth knowing: the name the family actually uses
    ...(callName ? [] : [{ key: 'callname', text: `What you call ${them}` }]),
    ...blanksFor(gender).filter((b) => !alreadyKnown(b)),
  ]

  // the name we render — the family's word ("Amma"), else the relationship lowercased
  const disp = callName || (/^your\s/i.test(lo.full_name) ? lo.full_name.toLowerCase() : lo.full_name)
  const Disp = disp.charAt(0).toUpperCase() + disp.slice(1)
  const timeline: TimelineEvent[] = [
    { id: 'opened', when: fmtWhen(lo.created_at), kind: 'done', title: `${Disp}’s space opened.` },
    { id: 'understood', when: fmtWhen(lo.created_at), kind: 'done', title: `Connect began understanding ${disp}.` },
  ]

  return {
    userName, email: user.email || '',
    lovedOne: { id: lo.id, name: lo.full_name, relationship: lo.relationship, city: lo.city, createdAt: lo.created_at, regionCode: lo.region_code ?? 'IN' },
    members, selectedId: lo.id,
    gender, callName, known, learned, blanks, timeline, observedCount,
  }
}

/** Append a fact the family told us — never overwrites; feeds future understanding. */
export async function appendLearning(lovedOneId: string, key: Blank['key'], body: string): Promise<{ line: LedgerLine | null; error: string | null }> {
  const text = body.trim()
  if (!text) return { line: null, error: 'empty' }
  try {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) return { line: null, error: 'not-signed-in' }
    const { error } = await supabase.from('family_ledger').insert({
      loved_one_id: lovedOneId, family_user_id: user.id,
      entry_type: 'family_fact', label: key, body: text, source: 'family_space',
    })
    if (error) return { line: null, error: 'could-not-save' }
    return { line: { label: key, body: text }, error: null }
  } catch {
    return { line: null, error: 'could-not-save' }
  }
}

/**
 * Ask Connect — Phase 1, deterministic and honest.
 *
 * The rule: when a question carries a concrete need — a health worry, a real-world
 * task, an emergency — the answer must address THAT need with what Close Eye can
 * actually do today (bring a trusted person; a real person
 * reachable now for anything time-sensitive). A concrete need is never met with a
 * generic "here's what I understand" summary. Otherwise it answers only from what
 * is actually known, and says plainly when it lacks context.
 */
export interface AskAnswer { text: string; whatsapp: boolean; dial?: boolean }

export function askConnect(question: string, space: SpaceData): AskAnswer {
  const name = personName(space)
  const Name = name.charAt(0).toUpperCase() + name.slice(1)
  const g = space.gender
  const they = pronoun.subject(g)
  const them = pronoun.object(g)
  const need = readLedger(question).need

  switch (need) {
    case 'emergency':
      // A signed-in family member may be the one facing a real crisis — give a
      // tappable emergency dial (matching /connect), not just prose.
      return { text: `If ${name} is in danger, call emergency services now — that has to come first. Then Close Eye can get a trusted person to ${them}, and you can reach one this minute.`, whatsapp: true, dial: true }
    case 'medical':
      return { text: `I won’t guess about health — that isn’t something an app should do. What Close Eye can do is send a trusted person to see ${name} in person. For anything that can’t wait, you can reach a real person right now.`, whatsapp: true }
    case 'errand':
      return { text: `This needs a real pair of hands, not an answer. Close Eye can put a trusted person on it for ${name} — the kind of help you’d give if you were there. If it’s time-sensitive, reach someone now.`, whatsapp: true }
    case 'companionship':
      return { text: `${Name} shouldn’t sit alone with it. Close Eye can send someone to be with ${them} — a familiar face who stays a while.`, whatsapp: false }
  }

  // No concrete need — answer only from what is actually known.
  const facts: string[] = []
  if (space.lovedOne.city) facts.push(`${they} ${g === 'they' ? 'live' : 'lives'} in ${space.lovedOne.city}`)
  if (space.known.some((k) => k.body.toLowerCase().includes('alone'))) facts.push(`${they} ${g === 'they' ? 'live' : 'lives'} alone`)

  if (facts.length === 0 && space.learned.length === 0) {
    return { text: `I’d like to understand ${name} a little better before I answer. Tell me about ${pronoun.possessive(g)} health, or the shape of ${pronoun.possessive(g)} days — then my answers will come from understanding, not guesses.`, whatsapp: false }
  }
  const knownLine = facts.length ? `From what you’ve told me, ${facts.join(', and ')}.` : `You’ve started telling me about ${name}.`
  return { text: `${knownLine} I’ll keep learning as you tell me more, and whenever ${name} needs a real person, Close Eye can bring one.`, whatsapp: false }
}
