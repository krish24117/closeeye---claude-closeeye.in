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
  // 1. Founder families — the pre-launch funnel registrants (founder_prelaunch)
  //    AND the original founding members (is_founding_member + founding_number,
  //    from the founding-member checkout). Both are real founding families and
  //    count toward the goal; founding members predate founder_registered_at, so
  //    we fall back to their founding date / location.
  const { data: regs, error: regErr } = await supabase
    .from('profiles')
    .select('id, founder_service_area, founder_registered_at, is_founding_member, founding_date, created_at, address')
    .or('founder_prelaunch.eq.true,is_founding_member.eq.true')
  const rawRegs = regErr
    ? []
    : ((regs ?? []) as { id: string; founder_service_area: string | null; founder_registered_at: string | null; is_founding_member: boolean | null; founding_date: string | null; created_at: string | null; address: string | null }[])
  const registrations = rawRegs.map((r) => ({
    service_area: r.founder_service_area ?? (r.is_founding_member ? r.address : null),
    registered_at: r.founder_registered_at ?? r.founding_date ?? r.created_at,
  }))
  const ids = rawRegs.map((r) => r.id)

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
    registrations,
    subs,
    waitlist: waitlistCount ?? 0,
    landingViews: views ?? 0,
    whatsappClicks: clicks ?? 0,
    nowIso: new Date().toISOString(),
  })
}
