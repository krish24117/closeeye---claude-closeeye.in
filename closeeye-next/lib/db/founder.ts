import { supabase } from '@/lib/supabase'
import { founderProfilePatch, waitlistRowFor, type WaitlistInput } from '@/lib/founder-journey'

/**
 * Founder Program (Phase 3) — the small DB surface for pre-launch registration.
 * We reuse everything we can: accounts via /auth, plan selection via selectPlan
 * (lib/db/onboarding, writes an unpaid 'created' subscription), and the waitlist
 * table for out-of-area families. Only the durable founder marker is new.
 */

/**
 * Capture an outside-Hyderabad family on the existing `waitlist` table (anon
 * insert is allowed; it surfaces in /admin leads). Returns an error string on
 * failure so the UI can fall back to the founder's WhatsApp rather than lose the
 * lead silently.
 */
export async function submitFounderWaitlist(input: WaitlistInput): Promise<{ error: string | null }> {
  const { error } = await supabase.from('waitlist').insert(waitlistRowFor(input))
  return { error: error?.message ?? null }
}

/**
 * Save just the family's name during the founder journey — WITHOUT marking
 * onboarding complete (that happens only at the end, in registerFounder). Both
 * metadata (authoritative for the name) and the profiles row are updated.
 */
export async function saveFounderName(userId: string, fullName: string): Promise<{ error: string | null }> {
  const full_name = fullName.trim()
  if (!full_name) return { error: null }
  try {
    await supabase.from('profiles').update({ full_name }).eq('id', userId)
  } catch {
    /* best-effort; metadata below is authoritative for the name */
  }
  const { error } = await supabase.auth.updateUser({ data: { full_name } })
  return { error: error?.message ?? null }
}

/**
 * Complete pre-launch registration: stamp the durable founder marker on the
 * profile (the gate authority + the Phase-4 dashboard's source of truth) and
 * mark onboarding complete so the app stops routing them through the generic,
 * loved-one-collecting /onboarding. The plan was already stored as an unpaid
 * 'created' subscription in the previous step.
 */
export async function registerFounder(
  userId: string,
  input: { ref?: string | null; serviceArea?: string },
): Promise<{ error: string | null }> {
  const patch = founderProfilePatch({ ref: input.ref, serviceArea: input.serviceArea, nowIso: new Date().toISOString() })
  const { error: profileError } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (profileError) return { error: profileError.message }
  // Onboarding is complete only now — the family finished the founder journey.
  const { error } = await supabase.auth.updateUser({ data: { onboarding_complete: true } })
  return { error: error?.message ?? null }
}
