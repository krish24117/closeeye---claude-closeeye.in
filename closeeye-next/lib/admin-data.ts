/**
 * Operations Admin — the Founder Operating System (business/finance mock data).
 *
 * This is the BUSINESS layer, distinct from the Presence Console (Module 5, care
 * operations). Numbers are business aggregates for the whole company. localStorage /
 * static mock is the single swap boundary — wire to the finance, subscription and
 * booking tables (Supabase + Razorpay) and every screen keeps working.
 */
import { FAMILIES, GUARDIANS } from '@/lib/console-data'

export { FAMILIES, GUARDIANS }

export const ADMIN = {
  name: 'Krishna Reddy',
  firstName: 'Krishna',
  initials: 'KR',
  role: 'Founder & CEO',
  company: 'Close Eye',
}

/* ── Indian currency formatting ──────────────────────────────────────────── */

export function fmtINR(n: number, compact = true): string {
  if (compact) {
    if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`
    if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`
    if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`
  }
  return `₹${n.toLocaleString('en-IN')}`
}

export interface Delta {
  pct: number
  dir: 'up' | 'down'
}

/* ── Hero KPIs (Executive Dashboard) ─────────────────────────────────────── */

export interface Kpi {
  key: string
  label: string
  value: string
  delta?: Delta
  tone?: 'neutral' | 'positive' | 'warning'
  good?: 'up' | 'down' // which direction is good (for delta colour)
}

export const KPI_FINANCE: Kpi[] = [
  { key: 'rev-today', label: 'Revenue today', value: fmtINR(86400), delta: { pct: 12, dir: 'up' }, good: 'up' },
  { key: 'rev-week', label: 'Revenue this week', value: fmtINR(548200), delta: { pct: 8, dir: 'up' }, good: 'up' },
  { key: 'rev-month', label: 'Revenue this month', value: fmtINR(2140000), delta: { pct: 15, dir: 'up' }, good: 'up' },
  { key: 'mrr', label: 'MRR', value: fmtINR(1472000), delta: { pct: 9, dir: 'up' }, good: 'up' },
  { key: 'arr', label: 'ARR', value: fmtINR(17664000), delta: { pct: 9, dir: 'up' }, good: 'up' },
  { key: 'outstanding', label: 'Outstanding', value: fmtINR(184000), delta: { pct: 4, dir: 'down' }, good: 'down', tone: 'warning' },
  { key: 'refunds', label: 'Pending refunds', value: fmtINR(24000), tone: 'warning' },
  { key: 'collection', label: 'Collection rate', value: '94%', delta: { pct: 2, dir: 'up' }, good: 'up', tone: 'positive' },
]

export const KPI_OPERATIONS: Kpi[] = [
  { key: 'families', label: 'Active families', value: '184', delta: { pct: 6, dir: 'up' }, good: 'up' },
  { key: 'visits', label: "Today's visits", value: '46' },
  { key: 'completed', label: 'Completed', value: '38', tone: 'positive' },
  { key: 'delayed', label: 'Delayed', value: '3', tone: 'warning' },
  { key: 'cancelled', label: 'Cancelled', value: '4', tone: 'warning' },
  { key: 'rescheduled', label: 'Rescheduled', value: '2' },
]

export const KPI_GROWTH: Kpi[] = [
  { key: 'new', label: 'New members', value: '12', delta: { pct: 20, dir: 'up' }, good: 'up', tone: 'positive' },
  { key: 'renewals', label: 'Renewals', value: '9', delta: { pct: 3, dir: 'up' }, good: 'up' },
  { key: 'churn', label: 'Churn', value: '2.4%', delta: { pct: 5, dir: 'up' }, good: 'down', tone: 'warning' },
]

/* ── Attention Center ────────────────────────────────────────────────────── */

export type AlertSeverity = 'high' | 'medium' | 'low'
export interface AdminAlert {
  id: string
  severity: AlertSeverity
  title: string
  detail: string
  action: string
  href?: string
}

export const ALERTS: AdminAlert[] = [
  { id: 'al-1', severity: 'high', title: 'Guardian shortage · Hyderabad West', detail: '6 visits at risk tomorrow with only 2 Guardians available in the zone.', action: 'Hire 1 Guardian or reassign from Central', href: '/admin/care-team' },
  { id: 'al-2', severity: 'high', title: '3 payment failures today', detail: '₹24,000 across 3 memberships failed on auto-debit.', action: 'Retry collection and message the families', href: '/admin/finance' },
  { id: 'al-3', severity: 'medium', title: '2 refunds pending approval', detail: '₹24,000 awaiting your sign-off for over 24 hours.', action: 'Review and approve refunds', href: '/admin/finance' },
  { id: 'al-4', severity: 'medium', title: '14 memberships expiring in 7 days', detail: '₹1.12L of MRR at risk if not renewed.', action: 'Trigger renewal outreach', href: '/admin/memberships' },
  { id: 'al-5', severity: 'medium', title: 'Companion shortage · weekends', detail: 'Companion demand up 22% on weekends; supply flat.', action: 'Open a Companion recruitment drive', href: '/become-a-companion' },
  { id: 'al-6', severity: 'low', title: '1 high-priority family needs review', detail: 'Sheikh family flagged after a cancelled cardiology visit.', action: 'Open the escalation', href: '/pm/escalations' },
]

/* ── Business Insights ───────────────────────────────────────────────────── */

export interface InsightRow {
  label: string
  value: number // INR
  pct: number // share of max, 0–100
}

const share = (rows: { label: string; value: number }[]): InsightRow[] => {
  const max = Math.max(...rows.map((r) => r.value))
  return rows.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }))
}

export const REVENUE_BY_CITY = share([
  { label: 'Hyderabad', value: 1640000 },
  { label: 'Bengaluru', value: 320000 },
  { label: 'Chennai', value: 118000 },
  { label: 'Pune', value: 62000 },
])
export const REVENUE_BY_SERVICE = share([
  { label: 'Home Wellbeing', value: 1280000 },
  { label: 'Hospital Companion', value: 540000 },
  { label: 'Companion Visits', value: 240000 },
  { label: 'Custom Care', value: 80000 },
])
export const REVENUE_BY_MEMBERSHIP = share([
  { label: 'Family Care', value: 1180000 },
  { label: 'Premium', value: 720000 },
  { label: 'Essential', value: 240000 },
])
export const REVENUE_BY_GUARDIAN = share([
  { label: 'Arjun Kumar', value: 148000 },
  { label: 'Meena Iyer', value: 132000 },
  { label: 'Ravi Teja', value: 118000 },
  { label: 'Karthik Rao', value: 96000 },
])
export const REVENUE_BY_COMPANION = share([
  { label: 'Vikram Shetty', value: 74000 },
  { label: 'Anita Rao', value: 61000 },
  { label: 'Fatima Begum', value: 38000 },
])

export const INSIGHT_HIGHLIGHTS = {
  fastestGrowingService: { label: 'Companion Visits', detail: '+38% month over month' },
  lowestCity: { label: 'Pune', detail: 'Collection rate 78% · needs attention' },
  topGuardian: { label: 'Arjun Kumar', detail: '₹1.48L · 98% on-time · 4.9★' },
  topCompanion: { label: 'Vikram Shetty', detail: '₹74k · 96% on-time · 4.8★' },
}

/* ── AI Business Assistant ───────────────────────────────────────────────── */

export interface BizRec {
  id: string
  tone: 'info' | 'positive' | 'warning'
  text: string
  action?: { label: string; href: string }
}
export const AI_BUSINESS: BizRec[] = [
  { id: 'b-1', tone: 'positive', text: 'Revenue is up 15% this month, led by Companion Visits — your fastest-growing service (+38%).', action: { label: 'See finance', href: '/admin/finance' } },
  { id: 'b-2', tone: 'warning', text: 'A Guardian shortage is forming in Hyderabad West — 6 visits are at risk tomorrow. Hiring one Guardian would clear it.', action: { label: 'Care Team', href: '/admin/care-team' } },
  { id: 'b-3', tone: 'warning', text: 'Family churn ticked up to 2.4% (+0.5pt). Most cancellations cite “family unavailable” — a flexible reschedule nudge may help.', action: { label: 'Cancellations', href: '/admin/operations' } },
  { id: 'b-4', tone: 'info', text: 'Pune has the lowest collection rate (78%). Enabling auto-debit reminders there could recover ~₹40k this month.' },
]

/* ── Finance ─────────────────────────────────────────────────────────────── */

export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
export const REVENUE_SERIES: Record<Period, { label: string; value: number }[]> = {
  daily: [
    { label: 'Mon', value: 72000 }, { label: 'Tue', value: 81000 }, { label: 'Wed', value: 68000 },
    { label: 'Thu', value: 94000 }, { label: 'Fri', value: 88000 }, { label: 'Sat', value: 76000 }, { label: 'Sun', value: 86400 },
  ],
  weekly: [
    { label: 'W1', value: 420000 }, { label: 'W2', value: 468000 }, { label: 'W3', value: 512000 }, { label: 'W4', value: 548200 },
    { label: 'W5', value: 496000 }, { label: 'W6', value: 534000 }, { label: 'W7', value: 578000 }, { label: 'W8', value: 610000 },
  ],
  monthly: [
    { label: 'Feb', value: 1240000 }, { label: 'Mar', value: 1380000 }, { label: 'Apr', value: 1520000 },
    { label: 'May', value: 1660000 }, { label: 'Jun', value: 1880000 }, { label: 'Jul', value: 2140000 },
  ],
  yearly: [
    { label: '2024', value: 6200000 }, { label: '2025', value: 12800000 }, { label: '2026', value: 17664000 },
  ],
}

export interface Invoice { id: string; family: string; plan: string; amount: number; status: 'paid' | 'pending' | 'failed'; date: string }
export const INVOICES: Invoice[] = [
  { id: 'INV-2614', family: 'Rao family', plan: 'Family Care', amount: 8000, status: 'paid', date: 'Today' },
  { id: 'INV-2613', family: 'Menon family', plan: 'Premium', amount: 12000, status: 'paid', date: 'Today' },
  { id: 'INV-2612', family: 'Mehta family', plan: 'Family Care', amount: 8000, status: 'failed', date: 'Today' },
  { id: 'INV-2611', family: 'Khan family', plan: 'Essential', amount: 4000, status: 'pending', date: 'Yesterday' },
  { id: 'INV-2610', family: 'Nair family', plan: 'Family Care', amount: 8000, status: 'paid', date: 'Yesterday' },
  { id: 'INV-2609', family: 'Reddy family', plan: 'Premium', amount: 12000, status: 'failed', date: '2 days ago' },
  { id: 'INV-2608', family: 'Sheikh family', plan: 'Family Care', amount: 8000, status: 'paid', date: '2 days ago' },
]

export interface Refund { id: string; family: string; amount: number; reason: string; status: 'pending' | 'approved' }
export const REFUNDS: Refund[] = [
  { id: 'RF-118', family: 'Mehta family', amount: 8000, reason: 'Duplicate booking', status: 'pending' },
  { id: 'RF-117', family: 'Khan family', amount: 16000, reason: 'Cancelled membership', status: 'pending' },
  { id: 'RF-116', family: 'Das family', amount: 4000, reason: 'Service not delivered', status: 'approved' },
]

export interface Payout { id: string; who: string; role: 'Guardian' | 'Companion'; amount: number; status: 'scheduled' | 'paid' }
export const PAYOUTS: Payout[] = [
  { id: 'PO-441', who: 'Arjun Kumar', role: 'Guardian', amount: 42000, status: 'scheduled' },
  { id: 'PO-442', who: 'Meena Iyer', role: 'Guardian', amount: 38000, status: 'scheduled' },
  { id: 'PO-443', who: 'Vikram Shetty', role: 'Companion', amount: 26000, status: 'paid' },
  { id: 'PO-444', who: 'Anita Rao', role: 'Companion', amount: 22000, status: 'paid' },
]

export const FINANCE_SUMMARY = {
  grossRevenue: 2140000,
  refundsIssued: 12000,
  netRevenue: 2128000,
  gst: 383040,
  payoutsDue: 128000,
  collectionRate: '94%',
}

/* ── Booking Analytics ───────────────────────────────────────────────────── */

export const BOOKING_STATS = {
  completed: 812,
  cancelled: 64,
  rescheduled: 38,
  noShow: 9,
  completionRate: '92%',
  avgDuration: '58 min',
  conversionRate: '31%',
}
export const BOOKING_SOURCES = share([
  { label: 'WhatsApp', value: 46 },
  { label: 'Website', value: 28 },
  { label: 'Referral', value: 18 },
  { label: 'Phone', value: 8 },
])

/* ── Cancellation Center ─────────────────────────────────────────────────── */

export const CANCEL_REASONS = share([
  { label: 'Family unavailable', value: 22 },
  { label: 'Guardian unavailable', value: 12 },
  { label: 'Medical emergency', value: 9 },
  { label: 'Hospital admitted', value: 7 },
  { label: 'Companion unavailable', value: 6 },
  { label: 'Weather', value: 4 },
  { label: 'Operations', value: 3 },
  { label: 'Payment failure', value: 1 },
])
export const CANCEL_TREND: { label: string; value: number }[] = [
  { label: 'W1', value: 18 }, { label: 'W2', value: 15 }, { label: 'W3', value: 21 }, { label: 'W4', value: 16 },
  { label: 'W5', value: 14 }, { label: 'W6', value: 12 }, { label: 'W7', value: 11 }, { label: 'W8', value: 9 },
]
export const CANCEL_TODAY = 4
export const CANCEL_WEEK = 12
export const CANCEL_MONTH = 64
export const CANCEL_ACTIONS = [
  'Most cancellations cite “family unavailable” — offer a one-tap reschedule at booking.',
  'Guardian-unavailable cancellations cluster in Hyderabad West — the shortage there needs a hire.',
  'Payment-failure cancellations are near zero after auto-debit retries — keep it on.',
]

/* ── Memberships ─────────────────────────────────────────────────────────── */

export interface Plan { name: string; price: number; period: string; members: number; features: string[]; highlight?: boolean }
export const PLANS: Plan[] = [
  { name: 'Essential', price: 4000, period: '/mo', members: 42, features: ['2 wellbeing visits', 'WhatsApp updates', 'Shared Presence Manager'] },
  { name: 'Family Care', price: 8000, period: '/mo', members: 108, features: ['Up to 8 visits', 'Dedicated Presence Manager', 'Reports & photos', 'Document vault'], highlight: true },
  { name: 'Premium', price: 12000, period: '/mo', members: 34, features: ['Unlimited visits', 'Priority Guardians', 'Hospital companion', '24×7 emergency'] },
]
export const MEMBERSHIP_STATS = { active: 184, trials: 16, expiringSoon: 14, renewalsThisMonth: 9, upgrades: 5, downgrades: 1, coupons: 3 }
export const COUPONS = [
  { code: 'FAMILY20', desc: '20% off first month', used: 84, active: true },
  { code: 'REFER500', desc: '₹500 referral credit', used: 41, active: true },
  { code: 'WELCOME10', desc: '10% off Essential', used: 12, active: false },
]

/* ── Coverage ────────────────────────────────────────────────────────────── */

export interface Zone { city: string; zone: string; pincodes: number; guardians: number; companions: number; status: 'healthy' | 'tight' | 'gap' }
export const ZONES: Zone[] = [
  { city: 'Hyderabad', zone: 'Central', pincodes: 14, guardians: 8, companions: 4, status: 'healthy' },
  { city: 'Hyderabad', zone: 'West', pincodes: 11, guardians: 2, companions: 1, status: 'gap' },
  { city: 'Hyderabad', zone: 'East', pincodes: 9, guardians: 4, companions: 2, status: 'tight' },
  { city: 'Bengaluru', zone: 'South', pincodes: 12, guardians: 5, companions: 3, status: 'healthy' },
  { city: 'Chennai', zone: 'Central', pincodes: 7, guardians: 2, companions: 1, status: 'tight' },
]
export const OPERATING_HOURS = 'Mon–Sat · 7:00 AM – 9:00 PM · Sun on request'
export const HOLIDAYS = [
  { date: '15 Aug', name: 'Independence Day' },
  { date: '2 Oct', name: 'Gandhi Jayanti' },
  { date: '20 Oct', name: 'Diwali' },
]

/* ── Content ─────────────────────────────────────────────────────────────── */

export const CONTENT_ITEMS = [
  { area: 'Website', items: 6, note: 'Hero, services, membership, founder story' },
  { area: 'FAQs', items: 18, note: 'Published · last edited 3 days ago' },
  { area: 'Email templates', items: 9, note: 'Welcome, renewal, report, receipt' },
  { area: 'SMS templates', items: 7, note: 'OTP, visit reminders, delays' },
  { area: 'Notifications', items: 12, note: 'Family + Guardian push copy' },
  { area: 'Legal pages', items: 4, note: 'Privacy, terms, refund, consent' },
]

/* ── Audit Logs ──────────────────────────────────────────────────────────── */

export interface AuditEntry { id: string; actor: string; action: string; target: string; time: string; kind: 'finance' | 'care' | 'family' | 'system' | 'content' }
export const AUDIT: AuditEntry[] = [
  { id: 'lg-1', actor: 'Priya Menon', action: 'cancelled visit', target: 'Yusuf Khan · reason: Medical emergency', time: '2 min ago', kind: 'care' },
  { id: 'lg-2', actor: 'System', action: 'auto-retried payment', target: 'INV-2612 · Mehta family', time: '18 min ago', kind: 'finance' },
  { id: 'lg-3', actor: 'Krishna Reddy', action: 'approved refund', target: 'RF-116 · ₹4,000', time: '1 hr ago', kind: 'finance' },
  { id: 'lg-4', actor: 'Priya Menon', action: 'reassigned Guardian', target: 'Nair family → Karthik Rao', time: '2 hr ago', kind: 'care' },
  { id: 'lg-5', actor: 'System', action: 'membership renewed', target: 'Rao family · Family Care', time: '3 hr ago', kind: 'family' },
  { id: 'lg-6', actor: 'Ops Team', action: 'published FAQ', target: '“How do reschedules work?”', time: 'Yesterday', kind: 'content' },
  { id: 'lg-7', actor: 'Krishna Reddy', action: 'updated pricing', target: 'Premium plan → ₹12,000', time: 'Yesterday', kind: 'system' },
  { id: 'lg-8', actor: 'System', action: 'verified Companion', target: 'Anita Rao · background check', time: '2 days ago', kind: 'care' },
]

/* ── Settings ────────────────────────────────────────────────────────────── */

export const TEAM_ROLES = [
  { name: 'Krishna Reddy', role: 'Founder & CEO', access: 'Full access' },
  { name: 'Priya Menon', role: 'Presence Manager', access: 'Operations' },
  { name: 'Ops Team', role: 'Operations Lead', access: 'Operations · Finance (read)' },
]
export const INTEGRATIONS = [
  { name: 'Razorpay', purpose: 'Payments & subscriptions', status: 'connected' as const },
  { name: 'WhatsApp Business', purpose: 'Family & Guardian messaging', status: 'connected' as const },
  { name: 'Supabase', purpose: 'Database & auth', status: 'connected' as const },
  { name: 'Twilio SMS', purpose: 'OTP & reminders', status: 'connected' as const },
]
