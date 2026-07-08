/**
 * Executive Intelligence (Module 7 V2) — additive intelligence over existing data.
 *
 * Business aggregates for the whole company, read from the same sources as the rest of
 * the platform (no new storage). Deterministic today; the single model-swap boundary
 * for the executive dashboards. Human-readable only.
 */
import { fmtINR } from '@/lib/admin-data'
import type { InsightRow } from '@/lib/admin-data'
import type { AIRecommendation } from '@/lib/console-data'

function share(rows: { label: string; value: number }[]): InsightRow[] {
  const max = Math.max(...rows.map((r) => r.value)) || 1
  return rows.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }))
}
export type Series = { label: string; value: number }[]

/* ── 1 · Executive KPI strip ─────────────────────────────────────────────── */

export interface ExecKpi { label: string; value: string; sub?: string }
export const EXEC_KPIS: ExecKpi[] = [
  { label: 'Active families', value: '186' },
  { label: "Today's visits", value: '48' },
  { label: "Today's revenue", value: '₹82.4k' },
  { label: 'MRR', value: '₹14.7L' },
  { label: 'Cancellations', value: '3' },
  { label: 'Guardians', value: '16' },
  { label: 'Companions', value: '8' },
  { label: 'Care tickets', value: '11' },
  { label: 'Occupancy', value: '71%' },
  { label: 'Avg rating', value: '4.9★' },
  { label: 'NPS', value: '62' },
  { label: 'Collection', value: '94%' },
]

/* ── 2 · Founder priority list ───────────────────────────────────────────── */

export interface Priority { id: string; title: string; priority: 'high' | 'medium'; impact: string; action: string; href?: string }
export const TOP_PRIORITIES: Priority[] = [
  { id: 'pr-1', title: 'Hire one Guardian for Hyderabad West', priority: 'high', impact: 'Clears 6 at-risk visits + the top cancellation cause', action: 'Post role', href: '/admin/coverage' },
  { id: 'pr-2', title: 'Call the Rao family', priority: 'high', impact: 'Re-engage · renewal at risk (no report opened in 14 days)', action: 'Call', href: '/console/families/f-rao' },
  { id: 'pr-3', title: 'Approve 2 Companion applications', priority: 'medium', impact: '+2 weekend Companions where demand is up 38%', action: 'Review', href: '/become-a-companion' },
  { id: 'pr-4', title: 'Review ₹24,000 in failed payments', priority: 'high', impact: 'Recover ₹24k of MRR before renewals slip', action: 'Retry', href: '/admin/finance' },
  { id: 'pr-5', title: 'Renew Lakshmi Rao’s membership', priority: 'medium', impact: '₹8k MRR + a wellbeing follow-up she needs', action: 'Renew', href: '/admin/memberships' },
]

/* ── 3 · Cancellation Intelligence ───────────────────────────────────────── */

export const CANCELLATION = {
  stats: { totalScheduled: 876, completed: 812, cancelled: 64, rescheduled: 38, ratePct: '7.3%', revenueLost: 512000, recovered: 288000 },
  reasons: share([
    { label: 'Guardian unavailable', value: 22 }, { label: 'Family unavailable', value: 20 }, { label: 'Medical emergency', value: 9 },
    { label: 'Weather', value: 7 }, { label: 'Payment issue', value: 6 },
  ]),
  trend: [{ label: 'W1', value: 18 }, { label: 'W2', value: 15 }, { label: 'W3', value: 21 }, { label: 'W4', value: 16 }, { label: 'W5', value: 14 }, { label: 'W6', value: 12 }, { label: 'W7', value: 11 }, { label: 'W8', value: 9 }] as Series,
  zones: share([{ label: 'Hyderabad West', value: 26 }, { label: 'Hyderabad East', value: 14 }, { label: 'Chennai Central', value: 9 }, { label: 'Bengaluru South', value: 5 }]),
  repeatFamilies: 4,
  worstArea: 'Hyderabad West',
  worstGuardian: 'Karthik Rao (2 late cancels)',
  actions: ['Hire Guardian', 'Reassign visit', 'Contact family', 'Offer alternate slot', 'Recover lost revenue'],
}

/* ── 4 · Revenue Intelligence ────────────────────────────────────────────── */

export const REVENUE_INTEL = {
  stats: { today: 82400, mrr: 1472000, arr: 17664000, growthPct: '+15%', arpf: 8200, ltv: 92000, renewals: 9, churnPct: '2.4%', refunds: 12000, discounts: 18000, cancelledRevenue: 512000, pending: 184000, failures: 24000, net: 2128000 },
  byService: share([
    { label: 'Guardian visits', value: 1280000 }, { label: 'Hospital visits', value: 540000 }, { label: 'Companion visits', value: 240000 }, { label: 'Medical escort', value: 96000 }, { label: 'Emergency support', value: 40000 },
  ]),
  monthly: [{ label: 'Feb', value: 1240000 }, { label: 'Mar', value: 1380000 }, { label: 'Apr', value: 1520000 }, { label: 'May', value: 1660000 }, { label: 'Jun', value: 1880000 }, { label: 'Jul', value: 2140000 }] as Series,
  actions: ['Recover failed payments', 'Call expiring memberships', 'Upsell Companion plan'],
}

/* ── 8 · Financial Health ────────────────────────────────────────────────── */

export const FINANCIAL_HEALTH = {
  metrics: { revenue: 2140000, refunds: 12000, discounts: 18000, waivers: 4000, outstanding: 184000, failed: 24000, cancelledRevenue: 512000, recovered: 288000, collectionPct: '94%', net: 2128000 },
  trend: [{ label: 'D1', value: 68 }, { label: '', value: 74 }, { label: '', value: 71 }, { label: '', value: 80 }, { label: '', value: 76 }, { label: '', value: 84 }, { label: '', value: 82 }] as Series,
  actions: ['Retry payments', 'Call families', 'Review refunds'],
}

/* ── 5 · Companion Intelligence ──────────────────────────────────────────── */

export const COMPANION_INTEL = {
  stats: { applications: 34, verified: 22, trainingPending: 6, ready: 4, assigned: 6, available: 3, weekendAvailability: '38%', avgRating: '4.8★', utilisation: '64%' },
  funnel: [{ label: 'Applied', value: 34 }, { label: 'Verified', value: 22 }, { label: 'Trained', value: 16 }, { label: 'Deployed', value: 8 }] as Series,
  citiesNeeding: ['Hyderabad West', 'Chennai'],
  topCompanion: 'Vikram Shetty · 4.8★',
  inactive: 1,
  actions: ['Approve applications', 'Assign training', 'Deploy Companion', 'Start recruitment campaign'],
}

/* ── 6 · Care Team Intelligence ──────────────────────────────────────────── */

export const CARE_TEAM_INTEL = {
  stats: { open: 11, resolvedToday: 8, pending: 3, doctorCoordination: 4, medicineRequests: 5, hospitalCoordination: 2, labTests: 3, escalations: 2, avgResponse: '38 min', csat: '96%' },
  trend: [{ label: 'M', value: 14 }, { label: 'T', value: 12 }, { label: 'W', value: 15 }, { label: 'T', value: 10 }, { label: 'F', value: 11 }, { label: 'S', value: 7 }, { label: 'S', value: 5 }] as Series,
  actions: ['Assign care executive', 'Escalate', 'Call family', 'Close ticket'],
}

/* ── 7 · Guardian Capacity ───────────────────────────────────────────────── */

export const GUARDIAN_CAPACITY = {
  status: [
    { label: 'Available', value: 4, tone: 'positive' as const }, { label: 'On visit', value: 7 }, { label: 'Busy', value: 2 },
    { label: 'On leave', value: 1 }, { label: 'Training', value: 1 }, { label: 'Near burnout', value: 1, tone: 'warning' as const },
  ],
  avgVisitsPerDay: '3.2',
  utilisation: '71%',
  overloaded: ['Arjun Kumar (4/day · 6 days)'],
  underutilised: ['Sana Sheikh', 'Priyanka Das'],
  workload: share([{ label: 'Arjun Kumar', value: 4 }, { label: 'Ravi Teja', value: 3 }, { label: 'Karthik Rao', value: 3 }, { label: 'Meena Iyer', value: 2 }, { label: 'Sana Sheikh', value: 2 }]),
  actions: ['Reassign', 'Recruit', 'Balance routes'],
}

/* ── 9 · Growth ──────────────────────────────────────────────────────────── */

export const GROWTH = {
  metrics: { newFamilies: 12, renewals: 9, referrals: 7, websiteLeads: 41, guardianApps: 9, companionApps: 34, conversionPct: '31%', cac: 3200, ltv: 92000, monthlyGrowthPct: '+15%' },
  trend: [{ label: 'Feb', value: 96 }, { label: 'Mar', value: 118 }, { label: 'Apr', value: 138 }, { label: 'May', value: 154 }, { label: 'Jun', value: 170 }, { label: 'Jul', value: 186 }] as Series,
  funnel: share([{ label: 'Leads', value: 41 }, { label: 'Trials', value: 18 }, { label: 'Members', value: 12 }]),
  referralSources: share([{ label: 'WhatsApp', value: 46 }, { label: 'Website', value: 28 }, { label: 'Referral', value: 18 }, { label: 'Phone', value: 8 }]),
  actions: ['Launch campaign', 'Contact leads', 'Review conversions'],
}

/* ── 10 · Zone Intelligence ──────────────────────────────────────────────── */

export type ZoneStatus = 'healthy' | 'watch' | 'critical'
export interface ZoneIntelRow { zone: string; families: number; visits: number; guardians: number; companions: number; revenue: number; cancelPct: number; risk: number; status: ZoneStatus; action: string }
export const ZONES_INTEL: ZoneIntelRow[] = [
  { zone: 'Hyderabad Central', families: 64, visits: 22, guardians: 8, companions: 4, revenue: 720000, cancelPct: 4, risk: 12, status: 'healthy', action: 'Hold' },
  { zone: 'Hyderabad West', families: 38, visits: 14, guardians: 2, companions: 1, revenue: 320000, cancelPct: 18, risk: 78, status: 'critical', action: 'Hire + Recruit' },
  { zone: 'Hyderabad East', families: 29, visits: 9, guardians: 4, companions: 2, revenue: 240000, cancelPct: 9, risk: 44, status: 'watch', action: 'Reassign' },
  { zone: 'Hyderabad North', families: 22, visits: 7, guardians: 3, companions: 1, revenue: 180000, cancelPct: 6, risk: 28, status: 'healthy', action: 'Hold' },
  { zone: 'Hyderabad South', families: 33, visits: 10, guardians: 5, companions: 2, revenue: 260000, cancelPct: 7, risk: 22, status: 'healthy', action: 'Hold' },
]
export function fmt(n: number) { return fmtINR(n) }

/* ── 12 · Cross-module Intelligence ──────────────────────────────────────── */

export const CROSS_MODULE: AIRecommendation[] = [
  { id: 'cm-1', tone: 'warning', text: 'Cancellations are high in Hyderabad West because the zone is short on Guardians — a supply fix, not a demand one. Hiring one Guardian clears both.', action: { label: 'Coverage', href: '/admin/coverage' } },
  { id: 'cm-2', tone: 'warning', text: 'Companion demand rose 38% while weekend supply stayed flat. Recruit weekend Companions in Hyderabad West and Chennai.', action: { label: 'Recruit', href: '/become-a-companion' } },
  { id: 'cm-3', tone: 'warning', text: 'Failed payments (₹24k) are delaying 3 renewals — retrying auto-debit now protects that MRR.', action: { label: 'Finance', href: '/admin/finance' } },
  { id: 'cm-4', tone: 'info', text: 'Arjun’s 6-day streak of 4 visits/day predicts a staffing gap tomorrow — rebalance his route or add a backup.', action: { label: 'Care Team', href: '/admin/care-team' } },
  { id: 'cm-5', tone: 'info', text: 'Families who haven’t opened reports in 14+ days renew at a lower rate — a Presence Manager call lifts retention.', action: { label: 'Insights', href: '/admin/insights' } },
  { id: 'cm-6', tone: 'warning', text: 'Medication adherence has slipped for diabetic members (Lakshmi Rao) — add a gentle reminder to their plans.', action: { label: 'Open', href: '/console/families/f-lakshmi' } },
]
