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
