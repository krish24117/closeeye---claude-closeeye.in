import { supabase } from '@/lib/supabase'
import type { PlanId } from '@/lib/plans'

/**
 * Save the user's basic profile from onboarding and mark onboarding complete.
 * The metadata flag is authoritative (the user always owns their own metadata);
 * the profiles row is best-effort under RLS.
 */
export async function saveProfileBasics(userId: string, input: { fullName: string; phone?: string }): Promise<{ error: string | null }> {
  const full_name = input.fullName.trim()
  const phone = input.phone?.trim() || null
  try {
    await supabase.from('profiles').update({ full_name, phone }).eq('id', userId)
  } catch {
    /* best-effort; the metadata flag below is the source of truth */
  }
  const { error } = await supabase.auth.updateUser({ data: { full_name, onboarding_complete: true } })
  return { error: error?.message ?? null }
}

/**
 * Store the chosen membership plan. No charge is taken — status is 'created'
 * and payment is completed later via Razorpay from the Membership page.
 * Upserts on the unique user_id so re-choosing updates the same row.
 */
export async function selectPlan(userId: string, planId: PlanId): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('subscriptions')
    .upsert({ user_id: userId, plan_id: planId, status: 'created' }, { onConflict: 'user_id' })
  return { error: error?.message ?? null }
}
