import { supabase } from '@/lib/supabase'

/**
 * Presence Manager ↔ Family assignment model (family_assignments table). This is
 * the clean, reusable API for the assignment relationship — future modules (the
 * Super-Admin "assign PM" UI, city rostering, reporting) call these instead of
 * re-implementing the queries. Access is enforced by RLS: only a Super Admin may
 * write assignments; a Presence Manager may read their own.
 */
export interface FamilyAssignment {
  id: string
  presence_manager_id: string
  family_user_id: string
  assigned_by: string | null
  assigned_at: string
}

const ASSIGNMENT_COLS = 'id, presence_manager_id, family_user_id, assigned_by, assigned_at'

/** Assign a family to a Presence Manager (Super Admin only, per RLS). Idempotent. */
export async function assignFamilyToManager(
  presenceManagerId: string,
  familyUserId: string,
  assignedBy?: string,
): Promise<FamilyAssignment> {
  const { data, error } = await supabase
    .from('family_assignments')
    .upsert(
      { presence_manager_id: presenceManagerId, family_user_id: familyUserId, assigned_by: assignedBy ?? null },
      { onConflict: 'presence_manager_id,family_user_id' },
    )
    .select(ASSIGNMENT_COLS)
    .single()
  if (error) throw new Error(error.message)
  return data as FamilyAssignment
}

/** Remove a family from a Presence Manager (Super Admin only, per RLS). */
export async function unassignFamilyFromManager(presenceManagerId: string, familyUserId: string): Promise<void> {
  const { error } = await supabase
    .from('family_assignments')
    .delete()
    .eq('presence_manager_id', presenceManagerId)
    .eq('family_user_id', familyUserId)
  if (error) throw new Error(error.message)
}

/** Every family assigned to a Presence Manager. */
export async function fetchManagerAssignments(presenceManagerId: string): Promise<FamilyAssignment[]> {
  const { data, error } = await supabase
    .from('family_assignments')
    .select(ASSIGNMENT_COLS)
    .eq('presence_manager_id', presenceManagerId)
    .order('assigned_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as FamilyAssignment[] | null) ?? []
}

export interface PresenceManagerLite {
  id: string
  full_name: string | null
}

/** The staff users who are Presence Managers — the pool the admin assigns from. */
export async function fetchPresenceManagers(): Promise<PresenceManagerLite[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('admin_role', 'presence_manager')
    .order('full_name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as PresenceManagerLite[] | null) ?? []
}

/**
 * family_user_id → assigned presence_manager_id, for the admin families list.
 * Our product model is one PM per family; if a family carries more than one row we
 * keep the most recent. Super Admin RLS returns all rows.
 */
export async function fetchFamilyManagerMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('family_assignments')
    .select('presence_manager_id, family_user_id, assigned_at')
    .order('assigned_at', { ascending: false })
  if (error) throw new Error(error.message)
  const map = new Map<string, string>()
  for (const r of (data as { presence_manager_id: string; family_user_id: string }[] | null) ?? []) {
    if (!map.has(r.family_user_id)) map.set(r.family_user_id, r.presence_manager_id) // first = most recent
  }
  return map
}

/**
 * Set (or clear) a family's Presence Manager, keeping one-PM-per-family: unassign the
 * previous PM (if different) then assign the new one. Pass newManagerId = null to clear.
 * Super Admin only, per RLS.
 */
export async function setFamilyManager(
  familyUserId: string,
  newManagerId: string | null,
  prevManagerId: string | null,
  assignedBy?: string,
): Promise<void> {
  if (prevManagerId && prevManagerId !== newManagerId) {
    await unassignFamilyFromManager(prevManagerId, familyUserId)
  }
  if (newManagerId && newManagerId !== prevManagerId) {
    await assignFamilyToManager(newManagerId, familyUserId, assignedBy)
  }
}

/**
 * The calling family's assigned Presence Manager — first name only, via the
 * get_my_presence_manager RPC (security definer; a family can't read staff profiles
 * directly). Returns null when no PM is assigned, so Connect falls back gracefully.
 */
export async function fetchMyPresenceManager(): Promise<{ id: string; firstName: string } | null> {
  const { data, error } = await supabase.rpc('get_my_presence_manager')
  if (error) return null
  const row = (data as { manager_id: string; first_name: string | null }[] | null)?.[0]
  if (!row || !row.first_name?.trim()) return null
  return { id: row.manager_id, firstName: row.first_name.trim() }
}

/** Promote the account with this email to Presence Manager (Super Admin only, per RPC). */
export async function promotePresenceManager(email: string): Promise<{ id: string; fullName: string | null }> {
  const { data, error } = await supabase.rpc('admin_promote_pm', { p_email: email })
  if (error) throw new Error(error.message)
  const row = (data as { user_id: string; full_name: string | null }[] | null)?.[0]
  if (!row) throw new Error('Could not add this Presence Manager.')
  return { id: row.user_id, fullName: row.full_name }
}

/** Remove a Presence Manager — clears the role and their family assignments. */
export async function demotePresenceManager(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_demote_pm', { p_user_id: userId })
  if (error) throw new Error(error.message)
}
