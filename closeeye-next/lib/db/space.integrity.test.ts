/**
 * LONG-TERM MEMORY INTEGRITY GATE.
 *
 * The immutable family_ledger is the foundation of the Family Understanding Engine.
 * This proves the guarantees the Constitution requires: memory is APPENDED, never
 * overwritten; provenance is preserved on every entry; provisioning is idempotent
 * (never a duplicate space, never a lost draft on failure); and what a family tells
 * us survives. Two layers: (1) the code path, against an in-memory Supabase fake
 * that FAILS the test if any UPDATE/DELETE is ever issued against the ledger; and
 * (2) the migration itself, which enforces immutability at the database.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/* ── in-memory Supabase fake (tracks any illegal mutation of the ledger) ── */
const H = vi.hoisted(() => {
  const store = { loved_ones: [] as Record<string, unknown>[], family_ledger: [] as Record<string, unknown>[], profiles: [] as Record<string, unknown>[] }
  const arrOf = (t: string) => (store as Record<string, Record<string, unknown>[]>)[t]!
  const tracker = {
    user: { id: 'u1', email: 'k@example.com', user_metadata: { full_name: 'Krishna' } } as { id: string; email: string; user_metadata: Record<string, unknown> } | null,
    seq: 0, illegal: null as string | null, failInsert: null as string | null,
  }
  function makeQB(table: string) {
    const b: Record<string, unknown> = { op: 'select', rows: null as Record<string, unknown>[] | null, head: false, filters: [] as [string, unknown][], gtes: [] as [string, unknown][], _single: false, _maybe: false }
    b.insert = (rows: Record<string, unknown> | Record<string, unknown>[]) => { b.op = 'insert'; b.rows = Array.isArray(rows) ? rows : [rows]; return b }
    b.select = (_c?: string, opts?: { head?: boolean }) => { if (opts?.head) b.head = true; return b }
    b.eq = (c: string, v: unknown) => { (b.filters as [string, unknown][]).push([c, v]); return b }
    // Modelled because provisioning bounds its idempotency by a recency window; without
    // `gte` the fake would silently diverge from the database it stands in for.
    b.gte = (c: string, v: unknown) => { (b.gtes as [string, unknown][]).push([c, v]); return b }
    b.order = () => b
    b.limit = () => b
    b.single = () => { b._single = true; return b }
    b.maybeSingle = () => { b._maybe = true; return b }
    b.update = () => { tracker.illegal = `UPDATE on ${table}`; throw new Error('ledger is immutable') }
    b.delete = () => { tracker.illegal = `DELETE on ${table}`; throw new Error('ledger is immutable') }
    b._run = () => {
      if (b.op === 'insert') {
        if (tracker.failInsert === table) { tracker.failInsert = null; return { data: null, error: { message: 'forced failure' } } }
        // created_at is a database default in production; the fake must supply it too, or
        // every recency-bounded query here would test something the DB never does.
        const inserted = (b.rows as Record<string, unknown>[]).map((r) => ({ id: `id_${++tracker.seq}`, created_at: new Date().toISOString(), ...r }))
        arrOf(table).push(...inserted)
        return b._single ? { data: { id: inserted[0]!.id }, error: null } : { data: null, error: null }
      }
      const rows = arrOf(table).filter((row) =>
        (b.filters as [string, unknown][]).every(([c, v]) => row[c] === v) &&
        (b.gtes as [string, unknown][]).every(([c, v]) => String(row[c] ?? '') >= String(v)))
      if (b.head) return { count: rows.length, error: null, data: null }
      if (b._single || b._maybe) return { data: rows[0] ?? null, error: null }
      return { data: rows, error: null }
    }
    b.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) => { try { res((b._run as () => unknown)()) } catch (e) { if (rej) rej(e); else throw e } }
    return b
  }
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: tracker.user }, error: tracker.user ? null : { message: 'no user' } }),
      updateUser: async ({ data }: { data: Record<string, unknown> }) => { if (tracker.user) tracker.user.user_metadata = { ...tracker.user.user_metadata, ...data }; return { error: null } },
    },
    from: (t: string) => makeQB(t),
  }
  return { store, tracker, supabase }
})
vi.mock('@/lib/supabase', () => ({ supabase: H.supabase, isSupabaseConfigured: true }))

// minimal window/localStorage so the draft (localStorage) works in the node env
const _mem = new Map<string, string>()
const g = globalThis as unknown as { window?: unknown; localStorage?: unknown }
g.localStorage = { getItem: (k: string) => (_mem.has(k) ? _mem.get(k)! : null), setItem: (k: string, v: string) => { _mem.set(k, String(v)) }, removeItem: (k: string) => { _mem.delete(k) }, clear: () => _mem.clear() }
g.window = { localStorage: g.localStorage }

import { setConnectDraft, getConnectDraft, provisionFamilySpace, appendLearning, fetchSpace } from '@/lib/db/space'

const DRAFT = 'My mother lives alone in Hyderabad. How do I know she is okay?'

beforeEach(() => {
  H.store.loved_ones.length = 0; H.store.family_ledger.length = 0; H.store.profiles.length = 0
  H.tracker.seq = 0; H.tracker.illegal = null; H.tracker.failInsert = null
  H.tracker.user = { id: 'u1', email: 'k@example.com', user_metadata: { full_name: 'Krishna' } }
  localStorage.clear()
})

describe('Family memory — integrity (code path)', () => {
  it('provisions a space, writes the ledger with provenance, and clears the draft', async () => {
    setConnectDraft(DRAFT)
    const res = await provisionFamilySpace()
    expect(res.error).toBeNull()
    expect(H.store.loved_ones).toHaveLength(1)
    expect(H.store.loved_ones[0]!.full_name).toBe('Your Mother')
    expect(H.store.family_ledger.length).toBeGreaterThan(0)
    for (const e of H.store.family_ledger) {
      // A stated fact is a family_fact; Connect's own reading is an ai_understanding.
      // Nothing else may be written from this path.
      expect(['family_fact', 'ai_understanding']).toContain(e.entry_type)
      expect(e.source).toBe('connect_experience')
    }
    // The line that matters: Connect's READING must never enter family memory as a FACT.
    // /space renders family_fact rows as "what Connect knows" — a guess stored there would
    // be repeated back to the family as truth, forever.
    const reading = H.store.family_ledger.find((e) => e.label === 'What I think you need')
    expect(reading, 'the concern line must be persisted').toBeDefined()
    expect(reading!.entry_type).toBe('ai_understanding')
    // ...and every line that IS a family_fact must be one the visitor actually stated.
    for (const e of H.store.family_ledger.filter((x) => x.entry_type === 'family_fact')) {
      expect(e.label).not.toBe('What I think you need')
    }
    expect(getConnectDraft()).toBeNull() // cleared only after success
  })

  it('is idempotent — re-provisioning the same person never duplicates the space or its ledger', async () => {
    setConnectDraft(DRAFT); await provisionFamilySpace()
    const ledgerAfterFirst = H.store.family_ledger.length
    setConnectDraft(DRAFT); await provisionFamilySpace() // same person again
    expect(H.store.loved_ones).toHaveLength(1)
    expect(H.store.family_ledger.length).toBe(ledgerAfterFirst) // no duplicate memory
  })

  // F8 — a space created for the VISITOR is theirs. It was named "Your family", which is
  // both wrong and the one label we never had to guess: they are signed in.
  it('a request for yourself creates YOUR space, under your own name — never "Your family"', async () => {
    setConnectDraft('This is for me. I am moving to Bangalore and need local support.')
    const res = await provisionFamilySpace()
    expect(res.error).toBeNull()
    expect(H.store.loved_ones).toHaveLength(1)
    expect(H.store.loved_ones[0]!.full_name).toBe('Krishna') // the signed-in user's name
    expect(H.store.loved_ones[0]!.full_name).not.toBe('Your family')
    expect(H.store.loved_ones[0]!.relationship).toBe('self')
  })

  it('falls back to "You" when we have no name for them — never to a name we invented', async () => {
    H.tracker.user = { id: 'u1', email: 'k@example.com', user_metadata: {} } // no full_name
    setConnectDraft('This is for me. I am moving to Bangalore and need local support.')
    await provisionFamilySpace()
    expect(H.store.loved_ones[0]!.full_name).toBe('You')
  })

  // F9 — `full_name` is a label, not an identity. Reuse must not stretch far enough to
  // merge two real people who share one ("Your Sister"), mixing their facts in one ledger.
  it('never merges a new person into an old space that merely shares a label', async () => {
    H.store.loved_ones.push({
      id: 'old_space', family_user_id: 'u1', full_name: 'Your Mother', relationship: 'mother',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    })
    setConnectDraft(DRAFT) // also resolves to "Your Mother"
    const res = await provisionFamilySpace()
    expect(res.error).toBeNull()
    expect(res.lovedOneId).not.toBe('old_space') // a new space, not a silent merge
    expect(H.store.loved_ones).toHaveLength(2)
  })

  it('never loses the draft on failure, and a retry completes', async () => {
    setConnectDraft(DRAFT)
    H.tracker.failInsert = 'loved_ones'
    const bad = await provisionFamilySpace()
    expect(bad.error).toBeTruthy()
    expect(H.store.loved_ones).toHaveLength(0)
    expect(getConnectDraft()).not.toBeNull() // draft preserved — retryable
    const good = await provisionFamilySpace() // retry
    expect(good.error).toBeNull()
    expect(H.store.loved_ones).toHaveLength(1)
    expect(getConnectDraft()).toBeNull()
  })

  it('APPENDS what the family tells us with its own provenance — earlier memory stays intact', async () => {
    setConnectDraft(DRAFT); await provisionFamilySpace()
    const before = H.store.family_ledger.length
    const loId = H.store.loved_ones[0]!.id as string
    const r = await appendLearning(loId, 'health', 'She has diabetes and sees the doctor monthly.')
    expect(r.error).toBeNull()
    expect(H.store.family_ledger.length).toBe(before + 1) // appended, not replaced
    const learned = H.store.family_ledger.find((e) => e.source === 'family_space')!
    expect(learned.entry_type).toBe('family_fact')
    expect(learned.label).toBe('health')
    expect(String(learned.body)).toContain('diabetes')
    // every original connect fact is still there
    expect(H.store.family_ledger.filter((e) => e.source === 'connect_experience').length).toBe(before)
  })

  it('never issues an UPDATE or DELETE against the ledger (immutable by construction)', async () => {
    setConnectDraft(DRAFT); await provisionFamilySpace()
    const loId = H.store.loved_ones[0]!.id as string
    await appendLearning(loId, 'health', 'note one')
    await appendLearning(loId, 'nearby', 'note two')
    expect(H.tracker.illegal).toBeNull()
  })

  it('reconstructs the Space from memory — a told fact persists and fills its blank', async () => {
    setConnectDraft(DRAFT); await provisionFamilySpace()
    const loId = H.store.loved_ones[0]!.id as string
    await appendLearning(loId, 'health', 'She has diabetes.')
    const space = await fetchSpace()
    expect(space).not.toBeNull()
    expect(space!.known.length).toBeGreaterThan(0)              // connect facts remembered
    expect(space!.learned.some((l) => l.body.includes('diabetes'))).toBe(true) // told fact remembered
    expect(space!.blanks.some((b) => b.key === 'health')).toBe(false)          // that blank is now filled
  })
})

describe('Family memory — integrity (database enforces immutability)', () => {
  const sql = fs.readFileSync(path.resolve(process.cwd(), '../supabase/migrations/20260739000000_family_ledger.sql'), 'utf8')
  it('enables RLS and owner-only select + insert', () => {
    expect(/enable row level security/i.test(sql)).toBe(true)
    expect(/for select/i.test(sql)).toBe(true)
    expect(/for insert/i.test(sql)).toBe(true)
  })
  it('has NO update or delete policy — the ledger cannot be rewritten', () => {
    expect(/for update/i.test(sql)).toBe(false)
    expect(/for delete/i.test(sql)).toBe(false)
  })
  it('grants only select + insert to authenticated (immutable at the privilege layer)', () => {
    expect(/revoke all on public\.family_ledger from authenticated/i.test(sql)).toBe(true)
    expect(/grant select, insert on public\.family_ledger to authenticated/i.test(sql)).toBe(true)
  })
})
