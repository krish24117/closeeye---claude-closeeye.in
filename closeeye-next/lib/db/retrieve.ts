/**
 * Retrieve v1 — the keystone read seam (Architecture Constitution, Article I).
 *
 * Reads the Family Graph — loved_ones + family_ledger — and returns ONE versioned
 * contract (RetrievedContext) for the understanding path to reason over. This is the
 * stage that makes "Retrieve before Reason" (Principle 2) real: Close Eye never reasons
 * from an empty prompt.
 *
 * ─── G1 · CROSS-FAMILY ISOLATION IS STRUCTURAL, NOT A RUNTIME CHECK ───────────────
 * retrieve() RECEIVES the caller's RLS-scoped client. It never creates a client and
 * never sees the service-role key, so it CANNOT read another family's rows — the
 * database policy `select using (family_user_id = auth.uid())` does the scoping, and this
 * function has no way around it. A read seam that could be pointed at another family's
 * graph is not shippable; making the bypass impossible by construction is stronger than
 * testing for it. (retrieve.test.ts also asserts this file references no service-role.)
 *
 * ─── PROVENANCE IS PRESERVED, NEVER FLATTENED (Article X) ─────────────────────────
 * A fact the family stated, a guardian observed, and an inference Connect read are kept
 * in separate arrays. An inference is never handed downstream as a stated fact.
 *
 * v1 reads only. No writes, no new storage, no cache, no LLM. One seam, done correctly.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { coverageFor, type PresenceAvailability } from '@/lib/platform/service-region'

export type Provenance = 'stated' | 'observed' | 'inferred'

export interface LedgerItem {
  label: string
  body: string
  provenance: Provenance
  source: string
  at: string
}

export interface RetrievedContext {
  schemaVersion: 'retrieve.v1'
  subject: { lovedOneId: string; name: string; relationship: string | null; city: string | null } | null
  stated: LedgerItem[] // family_fact — the family's own words
  observed: LedgerItem[] // guardian_observation, visit_observation
  inferred: LedgerItem[] // ai_understanding — Connect's reading, flagged
  coverage: { presence: PresenceAvailability; financial: PresenceAvailability }
  meta: { retrievedAt: string; complete: boolean }
}

/* ── the rows we read, exactly as family_ledger stores them ── */
export interface LedgerRow {
  label: string | null
  body: string
  entry_type: string
  source: string
  created_at: string
}

const RANK: Record<Provenance, number> = { stated: 2, observed: 1, inferred: 0 }

/** Provenance from the (entry_type, source) pair — the schema tags both. */
export function provenanceOf(entryType: string, source: string): Provenance {
  if (entryType === 'ai_understanding' || source === 'ai_engine') return 'inferred'
  if (entryType === 'guardian_observation' || entryType === 'visit_observation' || source === 'guardian') return 'observed'
  return 'stated' // family_fact, correction, memory from the family / connect / space
}

/**
 * Apply corrections and split into the three provenance arrays. Pure — no I/O.
 *
 * The supersede rule (v1, no schema change): one current value per label. A stated fact
 * or a correction always outranks an inference (Article X — an inference never hardens
 * into a fact); within the same tier, the newest row wins. Superseded rows are dropped,
 * never emitted as current. Rows with no label are each distinct — nothing supersedes them.
 */
export function mergeLedger(rows: LedgerRow[]): Pick<RetrievedContext, 'stated' | 'observed' | 'inferred'> {
  const items: LedgerItem[] = rows.map((r) => ({
    label: (r.label ?? '').trim(),
    body: r.body.trim(),
    provenance: provenanceOf(r.entry_type, r.source),
    source: r.source,
    at: r.created_at,
  }))

  const winners: LedgerItem[] = []
  const byLabel = new Map<string, LedgerItem>()
  for (const it of items) {
    if (!it.label) { winners.push(it); continue } // unlabelled: always distinct
    const key = it.label.toLowerCase()
    const cur = byLabel.get(key)
    if (!cur || RANK[it.provenance] > RANK[cur.provenance] ||
        (RANK[it.provenance] === RANK[cur.provenance] && it.at > cur.at)) {
      byLabel.set(key, it)
    }
  }
  winners.push(...byLabel.values())

  const bucket = (p: Provenance) => winners.filter((w) => w.provenance === p).sort((a, b) => (a.at < b.at ? 1 : -1))
  return { stated: bucket('stated'), observed: bucket('observed'), inferred: bucket('inferred') }
}

const EMPTY = (): Pick<RetrievedContext, 'stated' | 'observed' | 'inferred'> => ({ stated: [], observed: [], inferred: [] })

/**
 * Read the Family Graph through the CALLER'S client. subjectId scopes to one loved one;
 * omit it for family-level facts. Fail-safe (Principle 7): a source that fails sets
 * meta.complete=false and yields a partial context — it NEVER throws into the family's
 * path, and NEVER fabricates to fill a gap.
 */
export async function retrieve(client: SupabaseClient, subjectId?: string | null): Promise<RetrievedContext> {
  const retrievedAt = new Date().toISOString()
  let complete = true
  let subject: RetrievedContext['subject'] = null

  // ── the subject (a loved one) ──
  if (subjectId) {
    try {
      const { data, error } = await client
        .from('loved_ones')
        .select('id, full_name, relationship, city')
        .eq('id', subjectId)
        .maybeSingle()
      if (error) throw error
      if (data) subject = { lovedOneId: data.id, name: data.full_name, relationship: data.relationship ?? null, city: data.city ?? null }
      // data === null means RLS scoped it away or it doesn't exist — subject stays null,
      // which is correct: you cannot retrieve another family's loved one.
    } catch { complete = false }
  }

  // ── the ledger ──
  let merged = EMPTY()
  try {
    let q = client.from('family_ledger').select('label, body, entry_type, source, created_at')
    if (subjectId) q = q.eq('loved_one_id', subjectId)
    const { data, error } = await q.order('created_at', { ascending: true })
    if (error) throw error
    merged = mergeLedger((data ?? []) as LedgerRow[])
  } catch { complete = false }

  const coverage = {
    presence: coverageFor('presence', subject?.city),
    financial: coverageFor('financial', subject?.city),
  }

  return { schemaVersion: 'retrieve.v1', subject, ...merged, coverage, meta: { retrievedAt, complete } }
}
