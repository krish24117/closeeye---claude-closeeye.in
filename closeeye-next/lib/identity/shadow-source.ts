/**
 * Close Eye — Identity Shadow source (Migration Phase A · increment A2).
 *
 * Reads the current production tables READ-ONLY and assembles the new Identity
 * model (per family) via the pure A1 adapter. Nothing is written; nothing is wired
 * into a request path. The reader is INJECTED, so this module is infra-agnostic and
 * fully testable — and, by design, has no way to write.
 *
 * Safety (Constitution §2g — zero writes): the ShadowReader interface exposes reads
 * only. In production it is backed by a SELECT-only database role on a read replica,
 * so the guarantee holds at BOTH the code level (no write methods exist here) and the
 * database level (the role cannot write). The live read is out-of-band, run by the
 * validation harness in a later increment — never on a family's request path.
 *
 * Design note (Constitution §6): clarity over cleverness. Plain reads, plain grouping.
 */

// Zero secrets (Constitution §6): this module hardcodes NO credentials, keys, or
// connection strings. The Supabase client is injected; its read-only role/connection
// is built from server-side environment config elsewhere, never here, never logged.
//
// Read replica (Phase A recommendation): at our current scale a read replica is NOT
// required. The source tables are tiny and the shadow reads are out-of-band, throttled,
// and low-frequency, so a SELECT-only role on the primary satisfies zero-writes AND
// zero-performance-regression. Revisit a replica only when a named trigger appears
// (table growth or measurable primary-latency impact). Either way, Shadow fails closed:
// if the read source is unavailable, it disables itself — it never touches production.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LovedOne, Profile } from '@/lib/db/types'
import {
  consentFromAssignment,
  familyFromProfile,
  familyMemberFromProfile,
  personFromLovedOne,
  type FamilyAssignmentRow,
} from './adapter'
import type { Consent, Family, FamilyMember, Person } from './model'

/** The read-only surface the shadow needs. Reads only — there is no write method. */
export interface ShadowReader {
  readProfiles(): Promise<Profile[]>
  readLovedOnes(): Promise<LovedOne[]>
  readFamilyAssignments(): Promise<FamilyAssignmentRow[]>
}

/** The new Identity model for one family, assembled from production data. */
export interface ShadowFamily {
  family: Family
  owner: FamilyMember
  persons: Person[]
  consents: Consent[]
}

/**
 * Read the three source tables and assemble the shadow Identity model, grouped
 * strictly by family so no family's records ever mix with another's. Pure aside
 * from the injected reads.
 */
export async function loadShadowIdentity(reader: ShadowReader): Promise<ShadowFamily[]> {
  const [profiles, lovedOnes, assignments] = await Promise.all([
    reader.readProfiles(),
    reader.readLovedOnes(),
    reader.readFamilyAssignments(),
  ])

  // Today one account holder == one family, so the family id is the profile id.
  return profiles.map((p) => {
    const familyId = p.id
    return {
      family: familyFromProfile(p),
      owner: familyMemberFromProfile(p),
      persons: lovedOnes.filter((lo) => lo.family_user_id === familyId).map(personFromLovedOne),
      consents: assignments.filter((a) => a.family_user_id === familyId).map(consentFromAssignment),
    }
  })
}

/**
 * A ShadowReader backed by a Supabase client that MUST be configured with a
 * read-only (SELECT-only) database role. This adapter only ever calls `.select()`;
 * it has no path to insert, update, or delete. Not imported by any request path —
 * it is wired into the out-of-band shadow harness once the read-only role/replica
 * exists (a founder-provisioned prerequisite).
 */
export function createSupabaseShadowReader(client: SupabaseClient): ShadowReader {
  return {
    async readProfiles() {
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, role, admin_role, phone, whatsapp_number, address')
      if (error) throw new Error(`shadow readProfiles: ${error.message}`)
      return (data ?? []) as Profile[]
    },
    async readLovedOnes() {
      const { data, error } = await client
        .from('loved_ones')
        .select(
          'id, family_user_id, full_name, relationship, age, city, address, phone_number, medical_notes, doctor_name, nearest_hospital, emergency_contact_name, emergency_contact_phone, created_at',
        )
      if (error) throw new Error(`shadow readLovedOnes: ${error.message}`)
      return (data ?? []) as LovedOne[]
    },
    async readFamilyAssignments() {
      const { data, error } = await client
        .from('family_assignments')
        .select('id, presence_manager_id, family_user_id, assigned_by, assigned_at')
      if (error) throw new Error(`shadow readFamilyAssignments: ${error.message}`)
      return (data ?? []) as FamilyAssignmentRow[]
    },
  }
}

/**
 * Whether the shadow read is enabled. DISABLED by default — Shadow only ever runs
 * when explicitly turned on, and can be turned off instantly (the kill-switch that
 * gives instant rollback). Config, not a secret.
 */
export function isShadowEnabled(): boolean {
  return process.env.SHADOW_ENABLED === 'true'
}

/** The outcome of a shadow load — shaped for observability, never for a request path. */
export interface ShadowLoadResult {
  enabled: boolean
  ok: boolean
  families: ShadowFamily[]
  error?: string
}

/**
 * Fail-closed entry point (Constitution §6 — observability before access; §2g).
 * Shadow is disabled by default; when enabled, ANY failure (e.g. the read-only source
 * being unavailable) disables this run and returns an empty result. It never throws
 * into, and never falls back to, production behaviour — the live product is untouched
 * whether Shadow succeeds, is off, or fails.
 */
export async function safeLoadShadowIdentity(
  reader: ShadowReader,
  opts: { enabled?: boolean } = {},
): Promise<ShadowLoadResult> {
  const enabled = opts.enabled ?? isShadowEnabled()
  if (!enabled) return { enabled: false, ok: true, families: [] }
  try {
    const families = await loadShadowIdentity(reader)
    return { enabled: true, ok: true, families }
  } catch (err) {
    return { enabled: true, ok: false, families: [], error: err instanceof Error ? err.message : String(err) }
  }
}
