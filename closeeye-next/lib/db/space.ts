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
import { readLedger, ledgerEntriesForStorage, blanksFor, type Blank, type LedgerLine } from '@/lib/connect/ledger'

/** How many ledger entries a Space loads at once — keeps it calm at scale. */
const WINDOW = 50

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

    // Idempotency: reuse an existing space for the same person (double-invoke / two tabs / retry).
    const { data: existing, error: exErr } = await supabase
      .from('loved_ones')
      .select('id')
      .eq('family_user_id', user.id)
      .eq('full_name', rl.subjectLabel)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (exErr) return { lovedOneId: null, error: 'network' } // draft kept → retryable

    let lovedOneId = existing?.id ?? null
    if (!lovedOneId) {
      const { data: lo, error: loErr } = await supabase
        .from('loved_ones')
        .insert({ family_user_id: user.id, full_name: rl.subjectLabel, relationship: rl.relationship, city: rl.city })
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
      const rows = [...base, ...extras]
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
export interface SpaceData {
  userName: string
  email: string
  lovedOne: { id: string; name: string; relationship: string | null; city: string | null; createdAt: string | null }
  gender: Gender | null
  known: LedgerLine[]      // stated facts (what Connect knows)
  learned: LedgerLine[]    // lines the family told us later (most recent window, chronological)
  blanks: Blank[]          // still-open (unfilled) prompts
  timeline: TimelineEvent[]
}

function fmtWhen(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  return d.toDateString() === now.toDateString() ? `Today · ${time}` : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** Load the Space. Returns null when there's no session/space (caller routes to
 *  /connect). THROWS on a real read failure so the caller can show a retry state
 *  instead of hanging. */
export async function fetchSpace(): Promise<SpaceData | null> {
  const { data: auth, error: authErr } = await supabase.auth.getUser()
  if (authErr) throw new Error(authErr.message)
  const user = auth.user
  if (!user) return null

  const [profRes, losRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('loved_ones').select('id, full_name, relationship, city, created_at').eq('family_user_id', user.id).order('created_at', { ascending: true }).limit(20),
  ])
  if (losRes.error) throw new Error(losRes.error.message)
  const lo = losRes.data?.[0]
  if (!lo) return null

  const userName = (profRes.data?.full_name || (user.user_metadata?.full_name as string) || 'there').split(' ')[0] || 'there'
  const gender = genderForRelationship(lo.relationship)

  const entriesRes = await supabase.from('family_ledger').select('label, body, source, entry_type, created_at').eq('loved_one_id', lo.id).order('created_at', { ascending: false }).limit(WINDOW)
  if (entriesRes.error) throw new Error(entriesRes.error.message)

  const entries = (entriesRes.data ?? []).slice().reverse() // chronological
  const facts = entries.filter((e) => e.entry_type === 'family_fact')
  const known: LedgerLine[] = facts.filter((e) => e.source === 'connect_experience').map((e) => ({ label: e.label ?? '', body: e.body, quote: e.label === 'In your words' }))
  const learned: LedgerLine[] = facts.filter((e) => e.source === 'family_space').map((e) => ({ label: e.label ?? '', body: e.body }))

  const filledKeys = new Set(learned.map((l) => l.label))
  const blanks = blanksFor(gender).filter((b) => !filledKeys.has(b.key))

  const timeline: TimelineEvent[] = [
    { id: 'opened', when: fmtWhen(lo.created_at), kind: 'done', title: `${lo.full_name}’s space opened.` },
    { id: 'understood', when: fmtWhen(lo.created_at), kind: 'done', title: `Connect began understanding ${lo.full_name}.` },
  ]

  return {
    userName, email: user.email || '',
    lovedOne: { id: lo.id, name: lo.full_name, relationship: lo.relationship, city: lo.city, createdAt: lo.created_at },
    gender, known, learned, blanks, timeline,
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
 * Ask Connect — Phase 1, deterministic and honest. It answers only from what is
 * actually known; when it lacks context it says so plainly and never pretends.
 */
export function askConnect(question: string, space: SpaceData): string {
  const name = space.lovedOne.name
  const g = space.gender
  const they = pronoun.subject(g)
  const rl = classify(question)
  const facts: string[] = []
  if (space.lovedOne.city) facts.push(`${they} ${g === 'they' ? 'live' : 'lives'} in ${space.lovedOne.city}`)
  if (space.known.some((k) => k.body.toLowerCase().includes('alone'))) facts.push(`${they} ${g === 'they' ? 'live' : 'lives'} alone`)

  if (facts.length === 0 && space.learned.length === 0) {
    return `I’d like to understand ${name} a little better before I answer. Tell me about ${pronoun.possessive(g)} health, or the shape of ${pronoun.possessive(g)} days — then my answers will come from understanding, not guesses.`
  }
  const intentLine =
    rl.intent === 'medicine' ? `On ${pronoun.possessive(g)} medicines, I only know what your family has recorded — I never guess a dose or a routine.`
    : rl.intent === 'emergency' ? `If something feels urgent, reach your Presence Manager on WhatsApp right away — a real person will help.`
    : `Here is what I understand so far, and I’ll keep learning as you tell me more.`
  const knownLine = facts.length ? `From what you’ve told me, ${facts.join(', and ')}.` : `You’ve started telling me about ${name}.`
  return `${knownLine} ${intentLine}`
}
