import type { Profile } from '@/lib/db/types'

/**
 * The four CloseEye platform roles, derived from the `profiles` row. This is the
 * app-side mirror of the SQL authorization helpers (is_admin / is_presence_manager
 * / can_manage_family). Row-level access is enforced by RLS in the database — these
 * helpers only decide which UI a signed-in user may open. Never hardcode role
 * strings in components; import from here so the model has a single source of truth.
 */
export type AppRole = 'super_admin' | 'presence_manager' | 'guardian' | 'doctor' | 'family'

/** Super Admin — full platform access (profiles.role='admin'; mirrors SQL is_admin()). */
export function isSuperAdmin(p: Profile | null | undefined): boolean {
  return p?.role === 'admin'
}

/** Presence Manager — scoped to assigned families (profiles.admin_role='presence_manager'). */
export function isPresenceManager(p: Profile | null | undefined): boolean {
  return p?.admin_role === 'presence_manager'
}

/** Guardian — the field caregiver, scoped to assigned visits (the companion model). */
export function isGuardian(p: Profile | null | undefined): boolean {
  return p?.admin_role === 'companion'
}

/** Doctor — the Medical Concierge, scoped to assigned member queries. */
export function isDoctor(p: Profile | null | undefined): boolean {
  return p?.admin_role === 'doctor'
}

/** May open the operations console (Super Admin or Presence Manager). */
export function canUseConsole(p: Profile | null | undefined): boolean {
  return isSuperAdmin(p) || isPresenceManager(p)
}

/** The caller's single effective platform role. */
export function roleOf(p: Profile | null | undefined): AppRole {
  if (isSuperAdmin(p)) return 'super_admin'
  if (isPresenceManager(p)) return 'presence_manager'
  if (isGuardian(p)) return 'guardian'
  if (isDoctor(p)) return 'doctor'
  return 'family'
}
