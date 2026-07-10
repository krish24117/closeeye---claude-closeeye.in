import { supabase } from '@/lib/supabase'

/**
 * Founder / business console (Module 6, /admin) — REAL business aggregates.
 * Super-Admin-gated (is_admin() RLS reads everything). Money columns are in
 * PAISE (÷100 → rupees, which is what fmtINR expects). No unified invoices
 * table — one-off revenue = paid `bookings`; recurring = active `subscriptions`
 * × plan price (from lib/plans). Zones/coupons/audit have no backing tables.
 */

// Monthly price (₹) by subscriptions.plan_id (CloseEye Connect ₹500 / Care ₹1,500).
const PLAN_PRICE: Record<string, number> = { companion: 500, trust: 1500, family_os: 0 }

const SERVICE_LABEL: Record<string, string> = {
  companion_visit_single: 'Companion visit',
  home_wellbeing_visit: 'Home wellbeing',
  'home-wellbeing-visit': 'Home wellbeing',
  hospital_companion: 'Hospital companion',
  'hospital-companion': 'Hospital companion',
  custom_request: 'Custom request',
  'custom-request': 'Custom request',
}
function serviceLabel(s: string | null): string {
  return s ? SERVICE_LABEL[s] ?? s.replace(/[_-]/g, ' ') : 'Other'
}

export interface AdminAlert {
  id: string
  tone: 'warning' | 'info'
  title: string
  detail: string
  href: string
}

export interface InsightRow { label: string; value: number }

export interface AdminOverview {
  // rupees
  revenueTotal: number
  revenueMonth: number
  outstanding: number
  mrr: number
  activeSubs: number
  activeMemberships: number
  // operational
  families: number
  newFamiliesMonth: number
  careTeam: number
  pendingApplications: number
  bookingsMonth: number
  completedMonth: number
  cancelledMonth: number
  presenceToday: number
  // insights (rupees)
  revenueByCity: InsightRow[]
  revenueByService: InsightRow[]
  alerts: AdminAlert[]
}

interface BookingRow {
  id: string
  loved_one_id: string | null
  status: string
  payment_status: string | null
  amount_paise: number | null
  scheduled_at: string | null
  paid_at: string | null
  service_type: string | null
  attention_needed: boolean | null
}
interface LovedRow { id: string; family_user_id: string; city: string | null; created_at: string }
interface SubRow { plan_id: string; status: string; current_end: string | null }
interface StatusRow { status: string | null }
interface ReqRow { payment_status: string | null; amount_paise: number | null }

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [bk, lo, sub, mem, comp, app, req] = await Promise.all([
    supabase.from('bookings').select('id, loved_one_id, status, payment_status, amount_paise, scheduled_at, paid_at, service_type, attention_needed'),
    supabase.from('loved_ones').select('id, family_user_id, city, created_at'),
    supabase.from('subscriptions').select('plan_id, status, current_end'),
    supabase.from('memberships').select('status'),
    supabase.from('companions').select('status'),
    supabase.from('companion_applications').select('status'),
    supabase.from('booking_requests').select('payment_status, amount_paise'),
  ])
  const bookings = (bk.data as BookingRow[] | null) ?? []
  const lovedOnes = (lo.data as LovedRow[] | null) ?? []
  const subs = (sub.data as SubRow[] | null) ?? []
  const mems = (mem.data as StatusRow[] | null) ?? []
  const comps = (comp.data as StatusRow[] | null) ?? []
  const apps = (app.data as StatusRow[] | null) ?? []
  const reqs = (req.data as ReqRow[] | null) ?? []

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const cityById = new Map(lovedOnes.map((l) => [l.id, l.city]))
  const rupees = (paise: number) => Math.round(paise / 100)

  const paid = bookings.filter((b) => b.payment_status === 'paid' && (b.amount_paise ?? 0) > 0)
  const revenueTotal = rupees(paid.reduce((s, b) => s + (b.amount_paise ?? 0), 0))
  const revenueMonth = rupees(paid.filter((b) => b.paid_at && new Date(b.paid_at).getTime() >= monthStart).reduce((s, b) => s + (b.amount_paise ?? 0), 0))
  const outstanding = rupees(reqs.filter((r) => r.payment_status !== 'paid').reduce((s, r) => s + (r.amount_paise ?? 0), 0))

  const activeSubList = subs.filter((s) => s.status === 'active')
  const activeSubs = activeSubList.length
  const mrr = activeSubList.reduce((sum, s) => sum + (PLAN_PRICE[s.plan_id] ?? 0), 0)
  const activeMemberships = mems.filter((m) => m.status === 'active').length

  const familyIds = new Set(lovedOnes.map((l) => l.family_user_id))
  const families = familyIds.size
  const newFamiliesMonth = new Set(lovedOnes.filter((l) => new Date(l.created_at).getTime() >= monthStart).map((l) => l.family_user_id)).size

  const careTeam = comps.filter((c) => c.status === 'approved').length
  const pendingApplications = apps.filter((a) => a.status === 'applied' || a.status === 'pending').length

  const monthBookings = bookings.filter((b) => b.scheduled_at && new Date(b.scheduled_at).getTime() >= monthStart)
  const bookingsMonth = monthBookings.length
  const completedMonth = monthBookings.filter((b) => b.status === 'completed').length
  const cancelledMonth = monthBookings.filter((b) => b.status === 'cancelled').length
  const presenceToday = bookings.filter((b) => b.status !== 'cancelled' && b.scheduled_at && new Date(b.scheduled_at).toDateString() === now.toDateString()).length

  const groupRupees = (keyFn: (b: BookingRow) => string): InsightRow[] => {
    const m = new Map<string, number>()
    paid.forEach((b) => { const k = keyFn(b); m.set(k, (m.get(k) ?? 0) + (b.amount_paise ?? 0)) })
    return Array.from(m.entries()).map(([label, p]) => ({ label, value: rupees(p) })).sort((a, b) => b.value - a.value).slice(0, 6)
  }
  const revenueByCity = groupRupees((b) => (b.loved_one_id ? cityById.get(b.loved_one_id) : null) ?? 'Other')
  const revenueByService = groupRupees((b) => serviceLabel(b.service_type))

  const alerts: AdminAlert[] = []
  if (pendingApplications > 0) alerts.push({ id: 'apps', tone: 'warning', title: `${pendingApplications} Guardian application${pendingApplications > 1 ? 's' : ''} to review`, detail: 'New Care Team applicants are waiting.', href: '/admin/care-team' })
  const overdue = bookings.filter((b) => b.attention_needed && b.status !== 'cancelled' && b.status !== 'completed').length
  if (overdue > 0) alerts.push({ id: 'overdue', tone: 'warning', title: `${overdue} visit${overdue > 1 ? 's' : ''} need${overdue === 1 ? 's' : ''} attention`, detail: 'Overdue or stalled visits flagged by the system.', href: '/console' })
  const soon = now.getTime() + 7 * 86400000
  const expiring = activeSubList.filter((s) => s.current_end && new Date(s.current_end).getTime() <= soon).length
  if (expiring > 0) alerts.push({ id: 'expiring', tone: 'info', title: `${expiring} membership${expiring > 1 ? 's' : ''} renewing this week`, detail: 'Active plans reaching their renewal date.', href: '/admin/memberships' })
  const unpaid = reqs.filter((r) => r.payment_status !== 'paid' && (r.amount_paise ?? 0) > 0).length
  if (unpaid > 0) alerts.push({ id: 'unpaid', tone: 'warning', title: `${unpaid} payment${unpaid > 1 ? 's' : ''} pending`, detail: 'Booking requests awaiting payment.', href: '/admin/finance' })

  return {
    revenueTotal, revenueMonth, outstanding, mrr, activeSubs, activeMemberships,
    families, newFamiliesMonth, careTeam, pendingApplications,
    bookingsMonth, completedMonth, cancelledMonth, presenceToday,
    revenueByCity, revenueByService, alerts,
  }
}
