/**
 * Retrieve v1 — the acceptance gate (spec: docs/retrieve_v1_spec.html).
 *
 * The gate IS the spec. Retrieve v1 is done when G1–G6 are green.
 *   G1  cross-family isolation   (the one that ends the company if wrong)
 *   G2  never invent
 *   G3  provenance integrity
 *   G4  correction supersedes
 *   G5  fail-safe
 *   G6  versioned & stable
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { retrieve, mergeLedger, provenanceOf, type LedgerRow } from './retrieve'

/* ── a mock of the caller's client — resolves configured rows per table, or throws ── */
type TableCfg = { data?: unknown; error?: unknown; throws?: boolean }
function mockClient(tables: Record<string, TableCfg>): SupabaseClient {
  const build = (cfg: TableCfg) => {
    const settle = () => (cfg.throws ? Promise.reject(new Error('source down')) : Promise.resolve({ data: cfg.data ?? [], error: cfg.error ?? null }))
    const b: Record<string, unknown> = {}
    b.select = () => b
    b.eq = () => b
    b.order = () => settle()
    b.maybeSingle = () => (cfg.throws ? Promise.reject(new Error('source down')) : Promise.resolve({ data: cfg.data ?? null, error: cfg.error ?? null }))
    return b
  }
  return { from: (t: string) => build(tables[t] ?? { data: [] }) } as unknown as SupabaseClient
}

const row = (o: Partial<LedgerRow>): LedgerRow => ({
  label: null, body: 'x', entry_type: 'family_fact', source: 'family_space', created_at: '2026-01-01T00:00:00Z', ...o,
})

/* ════════ G1 · CROSS-FAMILY ISOLATION — structural ════════
   retrieve() reads through the client it is HANDED; it cannot forge one. The proof is
   that the source references no service-role key and creates no client — so there is no
   path by which it could read another family's rows. RLS (family_user_id = auth.uid())
   does the scoping; this function has no way around it. */
describe('G1 · cross-family isolation is structural', () => {
  // Check CODE, not documentation — strip comments so the prose that EXPLAINS the
  // guarantee ("never sees the service-role key") can't be mistaken for using it.
  const raw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'retrieve.ts'), 'utf8')
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  it('the code never reaches for a service-role key', () => {
    expect(src).not.toMatch(/SERVICE_ROLE/)
    expect(src).not.toMatch(/service_role/)
  })
  it('the code never creates its own client — it only receives one', () => {
    expect(src).not.toMatch(/createClient/)
    expect(src).not.toMatch(/from ['"]@\/lib\/supabase['"]/) // nor imports the app singleton
  })
  it('reads only through the passed client', async () => {
    let usedTables: string[] = []
    const spy = { from: (t: string) => { usedTables.push(t); return mockClient({}).from(t) } } as unknown as SupabaseClient
    await retrieve(spy, 'lo-1')
    expect(usedTables.every((t) => t === 'loved_ones' || t === 'family_ledger')).toBe(true)
  })
})

/* ════════ G2 · NEVER INVENT ════════ */
describe('G2 · never invent', () => {
  it('an empty graph yields an empty context — no fabricated facts', async () => {
    const ctx = await retrieve(mockClient({ loved_ones: { data: null }, family_ledger: { data: [] } }), 'lo-1')
    expect(ctx.stated).toEqual([])
    expect(ctx.observed).toEqual([])
    expect(ctx.inferred).toEqual([])
    expect(ctx.subject).toBe(null)
  })
  it('no subject, no city → coverage unknown, never assumed', async () => {
    const ctx = await retrieve(mockClient({ family_ledger: { data: [] } }))
    expect(ctx.coverage).toEqual({ presence: 'unknown', financial: 'unknown' })
  })
})

/* ════════ G3 · PROVENANCE INTEGRITY ════════ */
describe('G3 · provenance integrity — an inference is never a stated fact', () => {
  it('maps entry_type/source to the right tier', () => {
    expect(provenanceOf('family_fact', 'connect_experience')).toBe('stated')
    expect(provenanceOf('correction', 'family_space')).toBe('stated')
    expect(provenanceOf('guardian_observation', 'guardian')).toBe('observed')
    expect(provenanceOf('visit_observation', 'guardian')).toBe('observed')
    expect(provenanceOf('ai_understanding', 'ai_engine')).toBe('inferred')
    expect(provenanceOf('memory', 'ai_engine')).toBe('inferred') // source wins: an AI memory is inferred
  })
  it('routes each row to its provenance array', () => {
    const m = mergeLedger([
      row({ label: 'Someone you love', body: 'Amma', entry_type: 'family_fact', source: 'family_space' }),
      row({ label: 'Her mood', body: 'quiet today', entry_type: 'guardian_observation', source: 'guardian', created_at: '2026-02-01T00:00:00Z' }),
      row({ label: 'What she needs', body: 'company', entry_type: 'ai_understanding', source: 'ai_engine', created_at: '2026-02-02T00:00:00Z' }),
    ])
    expect(m.stated.map((x) => x.body)).toEqual(['Amma'])
    expect(m.observed.map((x) => x.body)).toEqual(['quiet today'])
    expect(m.inferred.map((x) => x.body)).toEqual(['company'])
  })
})

/* ════════ G4 · CORRECTION SUPERSEDES (Article X) ════════ */
describe('G4 · a correction outranks the inference it corrects', () => {
  it('stated beats inferred for the same label, even when the inference is newer', () => {
    const m = mergeLedger([
      row({ label: 'Her health', body: 'she is fine', entry_type: 'family_fact', source: 'family_space', created_at: '2026-01-01T00:00:00Z' }),
      row({ label: 'Her health', body: 'I read: unwell', entry_type: 'ai_understanding', source: 'ai_engine', created_at: '2026-03-01T00:00:00Z' }),
    ])
    expect(m.stated.map((x) => x.body)).toEqual(['she is fine'])
    expect(m.inferred).toEqual([]) // the superseded inference is DROPPED, never shown as current
  })
  it('within the same tier, the newest wins', () => {
    const m = mergeLedger([
      row({ label: 'Her city', body: 'Pune', entry_type: 'family_fact', source: 'family_space', created_at: '2026-01-01T00:00:00Z' }),
      row({ label: 'Her city', body: 'Hyderabad', entry_type: 'correction', source: 'family_space', created_at: '2026-05-01T00:00:00Z' }),
    ])
    expect(m.stated.map((x) => x.body)).toEqual(['Hyderabad'])
  })
  it('unlabelled rows are never merged away', () => {
    const m = mergeLedger([row({ label: null, body: 'a' }), row({ label: '', body: 'b' })])
    expect(m.stated.map((x) => x.body).sort()).toEqual(['a', 'b'])
  })
})

/* ════════ G5 · FAIL-SAFE (Principle 7) ════════ */
describe('G5 · a source failure degrades, never throws, never fabricates', () => {
  it('ledger read throws → complete:false, empty arrays, no exception', async () => {
    const ctx = await retrieve(mockClient({ loved_ones: { data: { id: 'lo-1', full_name: 'Amma', relationship: 'mother', city: 'Hyderabad' } }, family_ledger: { throws: true } }), 'lo-1')
    expect(ctx.meta.complete).toBe(false)
    expect(ctx.stated).toEqual([])
    expect(ctx.subject?.name).toBe('Amma') // the part that succeeded is still returned
  })
  it('subject read errors → complete:false, subject null, still usable', async () => {
    const ctx = await retrieve(mockClient({ loved_ones: { error: { message: 'boom' } }, family_ledger: { data: [] } }), 'lo-1')
    expect(ctx.meta.complete).toBe(false)
    expect(ctx.subject).toBe(null)
  })
})

/* ════════ G6 · VERSIONED & STABLE ════════ */
describe('G6 · the contract is versioned and stable', () => {
  it('always carries schemaVersion and the full shape', async () => {
    const ctx = await retrieve(mockClient({
      loved_ones: { data: { id: 'lo-1', full_name: 'Amma', relationship: 'mother', city: 'Hyderabad' } },
      family_ledger: { data: [row({ label: 'x', body: 'y' })] },
    }), 'lo-1')
    expect(ctx.schemaVersion).toBe('retrieve.v1')
    expect(ctx).toHaveProperty('stated'); expect(ctx).toHaveProperty('observed'); expect(ctx).toHaveProperty('inferred')
    expect(ctx.coverage).toEqual({ presence: 'available', financial: 'available' }) // Hyderabad
    expect(ctx.meta.complete).toBe(true)
    expect(typeof ctx.meta.retrievedAt).toBe('string')
  })
  it('carries coverage from the subject city — Delhi: no presence, yes finance', async () => {
    const ctx = await retrieve(mockClient({
      loved_ones: { data: { id: 'lo-2', full_name: 'Appa', relationship: 'father', city: 'Delhi' } },
      family_ledger: { data: [] },
    }), 'lo-2')
    expect(ctx.coverage).toEqual({ presence: 'unavailable', financial: 'available' })
  })
})
