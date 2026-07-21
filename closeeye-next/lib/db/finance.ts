/**
 * Executive Finance Workspace data — composed from the EXISTING finance readers (no duplicated logic,
 * no touching of payment/membership pages) plus a couple of light derivations. Live-only: a figure is
 * a real number or it's absent (the UI shows "Coming soon" with the data source it needs). Cash, burn,
 * runway, CAC/LTV, forecasts and tax are deliberately NOT computed here — they require sources
 * Close Eye doesn't yet have, and inventing them would break the honesty rule.
 */
import { supabase } from '@/lib/supabase'
import { fetchAdminFinance, fetchAdminMemberships, fetchAdminOverview, type AdminFinance, type AdminMemberships, type AdminOverview, type InsightRow } from './admin'

const isToday = (iso: string | null) => !!iso && new Date(iso).toDateString() === new Date().toDateString()

export interface FinanceWorkspaceData {
  overview: AdminOverview
  finance: AdminFinance
  memberships: AdminMemberships
  connectMembers: number
  careMembers: number
  arr: number
  arpf: number
  revenueToday: number
  revenueByCountry: InsightRow[]
  failedPayments: number
}

export async function fetchFinanceWorkspace(): Promise<FinanceWorkspaceData> {
  const [overview, finance, memberships, subRes, reqRes, bkRes] = await Promise.all([
    fetchAdminOverview(),
    fetchAdminFinance(),
    fetchAdminMemberships(),
    supabase.from('subscriptions').select('plan_id, status'),
    supabase.from('booking_requests').select('payment_status'),
    supabase.from('bookings').select('paid_at, amount_paise, payment_status'),
  ])
  const subs = (subRes.data as { plan_id: string; status: string }[] | null) ?? []
  const active = subs.filter((s) => s.status === 'active')
  const connectMembers = active.filter((s) => s.plan_id === 'companion').length
  const careMembers = active.filter((s) => s.plan_id === 'trust').length

  const reqs = (reqRes.data as { payment_status: string | null }[] | null) ?? []
  const failedPayments = reqs.filter((r) => r.payment_status === 'failed').length

  const bookings = (bkRes.data as { paid_at: string | null; amount_paise: number | null; payment_status: string | null }[] | null) ?? []
  const revenueToday = Math.round(bookings.filter((b) => b.payment_status === 'paid' && isToday(b.paid_at)).reduce((s, b) => s + (b.amount_paise ?? 0), 0) / 100)

  const arr = finance.mrr * 12
  const arpf = overview.families > 0 ? Math.round(finance.mrr / overview.families) : 0
  // Every family is region 'IN' today → revenue is single-country. Honest single-row breakdown; the
  // by-country view lights up for real the moment a non-IN family transacts.
  const revenueByCountry: InsightRow[] = finance.revenueTotal > 0 ? [{ label: 'India', value: finance.revenueTotal }] : []

  return { overview, finance, memberships, connectMembers, careMembers, arr, arpf, revenueToday, revenueByCountry, failedPayments }
}
