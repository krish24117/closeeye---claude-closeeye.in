import { supabase } from '@/lib/supabase'
import { planById, PLANS } from '@/lib/plans'

/**
 * Founder / business console (Module 6, /admin) — REAL business aggregates.
 * Super-Admin-gated (is_admin() RLS reads everything). Money columns are in
 * PAISE (÷100 → rupees, which is what fmtINR expects). No unified invoices
 * table — one-off revenue = paid `bookings`; recurring = active `subscriptions`
 * × plan price (from lib/plans). Zones/coupons/audit have no backing tables.
 */

// Monthly price (₹) by subscriptions.plan_id (Close Eye Connect ₹500 / Care ₹1,500).
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
  foundingMembers: number
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
  const [bk, lo, sub, mem, comp, app, req, fnd] = await Promise.all([
    supabase.from('bookings').select('id, loved_one_id, status, payment_status, amount_paise, scheduled_at, paid_at, service_type, attention_needed'),
    supabase.from('loved_ones').select('id, family_user_id, city, created_at'),
    supabase.from('subscriptions').select('plan_id, status, current_end'),
    supabase.from('memberships').select('status'),
    supabase.from('companions').select('status'),
    supabase.from('companion_applications').select('status'),
    supabase.from('booking_requests').select('payment_status, amount_paise'),
    // Founding members = the reserved founding families (is_founding_member flag +
    // founding_number). Distinct from "families" (paying care customers = loved_ones).
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_founding_member', true),
  ])
  const bookings = (bk.data as BookingRow[] | null) ?? []
  const lovedOnes = (lo.data as LovedRow[] | null) ?? []
  const subs = (sub.data as SubRow[] | null) ?? []
  const mems = (mem.data as StatusRow[] | null) ?? []
  const comps = (comp.data as StatusRow[] | null) ?? []
  const apps = (app.data as StatusRow[] | null) ?? []
  const reqs = (req.data as ReqRow[] | null) ?? []
  const foundingMembers = fnd.count ?? 0

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
  if (overdue > 0) alerts.push({ id: 'overdue', tone: 'warning', title: `${overdue} visit${overdue > 1 ? 's' : ''} need${overdue === 1 ? 's' : ''} attention`, detail: 'Overdue or stalled visits flagged by the system.', href: '/pm' })
  const soon = now.getTime() + 7 * 86400000
  const expiring = activeSubList.filter((s) => s.current_end && new Date(s.current_end).getTime() <= soon).length
  if (expiring > 0) alerts.push({ id: 'expiring', tone: 'info', title: `${expiring} membership${expiring > 1 ? 's' : ''} renewing this week`, detail: 'Active plans reaching their renewal date.', href: '/admin/memberships' })
  const unpaid = reqs.filter((r) => r.payment_status !== 'paid' && (r.amount_paise ?? 0) > 0).length
  if (unpaid > 0) alerts.push({ id: 'unpaid', tone: 'warning', title: `${unpaid} payment${unpaid > 1 ? 's' : ''} pending`, detail: 'Booking requests awaiting payment.', href: '/admin/finance' })

  return {
    revenueTotal, revenueMonth, outstanding, mrr, activeSubs, activeMemberships,
    families, newFamiliesMonth, foundingMembers, careTeam, pendingApplications,
    bookingsMonth, completedMonth, cancelledMonth, presenceToday,
    revenueByCity, revenueByService, alerts,
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
interface NameRow { id: string; full_name: string }

/* ── Finance ─────────────────────────────────────────────────────────────── */

export interface AdminPayment { id: string; who: string; service: string; amount: number; date: string }
export interface AdminFinance {
  revenueTotal: number
  revenueMonth: number
  outstanding: number
  mrr: number
  payouts: number
  collectionRate: number
  trend: InsightRow[]
  payments: AdminPayment[]
}

export async function fetchAdminFinance(): Promise<AdminFinance> {
  const [bk, lo, sub, req] = await Promise.all([
    supabase.from('bookings').select('id, loved_one_id, status, payment_status, amount_paise, paid_at, service_type, companion_payout_paise'),
    supabase.from('loved_ones').select('id, full_name'),
    supabase.from('subscriptions').select('plan_id, status'),
    supabase.from('booking_requests').select('payment_status, amount_paise'),
  ])
  const bookings = (bk.data as (BookingRow & { companion_payout_paise: number | null })[] | null) ?? []
  const nameById = new Map(((lo.data as NameRow[] | null) ?? []).map((l) => [l.id, l.full_name]))
  const subs = (sub.data as { plan_id: string; status: string }[] | null) ?? []
  const reqs = (req.data as ReqRow[] | null) ?? []
  const rupees = (p: number) => Math.round(p / 100)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  const paid = bookings.filter((b) => b.payment_status === 'paid' && (b.amount_paise ?? 0) > 0)
  const revenueTotal = rupees(paid.reduce((s, b) => s + (b.amount_paise ?? 0), 0))
  const revenueMonth = rupees(paid.filter((b) => b.paid_at && new Date(b.paid_at).getTime() >= monthStart).reduce((s, b) => s + (b.amount_paise ?? 0), 0))
  const outstanding = rupees(reqs.filter((r) => r.payment_status !== 'paid').reduce((s, r) => s + (r.amount_paise ?? 0), 0))
  const mrr = subs.filter((s) => s.status === 'active').reduce((sum, s) => sum + (PLAN_PRICE[s.plan_id] ?? 0), 0)
  const payouts = rupees(bookings.reduce((s, b) => s + (b.companion_payout_paise ?? 0), 0))
  const collectionRate = revenueTotal + outstanding > 0 ? Math.round((revenueTotal / (revenueTotal + outstanding)) * 100) : 100

  const trend: InsightRow[] = []
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = dt.getTime()
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime()
    const rev = rupees(paid.filter((b) => b.paid_at && new Date(b.paid_at).getTime() >= start && new Date(b.paid_at).getTime() < end).reduce((s, b) => s + (b.amount_paise ?? 0), 0))
    trend.push({ label: MONTHS[dt.getMonth()] as string, value: rev })
  }

  const payments: AdminPayment[] = paid
    .filter((b) => b.paid_at)
    .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
    .slice(0, 12)
    .map((b) => ({ id: b.id.slice(0, 8), who: (b.loved_one_id ? nameById.get(b.loved_one_id) : null) ?? 'A family', service: serviceLabel(b.service_type), amount: rupees(b.amount_paise ?? 0), date: b.paid_at ? new Date(b.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '' }))

  return { revenueTotal, revenueMonth, outstanding, mrr, payouts, collectionRate, trend, payments }
}

/* ── Bookings analytics ──────────────────────────────────────────────────── */

const BK_STATUS_LABEL: Record<string, string> = {
  completed: 'Completed', cancelled: 'Cancelled', in_progress: 'In progress', on_the_way: 'En route',
  companion_assigned: 'Assigned', confirmed: 'Confirmed', scheduled: 'Scheduled', paid: 'Paid',
}

export interface AdminBookings {
  total: number
  completed: number
  cancelled: number
  active: number
  completionRate: number
  conversionRate: number
  byStatus: InsightRow[]
  recent: { id: string; who: string; service: string; status: string; date: string }[]
}

export async function fetchAdminBookings(): Promise<AdminBookings> {
  const [bk, lo, req] = await Promise.all([
    supabase.from('bookings').select('id, loved_one_id, status, scheduled_at, service_type'),
    supabase.from('loved_ones').select('id, full_name'),
    supabase.from('booking_requests').select('status'),
  ])
  const bookings = (bk.data as { id: string; loved_one_id: string | null; status: string; scheduled_at: string | null; service_type: string | null }[] | null) ?? []
  const nameById = new Map(((lo.data as NameRow[] | null) ?? []).map((l) => [l.id, l.full_name]))
  const reqs = (req.data as { status: string }[] | null) ?? []

  const total = bookings.length
  const completed = bookings.filter((b) => b.status === 'completed').length
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length
  const active = total - completed - cancelled
  const completionRate = completed + cancelled > 0 ? Math.round((completed / (completed + cancelled)) * 100) : 0
  const conversionRate = reqs.length > 0 ? Math.round((reqs.filter((r) => r.status === 'paid').length / reqs.length) * 100) : 0

  const statusMap = new Map<string, number>()
  bookings.forEach((b) => { const l = BK_STATUS_LABEL[b.status] ?? b.status; statusMap.set(l, (statusMap.get(l) ?? 0) + 1) })
  const byStatus = Array.from(statusMap.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

  const recent = [...bookings]
    .sort((a, b) => (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? ''))
    .slice(0, 12)
    .map((b) => ({ id: b.id.slice(0, 8), who: (b.loved_one_id ? nameById.get(b.loved_one_id) : null) ?? 'A family', service: serviceLabel(b.service_type), status: BK_STATUS_LABEL[b.status] ?? b.status, date: b.scheduled_at ? new Date(b.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '' }))

  return { total, completed, cancelled, active, completionRate, conversionRate, byStatus, recent }
}

/* ── Families (business view) ────────────────────────────────────────────── */

export interface AdminFamily {
  userId: string
  name: string
  members: number
  city: string | null
  membership: string
  active: boolean
  joined: string
}

export async function fetchAdminFamilies(): Promise<AdminFamily[]> {
  const [lo, prof, sub] = await Promise.all([
    supabase.from('loved_ones').select('family_user_id, city, created_at'),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('subscriptions').select('user_id, plan_id, status'),
  ])
  const lovedOnes = (lo.data as { family_user_id: string; city: string | null; created_at: string }[] | null) ?? []
  const nameById = new Map(((prof.data as { id: string; full_name: string | null }[] | null) ?? []).map((p) => [p.id, p.full_name]))
  const subByUser = new Map<string, { plan_id: string; status: string }>()
  ;((sub.data as { user_id: string; plan_id: string; status: string }[] | null) ?? []).forEach((s) => subByUser.set(s.user_id, s))

  const byFamily = new Map<string, { members: number; city: string | null; joined: string }>()
  lovedOnes.forEach((l) => {
    const g = byFamily.get(l.family_user_id)
    if (g) {
      g.members += 1
      if (!g.city && l.city) g.city = l.city
      if (l.created_at < g.joined) g.joined = l.created_at
    } else {
      byFamily.set(l.family_user_id, { members: 1, city: l.city, joined: l.created_at })
    }
  })

  return Array.from(byFamily.entries())
    .map(([userId, g]) => {
      const s = subByUser.get(userId)
      const plan = s ? planById(s.plan_id) : null
      return {
        userId,
        name: nameById.get(userId) ?? 'Family',
        members: g.members,
        city: g.city,
        membership: plan?.short ?? (s ? s.plan_id : '—'),
        active: s?.status === 'active',
        joined: new Date(g.joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/* ── Care Team ───────────────────────────────────────────────────────────── */

export interface AdminCompanion { id: string; name: string; city: string | null; status: string | null; visits: number; rating: number | null }
export interface AdminApplication { id: string; name: string; email: string | null; phone: string | null; area: string | null; appliedAt: string | null }
export interface AdminCareTeam { companions: AdminCompanion[]; applications: AdminApplication[]; approved: number; pendingApplications: number; avgRating: number }

export async function fetchAdminCareTeam(): Promise<AdminCareTeam> {
  const [comp, app] = await Promise.all([
    supabase.from('companions').select('id, full_name, city, status, total_visits, avg_rating'),
    supabase.from('companion_applications').select('id, full_name, email, phone, area, status, applied_at').order('applied_at', { ascending: false }),
  ])
  const companions = ((comp.data as { id: string; full_name: string | null; city: string | null; status: string | null; total_visits: number | null; avg_rating: number | null }[] | null) ?? [])
    .map((c) => ({ id: c.id, name: c.full_name ?? 'Guardian', city: c.city, status: c.status, visits: c.total_visits ?? 0, rating: c.avg_rating }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const appRows = (app.data as { id: string; full_name: string | null; email: string | null; phone: string | null; area: string | null; status: string | null; applied_at: string | null }[] | null) ?? []
  const applications = appRows
    .filter((a) => a.status === 'applied' || a.status === 'pending')
    .map((a) => ({ id: a.id, name: a.full_name ?? 'Applicant', email: a.email, phone: a.phone, area: a.area, appliedAt: a.applied_at }))
  const pendingApplications = applications.length
  const approved = companions.filter((c) => c.status === 'approved').length
  const rated = companions.filter((c) => c.rating != null)
  const avgRating = rated.length ? Math.round((rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length) * 10) / 10 : 0
  return { companions, applications, approved, pendingApplications, avgRating }
}

/** Read the JSON `error` message from a failed functions.invoke (FunctionsHttpError.context is the Response). */
async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const j = await ctx.json()
      if (j && typeof j.error === 'string') return j.error
    } catch { /* body was not JSON */ }
  }
  return fallback
}

/**
 * Approve an application → provision a loginable Guardian via the
 * provision-companion edge function (service role: creates the auth user, sets
 * profiles.role='companion', writes the companions row, marks the application
 * approved). Admin-only; the function re-checks the caller's role server-side.
 */
export async function approveApplication(applicationId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('provision-companion', { body: { application_id: applicationId } })
  if (error) throw new Error(await functionErrorMessage(error, 'Could not approve the application. Please try again.'))
}

/** Decline an application (admin RLS allows the update; no account is created). */
export async function rejectApplication(applicationId: string): Promise<void> {
  const { error } = await supabase.from('companion_applications').update({ status: 'rejected' }).eq('id', applicationId)
  if (error) throw error
}

/* ── Memberships ─────────────────────────────────────────────────────────── */

export interface AdminPlanRow { name: string; price: string; period: string; benefits: string[]; active: number; popular: boolean }
export interface AdminMemberships {
  activeSubs: number
  renewalsSoon: number
  foundingActive: number
  mrr: number
  plans: AdminPlanRow[]
}

export async function fetchAdminMemberships(): Promise<AdminMemberships> {
  const [sub, mem] = await Promise.all([
    supabase.from('subscriptions').select('plan_id, status, next_billing_at'),
    supabase.from('memberships').select('status'),
  ])
  const subs = (sub.data as { plan_id: string; status: string; next_billing_at: string | null }[] | null) ?? []
  const mems = (mem.data as { status: string | null }[] | null) ?? []
  const active = subs.filter((s) => s.status === 'active')
  const activeByPlan = new Map<string, number>()
  active.forEach((s) => activeByPlan.set(s.plan_id, (activeByPlan.get(s.plan_id) ?? 0) + 1))
  const soon = Date.now() + 7 * 86400000
  const renewalsSoon = active.filter((s) => s.next_billing_at && new Date(s.next_billing_at).getTime() <= soon).length
  const foundingActive = mems.filter((m) => m.status === 'active').length
  const mrr = active.reduce((sum, s) => sum + (PLAN_PRICE[s.plan_id] ?? 0), 0)
  const plans: AdminPlanRow[] = PLANS.map((p) => ({ name: p.name, price: p.price, period: p.period, benefits: p.benefits, active: activeByPlan.get(p.id) ?? 0, popular: !!p.popular }))
  return { activeSubs: active.length, renewalsSoon, foundingActive, mrr, plans }
}

/* ── Operations (business view) ──────────────────────────────────────────── */

export interface AdminCoverageRow { city: string; families: number; guardians: number }
export interface AdminOperations {
  presenceToday: number
  bookingsToday: number
  completedToday: number
  activeFamilies: number
  careTeam: number
  cancelledToday: number
  cancelledWeek: number
  cancelledMonth: number
  coverage: AdminCoverageRow[]
}

export async function fetchAdminOperations(): Promise<AdminOperations> {
  const [bk, lo, comp] = await Promise.all([
    supabase.from('bookings').select('status, scheduled_at, loved_one_id'),
    supabase.from('loved_ones').select('family_user_id, city'),
    supabase.from('companions').select('city, status'),
  ])
  const bookings = (bk.data as { status: string; scheduled_at: string | null; loved_one_id: string | null }[] | null) ?? []
  const lovedOnes = (lo.data as { family_user_id: string; city: string | null }[] | null) ?? []
  const comps = (comp.data as { city: string | null; status: string | null }[] | null) ?? []

  const now = new Date()
  const isToday = (iso: string | null) => (iso ? new Date(iso).toDateString() === now.toDateString() : false)
  const ws = new Date(now)
  ws.setHours(0, 0, 0, 0)
  ws.setDate(ws.getDate() - ws.getDay())
  const weekStart = ws.getTime()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const inWeek = (iso: string | null) => (iso ? new Date(iso).getTime() >= weekStart && new Date(iso).getTime() < weekStart + 7 * 86400000 : false)
  const inMonth = (iso: string | null) => (iso ? new Date(iso).getTime() >= monthStart : false)

  const cancelled = bookings.filter((b) => b.status === 'cancelled')
  const approvedComps = comps.filter((c) => c.status === 'approved')

  const cityFamilies = new Map<string, Set<string>>()
  lovedOnes.forEach((l) => {
    const c = l.city ?? 'Other'
    const s = cityFamilies.get(c) ?? new Set<string>()
    s.add(l.family_user_id)
    cityFamilies.set(c, s)
  })
  const cityGuardians = new Map<string, number>()
  approvedComps.forEach((c) => { const city = c.city ?? 'Other'; cityGuardians.set(city, (cityGuardians.get(city) ?? 0) + 1) })
  const cities = new Set([...cityFamilies.keys(), ...cityGuardians.keys()])
  const coverage = Array.from(cities)
    .map((city) => ({ city, families: cityFamilies.get(city)?.size ?? 0, guardians: cityGuardians.get(city) ?? 0 }))
    .sort((a, b) => b.families - a.families)
    .slice(0, 8)

  return {
    presenceToday: bookings.filter((b) => b.status !== 'cancelled' && isToday(b.scheduled_at)).length,
    bookingsToday: bookings.filter((b) => isToday(b.scheduled_at)).length,
    completedToday: bookings.filter((b) => b.status === 'completed' && isToday(b.scheduled_at)).length,
    activeFamilies: new Set(lovedOnes.map((l) => l.family_user_id)).size,
    careTeam: approvedComps.length,
    cancelledToday: cancelled.filter((b) => isToday(b.scheduled_at)).length,
    cancelledWeek: cancelled.filter((b) => inWeek(b.scheduled_at)).length,
    cancelledMonth: cancelled.filter((b) => inMonth(b.scheduled_at)).length,
    coverage,
  }
}

/* ── Audit log ───────────────────────────────────────────────────────────── */

export interface AdminAuditEntry {
  id: string
  bookingId: string
  status: string
  statusLabel: string
  actor: string
  memberName: string
  familyName: string
  note: string | null
  at: string
}

interface BshRow { id: string; booking_id: string; status: string; changed_by: string | null; changed_at: string; note: string | null }

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

/**
 * The operational audit trail — every booking status change, newest first, from
 * booking_status_history (written by update-booking-status; admin-readable via
 * the existing bsh_admin_read policy). Resolves the actor (changed_by → staff
 * name) and the booking's member + family. No fabrication: only real events.
 */
export async function fetchAdminAudit(limit = 100): Promise<AdminAuditEntry[]> {
  const { data: bshData } = await supabase
    .from('booking_status_history')
    .select('id, booking_id, status, changed_by, changed_at, note')
    .order('changed_at', { ascending: false })
    .limit(limit)
  const rows = (bshData as BshRow[] | null) ?? []
  if (rows.length === 0) return []

  const bookingIds = Array.from(new Set(rows.map((r) => r.booking_id)))
  const { data: bkData } = await supabase
    .from('bookings')
    .select('id, loved_one_id, family_user_id')
    .in('id', bookingIds)
  const bookingById = new Map(
    ((bkData as { id: string; loved_one_id: string | null; family_user_id: string | null }[] | null) ?? []).map((b) => [b.id, b]),
  )

  const actorIds = rows.map((r) => r.changed_by).filter(Boolean) as string[]
  const familyIds = Array.from(bookingById.values()).map((b) => b.family_user_id).filter(Boolean) as string[]
  const personIds = Array.from(new Set([...actorIds, ...familyIds]))
  const lovedIds = Array.from(new Set(Array.from(bookingById.values()).map((b) => b.loved_one_id).filter(Boolean) as string[]))

  const [{ data: profData }, { data: loData }] = await Promise.all([
    personIds.length ? supabase.from('profiles').select('id, full_name').in('id', personIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    lovedIds.length ? supabase.from('loved_ones').select('id, full_name').in('id', lovedIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])
  const nameById = new Map(((profData as { id: string; full_name: string | null }[] | null) ?? []).map((p) => [p.id, p.full_name]))
  const memberById = new Map(((loData as { id: string; full_name: string | null }[] | null) ?? []).map((l) => [l.id, l.full_name]))

  return rows.map((r) => {
    const b = bookingById.get(r.booking_id)
    return {
      id: r.id,
      bookingId: r.booking_id,
      status: r.status,
      statusLabel: BK_STATUS_LABEL[r.status] ?? r.status,
      actor: (r.changed_by ? nameById.get(r.changed_by) : null) ?? (r.changed_by ? 'A staff member' : 'System'),
      memberName: (b?.loved_one_id ? memberById.get(b.loved_one_id) : null) ?? 'A family member',
      familyName: (b?.family_user_id ? nameById.get(b.family_user_id) : null) ?? 'A family',
      note: r.note,
      at: fmtDateTime(r.changed_at),
    }
  })
}

/* ── Leads / pipeline ────────────────────────────────────────────────────── */

export type LeadSource = 'waitlist' | 'consultation' | 'custom_care' | 'survey'

export interface AdminLead {
  id: string
  source: LeadSource
  sourceLabel: string
  name: string
  email: string | null
  phone: string | null
  city: string | null
  detail: string
  status: string | null
  createdAt: string
  at: string
}

const SOURCE_LABEL: Record<LeadSource, string> = {
  waitlist: 'Waitlist',
  consultation: 'Consultation',
  custom_care: 'Custom care',
  survey: 'Survey',
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface WlRow { id: string; full_name: string | null; email: string | null; whatsapp_number: string | null; loved_one_city: string | null; urgency: string | null; support_needed: string | null; status: string | null; created_at: string }
interface ConsRow { id: string; full_name: string | null; email: string | null; whatsapp_number: string | null; parent_city: string | null; best_time: string | null; note: string | null; status: string | null; created_at: string }
interface CcRow { id: string; full_name: string | null; email: string | null; whatsapp_number: string | null; parent_city: string | null; care_types: string[] | null; situation: string | null; urgency: string | null; budget_range: string | null; status: string | null; created_at: string }
interface SvRow { id: string; name: string | null; email: string | null; whatsapp: string | null; parent_city: string | null; q3_worries: string[] | null; status: string | null; created_at: string }

/**
 * The real sales pipeline — everyone who raised their hand — merged from the
 * populated intent tables (waitlist / consultation_requests / custom_care_requests
 * / survey_responses), each already admin-readable. Newest first. (The dedicated
 * `leads` table is unused — nothing writes to it — so we surface real intent.)
 */
export async function fetchAdminLeads(limit = 200): Promise<AdminLead[]> {
  const [wl, cons, cc, sv] = await Promise.all([
    supabase.from('waitlist').select('id, full_name, email, whatsapp_number, loved_one_city, urgency, support_needed, status, created_at').order('created_at', { ascending: false }).limit(limit),
    supabase.from('consultation_requests').select('id, full_name, email, whatsapp_number, parent_city, best_time, note, status, created_at').order('created_at', { ascending: false }).limit(limit),
    supabase.from('custom_care_requests').select('id, full_name, email, whatsapp_number, parent_city, care_types, situation, urgency, budget_range, status, created_at').order('created_at', { ascending: false }).limit(limit),
    supabase.from('survey_responses').select('id, name, email, whatsapp, parent_city, q3_worries, status, created_at').order('created_at', { ascending: false }).limit(limit),
  ])

  const leads: AdminLead[] = []

  for (const r of (wl.data as WlRow[] | null) ?? []) {
    leads.push({
      id: `wl-${r.id}`, source: 'waitlist', sourceLabel: SOURCE_LABEL.waitlist,
      name: r.full_name ?? 'Someone', email: r.email, phone: r.whatsapp_number, city: r.loved_one_city,
      detail: r.support_needed?.trim() || (r.urgency ? `Urgency: ${r.urgency}` : 'Waitlist signup'),
      status: r.status, createdAt: r.created_at, at: fmtDay(r.created_at),
    })
  }
  for (const r of (cons.data as ConsRow[] | null) ?? []) {
    leads.push({
      id: `cons-${r.id}`, source: 'consultation', sourceLabel: SOURCE_LABEL.consultation,
      name: r.full_name ?? 'Someone', email: r.email, phone: r.whatsapp_number, city: r.parent_city,
      detail: r.note?.trim() || (r.best_time ? `Prefers ${r.best_time}` : 'Consultation request'),
      status: r.status, createdAt: r.created_at, at: fmtDay(r.created_at),
    })
  }
  for (const r of (cc.data as CcRow[] | null) ?? []) {
    const bits = [r.care_types?.length ? r.care_types.join(', ') : null, r.urgency, r.budget_range].filter(Boolean).join(' · ')
    leads.push({
      id: `cc-${r.id}`, source: 'custom_care', sourceLabel: SOURCE_LABEL.custom_care,
      name: r.full_name ?? 'Someone', email: r.email, phone: r.whatsapp_number, city: r.parent_city,
      detail: bits || r.situation?.trim() || 'Custom care enquiry',
      status: r.status, createdAt: r.created_at, at: fmtDay(r.created_at),
    })
  }
  for (const r of (sv.data as SvRow[] | null) ?? []) {
    leads.push({
      id: `sv-${r.id}`, source: 'survey', sourceLabel: SOURCE_LABEL.survey,
      name: r.name ?? 'Someone', email: r.email, phone: r.whatsapp, city: r.parent_city,
      detail: r.q3_worries?.length ? r.q3_worries.join(', ') : 'Survey response',
      status: r.status, createdAt: r.created_at, at: fmtDay(r.created_at),
    })
  }

  return leads.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}
