/**
 * Close Eye — Shadow Runner (Migration Phase A · increment A5).
 *
 * Orchestrates one out-of-band validation pass: read production READ-ONLY (via an
 * injected reader), assemble the shadow Identity model, generate authorization
 * probes, and build the Migration Control Center + Founder Report.
 *
 * A5 is the first phase that touches production, so the safety posture is strict:
 * DISABLED by default, FAIL-CLOSED on any error, ZERO writes (the reader has no
 * write method), and independent of the live app (invoked only by an admin-only,
 * out-of-band surface). It never touches a family's request path.
 *
 * Deterministic aside from the injected reads and clock — pass `now` for reproducible
 * reports in tests. Guarantees preserved: zero writes, zero behaviour change, zero
 * downtime, instant rollback, zero performance regression.
 */

import { assembleShadowIdentity, isShadowEnabled, type ShadowFamily, type ShadowReader } from './shadow-source'
import {
  buildMigrationControlCenter,
  type AuthProbe,
  type MigrationControlCenter,
  type ProductionSnapshot,
} from './migration-control'

const EMPTY_SNAPSHOT: ProductionSnapshot = { profiles: [], lovedOnes: [], assignments: [] }

/**
 * Generate authorization probes whose expected outcomes are the CURRENT system's
 * behaviour, so authorization parity means "the shadow gate reproduces production":
 * an owner sees their own people, an assigned Presence Manager sees the family, and
 * an unassigned principal is denied.
 */
export function generateAuthProbes(families: ShadowFamily[]): AuthProbe[] {
  const probes: AuthProbe[] = []
  for (const f of families) {
    const familyId = f.family.id
    for (const person of f.persons) {
      const objectRef = `person:${person.id}`
      probes.push({ familyId, grantee: `family:${familyId}`, objectRef, purpose: 'care-coordination', expected: 'allow', label: `owner sees ${person.id}` })
      for (const c of f.consents) {
        probes.push({ familyId, grantee: c.grantee, objectRef, purpose: 'care-coordination', expected: 'allow', label: `${c.grantee} sees ${person.id}` })
      }
      probes.push({
        familyId,
        grantee: 'presence_manager:__unassigned__',
        objectRef,
        purpose: 'care-coordination',
        expected: 'deny',
        label: `unassigned PM denied on ${person.id}`,
      })
    }
  }
  return probes
}

export interface RunShadowOptions {
  enabled?: boolean
  budgetMs?: number
  windowStable?: boolean
  /** Injectable clock for deterministic tests; defaults to Date.now in production. */
  now?: () => number
}

/**
 * Run one shadow validation pass and return the Migration Control Center.
 * Never throws — any failure yields a "failed" health and an empty result, so the
 * caller (an out-of-band admin surface) can render the report without risk.
 */
export async function runShadowReport(reader: ShadowReader, opts: RunShadowOptions = {}): Promise<MigrationControlCenter> {
  const enabled = opts.enabled ?? isShadowEnabled()
  if (!enabled) {
    return buildMigrationControlCenter({
      shadow: { enabled: false, ok: true, families: [] },
      source: EMPTY_SNAPSHOT,
      authProbes: [],
      loadMs: 0,
      budgetMs: opts.budgetMs,
      windowStable: opts.windowStable,
    })
  }

  const clock = opts.now ?? Date.now
  const start = clock()
  try {
    const [profiles, lovedOnes, assignments] = await Promise.all([
      reader.readProfiles(),
      reader.readLovedOnes(),
      reader.readFamilyAssignments(),
    ])
    const source: ProductionSnapshot = { profiles, lovedOnes, assignments }
    const families = assembleShadowIdentity(source)
    const loadMs = clock() - start
    return buildMigrationControlCenter({
      shadow: { enabled: true, ok: true, families },
      source,
      authProbes: generateAuthProbes(families),
      loadMs,
      budgetMs: opts.budgetMs,
      windowStable: opts.windowStable,
    })
  } catch (err) {
    // Fail closed: report a failed shadow, touch nothing in production.
    return buildMigrationControlCenter({
      shadow: { enabled: true, ok: false, families: [], error: err instanceof Error ? err.message : String(err) },
      source: EMPTY_SNAPSHOT,
      authProbes: [],
      loadMs: clock() - start,
      budgetMs: opts.budgetMs,
      windowStable: opts.windowStable,
    })
  }
}
