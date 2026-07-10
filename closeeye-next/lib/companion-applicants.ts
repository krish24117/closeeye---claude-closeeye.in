import { supabase } from '@/lib/supabase'

/**
 * Companion recruitment applications. These are stored in the real Supabase
 * `companion_applications` table (public insert, admin read) so every applicant
 * actually reaches the Care Team on /admin/care-team — no more localStorage stub.
 */
export interface CompanionApplicationInput {
  name: string
  phone: string
  city: string
  skills: string[]
  why: string
}

export async function submitCompanionApplication(
  data: CompanionApplicationInput,
): Promise<{ ok: boolean; error?: string }> {
  // `motivation` is required in the table; fall back to the chosen ways-to-help so
  // an application is never rejected for a blank optional field.
  const motivation =
    data.why.trim() ||
    (data.skills.length ? `Wants to help with: ${data.skills.join(', ')}` : 'Applied via the website.')

  const { error } = await supabase.from('companion_applications').insert({
    full_name: data.name.trim(),
    phone: data.phone.trim(),
    area: data.city.trim() || null,
    motivation,
    caregiving_experience: data.skills.length ? `Ways to help: ${data.skills.join(', ')}` : null,
    status: 'applied',
  })

  if (error) {
    console.error('[companion-application] insert failed:', error.message)
    return { ok: false, error: 'We couldn’t submit your application just now. Please try again in a moment.' }
  }
  return { ok: true }
}
