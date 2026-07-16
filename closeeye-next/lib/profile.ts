import { supabase } from '@/lib/supabase'

/**
 * Onboarding completeness.
 *
 * A `profiles` row is auto-created for every user on signup (DB trigger), so
 * "has a profile" doesn't mean "onboarded". We treat onboarding as complete when
 * an explicit flag is set OR the profile already has a name — that way **existing
 * production users are never forced back through onboarding**, while a fresh
 * email/Google sign-up (no name yet) is sent to onboarding.
 */
export async function isOnboardingComplete(): Promise<boolean> {
  // Never REJECT: a flaky/offline auth cold start must not leave the caller hanging
  // forever (that shows an infinite native splash). getUser() is inside the guard too.
  try {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) return false
    if (user.user_metadata?.onboarding_complete === true) return true
    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    return Boolean(data?.full_name && String(data.full_name).trim())
  } catch {
    return false
  }
}

/**
 * Finish onboarding: records the name on the profile (best-effort, may be
 * RLS-restricted) and sets the durable completion flag on the user (always
 * allowed — it's the user's own metadata, so it's the source of truth).
 */
export async function completeOnboarding(fullName: string): Promise<{ error: string | null }> {
  const name = fullName.trim()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: 'You’re not signed in. Please sign in again.' }
  try {
    await supabase.from('profiles').update({ full_name: name }).eq('id', auth.user.id)
  } catch {
    /* best-effort; the metadata flag below is authoritative */
  }
  const { error } = await supabase.auth.updateUser({ data: { onboarding_complete: true, full_name: name } })
  return { error: error?.message ?? null }
}
