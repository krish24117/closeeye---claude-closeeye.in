/**
 * Close Eye — Read-only Postgres reader for the Identity Shadow (Phase A · A5).
 *
 * A ShadowReader backed by a DIRECT read-only Postgres connection using the
 * SELECT-only role. It issues only SELECT statements; the SELECT-only database role
 * is the second, structural guarantee that no write is possible. This is the only
 * reader that can see across all families (needed for parity) while preserving the
 * zero-writes guarantee — a service key could write, so it is deliberately not used.
 *
 * Zero secrets (§6): the connection string comes from a server-side env var
 * (SHADOW_RO_DATABASE_URL) — never hardcoded, never logged. Server-only (Node runtime).
 */

import { Pool } from 'pg'
import type { LovedOne, Profile } from '@/lib/db/types'
import type { FamilyAssignmentRow } from './adapter'
import type { ShadowReader } from './shadow-source'

/**
 * Build a read-only reader over a SELECT-only Postgres role. Returns the reader and
 * a `close()` to release the pool. A short CONNECTION timeout and statement timeout
 * plus a tiny pool keep the out-of-band read from ever hanging or contending with
 * production — it fails fast rather than occupying a function (zero performance
 * regression, clean failure signal).
 */
export function createPostgresReadonlyReader(connectionString: string): { reader: ShadowReader; close: () => Promise<void> } {
  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 10000,
    statement_timeout: 5000,
    application_name: 'closeeye-shadow-ro',
  })

  const reader: ShadowReader = {
    async readProfiles() {
      const { rows } = await pool.query('select id, full_name, role, admin_role, phone, whatsapp_number, address from public.profiles')
      return rows as Profile[]
    },
    async readLovedOnes() {
      const { rows } = await pool.query(
        'select id, family_user_id, full_name, relationship, age, city, address, phone_number, medical_notes, doctor_name, nearest_hospital, emergency_contact_name, emergency_contact_phone, created_at from public.loved_ones',
      )
      return rows as LovedOne[]
    },
    async readFamilyAssignments() {
      const { rows } = await pool.query('select id, presence_manager_id, family_user_id, assigned_by, assigned_at from public.family_assignments')
      return rows as FamilyAssignmentRow[]
    },
  }

  return { reader, close: () => pool.end() }
}
