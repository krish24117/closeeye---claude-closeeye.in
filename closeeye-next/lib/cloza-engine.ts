/**
 * CLOza — the Close Eye intelligence engine (INTERNAL name).
 *
 * CLOza reads data that already exists across Family Space, the Guardian App, the
 * Presence Console and Operations Admin, and turns it into human-readable INSIGHTS,
 * RECOMMENDATIONS, WELLNESS TRENDS and a DAILY BRIEF. It never collects new data and
 * never exposes raw scores or algorithms.
 *
 * Product note: "CLOza" stays under the hood. Every UI label is human — Insights,
 * Recommendations, Daily Brief, Wellness Trends. Swap the deterministic derivations
 * here for a real model later; the outputs (shape + tone) stay the same.
 */
import { FAMILIES, GUARDIANS, KPIS, type ConsoleFamily } from '@/lib/console-data'
import { ZONES, CANCEL_REASONS, type AdminAlert } from '@/lib/admin-data'
import { COMPANION_INTEL, GUARDIAN_CAPACITY, CARE_TEAM_INTEL } from '@/lib/exec-intel'
import type { SharedVisitReport } from '@/lib/visit-reports'

export type Level = 'improving' | 'stable' | 'attention'
export const LEVEL_LABEL: Record<Level, string> = { improving: 'Improving', stable: 'Stable', attention: 'Needs attention' }

/* ── helpers ─────────────────────────────────────────────────────────────── */

// A gentle, deterministic trend series (0–100 wellbeing) matching a direction.
function series(n: number, dir: Level, seed = 1): number[] {
  const start = dir === 'improving' ? 66 : dir === 'attention' ? 82 : 76
  const end = dir === 'improving' ? 86 : dir === 'attention' ? 62 : 77
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const wiggle = ((i * seed) % 5) - 2
    out.push(Math.round(start + (end - start) * t + wiggle))
  }
  return out
}

/* ── Pillar 1 · Wellness Trends (Family Wellness Index) ──────────────────── */

export type WellnessPeriod = 7 | 30 | 90
export interface WellnessDim { key: string; label: string; status: Level; note: string }
const WELLNESS: WellnessDim[] = [
  { key: 'mood', label: 'Mood', status: 'improving', note: 'Warmer and more talkative over recent visits' },
  { key: 'mobility', label: 'Mobility', status: 'stable', note: 'Steady with support; short walks continue' },
  { key: 'sleep', label: 'Sleep', status: 'stable', note: 'Mostly restful nights reported' },
  { key: 'medication', label: 'Medication', status: 'attention', note: 'Missed on 2 of the last visits — worth confirming' },
  { key: 'hydration', label: 'Hydration', status: 'stable', note: 'Adequate; gentle reminders help' },
  { key: 'conversation', label: 'Conversation', status: 'improving', note: 'More engaged, sharing memories' },
  { key: 'safety', label: 'Home safety', status: 'stable', note: 'No new hazards flagged' },
  { key: 'appetite', label: 'Appetite', status: 'improving', note: 'Eating fuller meals recently' },
]
export function wellnessTrends(period: WellnessPeriod) {
  const n = period === 7 ? 7 : period === 30 ? 8 : 12
  const dims = WELLNESS.map((d, i) => ({ ...d, series: series(n, d.status, i + 1) }))
  const attention = dims.filter((d) => d.status === 'attention').length
  const improving = dims.filter((d) => d.status === 'improving').length
  const overall: Level = attention >= 2 ? 'attention' : improving >= 3 ? 'improving' : 'stable'
  const headline = overall === 'improving'
    ? 'Wellbeing is trending up across most families.'
    : overall === 'attention'
      ? 'A few wellbeing signals need a closer look.'
      : 'Wellbeing is steady across most families.'
  return { dims, overall, improving, attention, headline }
}

/* ── Pillar 2 · Relationship Intelligence ────────────────────────────────── */

export interface RelationshipRow { family: ConsoleFamily; engagement: Level; signal: string; recommendation?: string }
export function relationshipInsights(): RelationshipRow[] {
  return FAMILIES.map((f, i) => {
    const daysSinceView = [1, 14, 2, 9, 1, 4, 21, 1][i % 8]!
    const engagement: Level = daysSinceView >= 14 ? 'attention' : daysSinceView >= 7 ? 'stable' : 'improving'
    const signal =
      daysSinceView >= 14
        ? `Hasn't opened a visit report in ${daysSinceView} days`
        : daysSinceView >= 7
          ? `Last viewed a report ${daysSinceView} days ago`
          : 'Engaged — opening reports and replying'
    const recommendation = engagement === 'attention' ? 'Recommend a warm Presence Manager check-in call this week' : undefined
    return { family: f, engagement, signal, recommendation }
  }).sort((a, b) => (a.engagement === 'attention' ? -1 : 1) - (b.engagement === 'attention' ? -1 : 1))
}

/* ── Pillar 3 · Care Quality Intelligence ────────────────────────────────── */

export interface CoachingRow { name: string; role: string; consistency: string; punctuality: string; feedback: string; coaching: string }
export function careQuality(): CoachingRow[] {
  return GUARDIANS.filter((g) => g.status !== 'off').slice(0, 6).map((g) => {
    const punc = parseInt(g.onTimeRate, 10) || 95
    const coaching =
      punc < 94
        ? 'Punctuality dipping slightly — a lighter morning route would help'
        : g.rating >= 4.9
          ? 'Exceptional consistency — a great fit to mentor new joiners'
          : 'Strong and steady — keep the current rhythm'
    return {
      name: g.name,
      role: g.role === 'companion' ? 'Companion' : 'Guardian',
      consistency: `${g.visitsToday} today · ${g.experience}`,
      punctuality: g.onTimeRate,
      feedback: `${g.rating}★`,
      coaching,
    }
  })
}

/* ── Pillar 4 · Operational Intelligence (predictions) ───────────────────── */

export interface Prediction { id: string; title: string; insight: string; action: string; tone: Level }
export function operationalIntelligence(): Prediction[] {
  const gap = ZONES.find((z) => z.status === 'gap')
  const util = Math.round((GUARDIANS.filter((g) => g.status === 'on-visit').length / GUARDIANS.length) * 100)
  return [
    { id: 'p-1', title: 'Guardian shortage forming', insight: `${gap?.city} ${gap?.zone} has ${gap?.guardians} Guardians for a rising visit load — 6 visits are at risk tomorrow.`, action: 'Hire 1 Guardian for the zone or reassign from Central', tone: 'attention' },
    { id: 'p-2', title: 'Companion demand rising', insight: 'Companion visits are up 38% and cluster on weekends, where supply is flat.', action: 'Open a weekend Companion recruitment drive', tone: 'attention' },
    { id: 'p-3', title: 'Cancellation hotspot', insight: 'Hyderabad West accounts for most Guardian-unavailable cancellations — a supply signal, not a demand one.', action: 'Fix supply in the West before it dents satisfaction', tone: 'attention' },
    { id: 'p-4', title: 'Resource utilisation', insight: `The team is running at ~${util}% utilisation — healthy, with room for the new demand.`, action: 'Hold current headcount outside the West zone', tone: 'stable' },
  ]
}

/* ── Pillar 5 · Founder Daily Brief ──────────────────────────────────────── */

export interface BriefSection { key: string; label: string; text: string }
export function dailyBrief(): { greeting: string; sections: BriefSection[]; recommendations: string[] } {
  return {
    greeting: 'Here’s your morning brief.',
    sections: [
      { key: 'business', label: 'Business', text: `Revenue is up 15% this month (₹21.4L), led by Companion Visits — your fastest-growing service. MRR is ₹14.7L.` },
      { key: 'operations', label: 'Operations', text: `46 visits scheduled today; 38 already complete. One coverage gap in Hyderabad West puts 6 of tomorrow’s visits at risk.` },
      { key: 'family', label: 'Families', text: `184 active families. Most are engaged; 2 haven’t opened a report in over two weeks and would benefit from a Presence Manager call.` },
      { key: 'revenue', label: 'Revenue', text: `Collection rate is 94%. ₹24k of payments failed today across 3 memberships; auto-debit retries are running.` },
      { key: 'risk', label: 'Risk', text: `Churn ticked up to 2.4%. The Sheikh family needs review after a cancelled cardiology visit. Medication was missed on Lakshmi Rao’s last two visits.` },
    ],
    recommendations: [
      'Hire one Guardian for Hyderabad West — it clears the coverage gap and the top cancellation cause.',
      'Ask the Presence Manager to call the 2 disengaged families and the Sheikh family today.',
      'Confirm Lakshmi Rao’s medication was taken and add a gentle reminder to her plan.',
    ],
  }
}

/* ── AI Story Engine · one report, four audiences ────────────────────────── */

export type Audience = 'family' | 'doctor' | 'pm' | 'founder'
export const AUDIENCE_LABEL: Record<Audience, string> = { family: 'Family', doctor: 'Doctor', pm: 'Presence Manager', founder: 'Founder' }

/** A believable sample when no live report exists yet (keeps the studio useful). */
export const SAMPLE_REPORT = {
  memberName: 'Ramesh Rao',
  guardianName: 'Arjun Kumar',
  service: 'Home Wellbeing Visit',
  story: 'Today, Ramesh was in good spirits and enjoyed the time together. He had a full meal, took the day’s medicines, shared some tea and talked over old memories. His blood pressure reading was 128/82, within the range we’d expect. He smiled several times and seemed relaxed throughout.',
  vitals: { bp: '128/82' } as Record<string, string>,
  scales: { mood: 'Good', mobility: 'Slight support', medication: 'Completed', appetite: 'Full meal', sleep: 'Restful' } as Record<string, string>,
  moments: ['tea', 'memories', 'walked'],
  durationSec: 3120,
}
type StoryInput = Pick<SharedVisitReport, 'memberName' | 'guardianName' | 'service' | 'story' | 'vitals' | 'scales' | 'moments' | 'durationSec'>

export function audienceSummary(r: StoryInput, audience: Audience): string {
  const first = r.memberName.split(' ')[0]
  const mins = Math.round((r.durationSec || 0) / 60)
  const bp = r.vitals?.bp
  switch (audience) {
    case 'family':
      return r.story
    case 'doctor':
      return [
        `${r.memberName} · home wellbeing visit (${mins} min).`,
        bp ? `BP ${bp} mmHg, within expected range.` : 'No vitals requested this visit.',
        `Medication: ${r.scales.medication ?? 'not recorded'}. Mobility: ${r.scales.mobility ?? 'not recorded'}. Appetite: ${r.scales.appetite ?? 'not recorded'}. Sleep: ${r.scales.sleep ?? 'not recorded'}.`,
        'No acute concerns observed. Continue current plan; confirm medication adherence between visits.',
      ].join(' ')
    case 'pm':
      return [
        `${first} — steady visit by ${r.guardianName}. Mood ${(r.scales.mood ?? 'ok').toLowerCase()}, engaged throughout.`,
        bp ? `BP reading ${bp} shared with the family as requested.` : '',
        'Follow-ups: none urgent. Keep encouraging the daily walk and confirm medication is taken on non-visit days.',
      ].filter(Boolean).join(' ')
    case 'founder':
      return [
        `${r.memberName} (Family Care) had a strong visit — a positive retention signal.`,
        'Family requested a BP reading and it was delivered same-visit; the kind of responsiveness that drives renewals and referrals.',
        'No service risk on this account.',
      ].join(' ')
  }
}

/* ── Proactive Alerts ────────────────────────────────────────────────────── */

export function proactiveAlerts(): AdminAlert[] {
  return [
    { id: 'ia-1', severity: 'high', title: 'Medication missed · Lakshmi Rao', detail: 'Medication was not confirmed on the last two visits.', action: 'Confirm adherence and add a reminder to her plan', href: '/console/families/f-lakshmi' },
    { id: 'ia-2', severity: 'high', title: 'Mood declining · Lakshmi Rao', detail: 'Lower energy and quieter mood noted across three consecutive visits.', action: 'Schedule a wellbeing review and a daily check-in call', href: '/console/families/f-lakshmi' },
    { id: 'ia-3', severity: 'medium', title: 'Family disengagement · 2 families', detail: 'Two families haven’t opened a report in over 14 days.', action: 'Presence Manager follow-up call this week', href: '/admin/insights' },
    { id: 'ia-4', severity: 'medium', title: 'Repeated cancellations · Hyderabad West', detail: 'Guardian-unavailable cancellations are clustering in one zone.', action: 'Resolve the coverage gap with a hire', href: '/admin/coverage' },
    { id: 'ia-5', severity: 'medium', title: 'Guardian burnout risk · Arjun Kumar', detail: '4 visits/day for 6 straight days above the comfortable load.', action: 'Rebalance tomorrow’s route or add a backup', href: '/admin/care-team' },
    { id: 'ia-6', severity: 'low', title: 'Renewals due · 14 memberships', detail: '₹1.12L of MRR renews within 7 days.', action: 'Trigger renewal outreach', href: '/admin/memberships' },
  ]
}

/* ── Natural-language search ──────────────────────────────────────────────── */

export interface SearchResult { title: string; sub: string; href?: string }
export interface SearchAnswer { summary: string; results: SearchResult[] }

export const SEARCH_EXAMPLES = [
  'Show families needing follow-up',
  'Show Guardian utilisation',
  'Show Companion availability',
  'Failed payments',
  'Pending renewals',
  'Open Care Team tickets',
]

export function search(query: string): SearchAnswer {
  const q = query.toLowerCase()
  if (/companion/.test(q)) {
    const c = COMPANION_INTEL.stats
    return { summary: `Companions: ${c.available} available now, ${c.ready} ready to deploy, ${c.trainingPending} in training. Top rated ${COMPANION_INTEL.topCompanion}.`, results: [
      { title: `${c.available} available · ${c.weekendAvailability} weekend cover`, sub: `Cities needing recruitment: ${COMPANION_INTEL.citiesNeeding.join(', ')}`, href: '/become-a-companion' },
      { title: COMPANION_INTEL.topCompanion, sub: 'Highest-rated Companion', href: '/admin/care-team' },
    ] }
  }
  if (/utilis|capacity|workload|burnout|guardian.*help|help.*guardian/.test(q)) {
    return { summary: `Guardian utilisation is ${GUARDIAN_CAPACITY.utilisation} (~${GUARDIAN_CAPACITY.avgVisitsPerDay} visits/day).`, results: [
      { title: `Needs help · ${GUARDIAN_CAPACITY.overloaded.join(', ')}`, sub: 'Near burnout — rebalance the route or add a backup', href: '/admin/care-team' },
      { title: `Spare capacity · ${GUARDIAN_CAPACITY.underutilised.join(', ')}`, sub: 'Available to take on more visits', href: '/admin/care-team' },
    ] }
  }
  if (/failed? payment|payment.*fail|collection/.test(q)) {
    return { summary: 'Failed payments today: ₹24,000 across 3 memberships; auto-debit retries are running.', results: [
      { title: 'INV-2612 · Mehta family', sub: '₹8,000 · retry scheduled', href: '/admin/finance' },
      { title: 'INV-2609 · Reddy family', sub: '₹12,000 · retry scheduled', href: '/admin/finance' },
    ] }
  }
  if (/renewal|expiring/.test(q)) {
    return { summary: '14 memberships renew within 7 days (₹1.12L of MRR).', results: [
      { title: 'Lakshmi Rao · Family Care', sub: 'Due soon · pair with a wellbeing follow-up', href: '/admin/memberships' },
      { title: '13 more memberships', sub: 'Trigger renewal outreach', href: '/admin/memberships' },
    ] }
  }
  if (/ticket|care team|care exec|coordination/.test(q)) {
    const t = CARE_TEAM_INTEL.stats
    return { summary: `${t.open} open Care Team tickets · ${t.resolvedToday} resolved today · avg response ${t.avgResponse}.`, results: [
      { title: `${t.escalations} escalations open`, sub: `${t.medicineRequests} medicine · ${t.doctorCoordination} doctor · ${t.hospitalCoordination} hospital`, href: '/admin/insights' },
    ] }
  }
  if (/follow.?up|needs? attention|disengag/.test(q)) {
    const rel = relationshipInsights().filter((r) => r.engagement === 'attention')
    const health = FAMILIES.filter((f) => f.status !== 'green')
    const seen = new Set<string>()
    const results: SearchResult[] = []
    for (const r of rel) if (!seen.has(r.family.id)) { seen.add(r.family.id); results.push({ title: r.family.memberName, sub: r.signal, href: `/console/families/${r.family.id}` }) }
    for (const f of health) if (!seen.has(f.id)) { seen.add(f.id); results.push({ title: f.memberName, sub: f.reason, href: `/console/families/${f.id}` }) }
    return { summary: `${results.length} families would benefit from a follow-up.`, results }
  }
  if (/cancel/.test(q)) {
    const hospital = /hospital/.test(q)
    return {
      summary: hospital ? 'Cancelled hospital visits this month.' : 'Cancellations this month, by reason.',
      results: hospital
        ? [{ title: 'Fatima Sheikh · Cardiology', sub: 'Hospital companion · rescheduled after a family cancellation', href: '/console/families/f-sheikh' }]
        : CANCEL_REASONS.slice(0, 5).map((r) => ({ title: r.label, sub: `${r.value}% of cancellations` })),
    }
  }
  if (/rating|best|top guardian|highest/.test(q)) {
    const top = [...GUARDIANS].sort((a, b) => b.rating - a.rating).slice(0, 4)
    return { summary: 'Care team, highest-rated first.', results: top.map((g) => ({ title: `${g.name} · ${g.rating}★`, sub: `${g.role === 'companion' ? 'Companion' : 'Guardian'} · ${g.onTimeRate} on-time`, href: '/admin/care-team' })) }
  }
  if (/mood|wellbeing|declin|wellness/.test(q)) {
    return { summary: 'Wellbeing signals needing a closer look.', results: [{ title: 'Lakshmi Rao', sub: 'Mood declining across 3 visits · medication missed twice', href: '/console/families/f-lakshmi' }, { title: 'Fatima Sheikh', sub: 'Anxious ahead of cardiology follow-up', href: '/console/families/f-sheikh' }] }
  }
  if (/revenue|mrr|churn|finance/.test(q)) {
    return { summary: 'Business snapshot.', results: [{ title: `MRR ${KPIS.satisfaction ? '₹14.7L' : ''}`.trim(), sub: 'Up 9% · ARR ₹1.77Cr', href: '/admin/finance' }, { title: 'Churn 2.4%', sub: '+0.5pt — watch disengaged families', href: '/admin/insights' }] }
  }
  return { summary: 'Try one of the examples below, or ask about families, guardians, cancellations or revenue.', results: [] }
}
