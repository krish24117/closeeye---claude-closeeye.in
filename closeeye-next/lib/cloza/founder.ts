/**
 * The Founder role provider — the first implemented Cloza "skill set", and the template every other
 * role follows. It is the ANALYSIS + RECOMMENDATION + ACTION layers for the founder: it computes
 * facts from a live snapshot, adds clearly-tagged recommendations, and attaches structured actions
 * (navigate now; tasks architected as `available:false`). It NEVER fabricates — a metric Close Eye
 * doesn't track becomes an honest "unavailable" segment, and an uncovered city becomes "no data",
 * never a guess. RETRIEVAL happens upstream (the snapshot); INTENT upstream (resolveIntent); this file
 * turns a resolved intent + snapshot into an answer.
 */
import type { FounderToday } from '@/lib/db/founder-workspace'
import type { AdminOverview, GuardianOverview, PresenceOverview, AdminOperations } from '@/lib/db/admin'
import { composeFounderBriefing } from '@/lib/founder-briefing'
import type { ClozaAnswer, ClozaQuestion, ClozaSegment, ClozaAction, ClozaScope, ClozaIntent } from './types'
import type { CapabilityKeywords } from './intent'

export interface FounderSnapshot {
  name: string
  today: FounderToday
  overview: AdminOverview
  guardian: GuardianOverview
  presence: PresenceOverview
  operations: AdminOperations
  daysToLaunch: number
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const fact = (text: string): ClozaSegment => ({ kind: 'fact', text })
const rec = (text: string): ClozaSegment => ({ kind: 'recommendation', text })
const na = (text: string): ClozaSegment => ({ kind: 'unavailable', text })
const nav = (label: string, href: string): ClozaAction => ({ kind: 'navigate', label, href, available: true })
const task = (label: string, command: string): ClozaAction => ({ kind: 'task', label, command, available: false })
const SOURCE = 'Live Close Eye data'

export const FOUNDER_QUESTIONS: ClozaQuestion[] = [
  { id: 'briefing', label: 'Summarize today’s business' },
  { id: 'growth', label: 'How are we growing?' },
  { id: 'revenue', label: 'How’s revenue?' },
  { id: 'operations', label: 'How are operations?' },
  { id: 'expansion', label: 'Where should we expand next?' },
  { id: 'actions', label: 'What should I do next?' },
]

export const FOUNDER_KEYWORDS: CapabilityKeywords = [
  [/forecast|predict|project(ion)?|next (month|quarter|year)/i, 'forecast'],
  [/runway|\bcash\b|burn/i, 'runway'],
  [/reven|money|mrr|\barr\b|paid|arpf|arpu|income|billing|invoice|unpaid|outstanding/i, 'revenue'],
  [/grow|famil|people|countr|acqui|sign[- ]?up|member/i, 'growth'],
  [/oper|guardian|visit|case|\bpm\b|presence|coverage|sla|staff/i, 'operations'],
  [/expan|market|where.*(next|expand)/i, 'expansion'],
  [/do next|action|priorit|focus|should i/i, 'actions'],
  [/today|business|summar|brief|how are we|overall/i, 'briefing'],
]

function scopeNote(scope: ClozaScope): string {
  return [cap(scope.role.replace(/_/g, ' ')), scope.dateRange?.label ?? 'today', scope.city ?? 'all cities'].join(' · ')
}

export function founderBriefing(s: FounderSnapshot): ClozaAnswer {
  const b = composeFounderBriefing({
    name: s.name, today: s.today,
    foundingMembers: s.overview.foundingMembers,
    newFamiliesMonth: s.overview.newFamiliesMonth,
    revenueMonth: s.overview.revenueMonth,
    alerts: s.overview.alerts,
    presenceToday: s.overview.presenceToday,
    daysToLaunch: s.daysToLaunch,
  })
  return {
    title: 'Today’s briefing',
    segments: [fact(b.happened), fact(b.attention), fact(b.improved), fact(b.risk), rec(b.next)],
    source: `${SOURCE} · today`,
    capability: 'briefing',
  }
}

/** ANALYSIS + RECOMMENDATION + ACTIONS for one capability (no breakdown). */
function capabilityAnswer(s: FounderSnapshot, id: string): ClozaAnswer {
  const o = s.overview, t = s.today
  switch (id) {
    case 'briefing':
      return founderBriefing(s)

    case 'growth': {
      const segs: ClozaSegment[] = [
        fact(`${t.familiesProtected} families and ${t.peopleProtected} people are under Close Eye’s watch${o.newFamiliesMonth > 0 ? `, ${o.newFamiliesMonth} added this month` : ''}.`),
        fact(`${o.foundingMembers} of 100 founding families, across ${t.countries} ${t.countries === 1 ? 'country' : 'countries'}.`),
        na('Weekly/monthly active families and retention aren’t tracked yet — they need family-activity events.'),
      ]
      if (o.foundingMembers < 100) segs.push(rec(`Keep filling the Founding 100 — ${100 - o.foundingMembers} places left${s.daysToLaunch ? `, ${s.daysToLaunch} days to launch` : ''}.`))
      return { title: 'Growth', segments: segs, source: SOURCE, capability: id, actions: [nav('Open Growth', '/admin/founder/growth')] }
    }

    case 'runway':
      return {
        title: 'Runway',
        segments: [na('Runway needs a cash balance and a burn rate — Close Eye doesn’t track expenses yet, so I won’t guess. It’s reserved in Finance → Executive Overview.')],
        source: SOURCE, capability: id, actions: [nav('Open Finance', '/admin/finance')],
      }

    case 'forecast':
      return {
        title: 'Forecast',
        segments: [na('Forecasting isn’t wired yet. When it is, I’ll project from Close Eye’s own history and label it a prediction — never present it as fact.')],
        source: SOURCE, capability: id, actions: [nav('Open Finance', '/admin/finance')],
      }

    case 'revenue': {
      const segs: ClozaSegment[] = [
        fact(`${inr(t.revenueToday)} came in today; ${inr(o.revenueMonth)} this month.`),
        fact(`MRR is ${inr(o.mrr)} (ARR ${inr(o.mrr * 12)}) across ${o.activeSubs} active ${o.activeSubs === 1 ? 'membership' : 'memberships'}.`),
      ]
      // ARPF — Average Revenue Per FAMILY (Close Eye is family-centred, not per-user).
      if (o.families > 0) segs.push(fact(`Average revenue per family (ARPF) is ${inr(Math.round(o.mrr / o.families))}/mo.`))
      const actions = [nav('Open Finance', '/admin/finance')]
      if (o.outstanding > 0) { segs.push(rec(`${inr(o.outstanding)} is outstanding — worth chasing the pending payments.`)); actions.push(nav('View payments', '/admin/finance')) }
      return { title: 'Revenue', segments: segs, source: SOURCE, capability: id, actions }
    }

    case 'operations': {
      const g = s.guardian, p = s.presence
      const segs: ClozaSegment[] = [
        fact(`${g.active} ${g.active === 1 ? 'Guardian is' : 'Guardians are'} active, ${g.visitsToday} ${g.visitsToday === 1 ? 'visit' : 'visits'} today, across ${s.operations.coverage.length} ${s.operations.coverage.length === 1 ? 'city' : 'cities'}.`),
        fact(`${p.openCases} open ${p.openCases === 1 ? 'case' : 'cases'} need attention, ${p.dueToday} due today.`),
      ]
      const actions: ClozaAction[] = [nav('Open Operations', '/admin/founder/operations')]
      if (g.pendingApplications > 0) { segs.push(rec(`${g.pendingApplications} Guardian ${g.pendingApplications === 1 ? 'application' : 'applications'} to review.`)); actions.push(nav('Review applications', '/admin/care-team')) }
      segs.push(na('SLA, response times and the emergency queue aren’t instrumented yet.'))
      return { title: 'Operations', segments: segs, source: SOURCE, capability: id, actions }
    }

    case 'expansion':
      return {
        title: 'Expansion',
        segments: [
          fact(`Live in ${t.countries} ${t.countries === 1 ? 'country' : 'countries'}, covering ${s.operations.coverage.length} ${s.operations.coverage.length === 1 ? 'city' : 'cities'}.`),
          na('There’s no expansion-readiness signal yet — demand by unserved city needs waitlist/lead geo-aggregation.'),
          rec('Deepen the cities you already serve before widening — density beats breadth pre-launch.'),
        ],
        source: SOURCE, capability: id, actions: [nav('Open Coverage', '/admin/coverage')],
      }

    case 'actions': {
      const alerts = o.alerts
      if (alerts.length === 0) return { title: 'Recommended actions', segments: [rec(`Nothing urgent. Keep reaching out toward the Founding 100 (${o.foundingMembers} of 100).`)], source: SOURCE, capability: id, actions: [task('Create reminder', 'create-reminder')] }
      return {
        title: 'Recommended actions',
        segments: alerts.map((a) => rec(a.title)),
        source: `${SOURCE} · from live alerts`,
        capability: id,
        actions: [...alerts.slice(0, 3).map((a) => nav(a.title, a.href)), task('Create reminder', 'create-reminder')],
      }
    }

    default:
      return unknownAnswer()
  }
}

/** A by-city breakdown / comparison — the multi-turn payoff, grounded in real city data. */
function cityBreakdown(s: FounderSnapshot, intent: ClozaIntent): ClozaAnswer {
  const id = intent.capability
  let title: string
  let rows: { city: string; text: string }[]

  if (id === 'revenue') {
    title = 'Revenue by city'
    rows = s.overview.revenueByCity.map((r) => ({ city: r.label, text: inr(r.value) }))
  } else if (id === 'growth') {
    title = 'Families by city'
    rows = s.operations.coverage.map((c) => ({ city: c.city, text: `${c.families} ${c.families === 1 ? 'family' : 'families'}` }))
  } else if (id === 'operations') {
    title = 'Guardians & families by city'
    rows = s.operations.coverage.map((c) => ({ city: c.city, text: `${c.guardians} ${c.guardians === 1 ? 'Guardian' : 'Guardians'}, ${c.families} ${c.families === 1 ? 'family' : 'families'}` }))
  } else {
    return { title: 'Can’t break that down yet', segments: [na(`A by-city breakdown isn’t available for “${id}” — Close Eye tracks city data for revenue, families and Guardians.`)], source: SOURCE, capability: id }
  }

  if (intent.compare && intent.compare.length >= 2) {
    const segs = intent.compare.map((city) => {
      const row = rows.find((r) => r.city.toLowerCase() === city.toLowerCase())
      return row ? fact(`${row.city}: ${row.text}.`) : na(`No ${id === 'revenue' ? 'revenue' : 'coverage'} data for ${city} yet.`)
    })
    return { title: `${title} — comparison`, segments: segs, source: SOURCE, capability: id }
  }

  const segs = rows.length ? rows.map((r) => fact(`${r.city}: ${r.text}.`)) : [na('No city-level data yet.')]
  return { title, segments: segs, source: SOURCE, capability: id }
}

/** The provider entrypoint: resolved intent + snapshot + scope → a fully-formed answer. */
export function founderRespond(s: FounderSnapshot, scope: ClozaScope, intent: ClozaIntent): ClozaAnswer {
  const base = intent.capability === 'unknown'
    ? unknownAnswer()
    : intent.breakdown === 'city'
    ? cityBreakdown(s, intent)
    : capabilityAnswer(s, intent.capability)
  return { ...base, scopeNote: scopeNote({ ...scope, city: intent.city ?? scope.city }) }
}

function unknownAnswer(): ClozaAnswer {
  return {
    title: 'I can’t answer that yet',
    segments: [na('I only answer from Close Eye’s live data today. Try a suggested question — or ask about revenue, growth, operations or expansion.')],
    source: SOURCE,
    capability: 'unknown',
  }
}
