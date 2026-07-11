import { supabase } from '@/lib/supabase'
import { deriveFounderMetrics, type FounderMetrics } from '@/lib/founder-metrics'

export type { FounderMetrics }

/**
 * The Founder Activation Dashboard's numbers — every one from a real row:
 * registrations + service area + membership choice from the founder-marked
 * profiles and their subscriptions, the out-of-area waitlist, and the honest
 * landing/WhatsApp funnel events. Admin RLS scopes the reads. Resilient: if the
 * founder columns/tables aren't present yet (pre-migration), it returns zeros
 * rather than throwing, so the page still renders.
 */
export async function fetchFounderMetrics(): Promise<FounderMetrics> {
  // 1. Founder registrants (durable marker on profiles).
  const { data: regs, error: regErr } = await supabase
    .from('profiles')
    .select('id, founder_service_area, founder_registered_at')
    .eq('founder_prelaunch', true)
  const registrations = regErr
    ? []
    : ((regs ?? []) as { id: string; founder_service_area: string | null; founder_registered_at: string | null }[])
  const ids = registrations.map((r) => r.id)

  // 2. Their membership choice (unpaid 'created' now; 'active' after launch).
  let subs: { plan_id: string | null; status: string | null }[] = []
  if (ids.length) {
    const { data: s } = await supabase.from('subscriptions').select('plan_id, status').in('user_id', ids)
    subs = (s ?? []) as { plan_id: string | null; status: string | null }[]
  }

  // 3. Out-of-area families captured on the founder-program waitlist.
  const { count: waitlistCount } = await supabase
    .from('waitlist')
    .select('id', { count: 'exact', head: true })
    .ilike('support_needed', 'Founder Program%')

  // 4. Honest funnel events (landing views + WhatsApp taps).
  const [{ count: views }, { count: clicks }] = await Promise.all([
    supabase.from('founder_events').select('id', { count: 'exact', head: true }).eq('event_type', 'landing_view'),
    supabase.from('founder_events').select('id', { count: 'exact', head: true }).eq('event_type', 'whatsapp_click'),
  ])

  return deriveFounderMetrics({
    registrations: registrations.map((r) => ({ service_area: r.founder_service_area, registered_at: r.founder_registered_at })),
    subs,
    waitlist: waitlistCount ?? 0,
    landingViews: views ?? 0,
    whatsappClicks: clicks ?? 0,
    nowIso: new Date().toISOString(),
  })
}
