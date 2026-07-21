/**
 * Connect concierge — capturing a real request or a "notify me" as a genuine demand signal.
 *
 * A concierge action the family taps (Financial help, a visit) is NEVER faked. Where Close Eye
 * can act today it records a REQUEST; where it can't yet (wrong city / not built) it records a
 * NOTIFY. Both land in the existing `waitlist` table — the same place the launch leads live — so
 * the founder sees true demand, keyed by the loved one's city. Tagged `Concierge —` so it is
 * always distinguishable from Founder Program leads. Never throws: a failed write surfaces so the
 * UI can retry, and the honest copy is shown either way.
 */
import { supabase } from '@/lib/supabase'

export type ConciergeIntent = 'requested' | 'notify'

export interface ConciergeSignal {
  /** Human label of the action, e.g. "Financial help" or "A visit". */
  action: string
  /** The loved one's city (drives coverage); '' when unknown. */
  city: string
  /** The loved one's region code (country), e.g. 'IN' | 'GB'. */
  region?: string | null
  intent: ConciergeIntent
  userName: string
  userEmail: string
  phone?: string | null
}

/** Record a concierge request / notify as a waitlist demand signal. */
export async function recordConciergeSignal(s: ConciergeSignal): Promise<{ error: string | null }> {
  const city = (s.city || '').trim()
  // waitlist columns are NOT NULL — send a non-null value for every one (see founder-journey.ts).
  const row = {
    full_name: (s.userName || 'Family member').trim(),
    email: (s.userEmail || '').trim(),
    whatsapp_number: (s.phone || '').trim(),
    country: s.region && s.region !== 'IN' ? s.region : 'India',
    loved_one_city: city || 'Unknown',
    urgency: 'concierge',
    support_needed: `Concierge — ${s.action} — ${city || 'Unknown'} (${s.intent})`,
  }
  const { error } = await supabase.from('waitlist').insert(row)
  return { error: error ? error.message : null }
}
