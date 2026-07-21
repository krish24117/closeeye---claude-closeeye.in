/**
 * The Founder role provider for Cloza — the first implemented "skill set". Every answer is computed
 * from a live snapshot and returned as epistemically-tagged segments (fact / recommendation /
 * unavailable). It NEVER fabricates a metric: a number Close Eye doesn't yet track is returned as an
 * honest "unavailable" segment, not a guess. This is the pattern the Admin / PM / Guardian / Customer
 * providers will follow — same engine, same UI, different snapshot + questions.
 */
import type { FounderToday } from '@/lib/db/founder-workspace'
import type { AdminOverview, GuardianOverview, PresenceOverview, AdminOperations } from '@/lib/db/admin'
import { composeFounderBriefing } from '@/lib/founder-briefing'
import type { ClozaAnswer, ClozaQuestion, ClozaSegment } from './types'

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
const fact = (text: string): ClozaSegment => ({ kind: 'fact', text })
const rec = (text: string): ClozaSegment => ({ kind: 'recommendation', text })
const na = (text: string): ClozaSegment => ({ kind: 'unavailable', text })
const SOURCE = 'Live Close Eye data'

export const FOUNDER_QUESTIONS: ClozaQuestion[] = [
  { id: 'briefing', label: 'Summarize today’s business' },
  { id: 'growth', label: 'How are we growing?' },
  { id: 'revenue', label: 'How’s revenue?' },
  { id: 'operations', label: 'How are operations?' },
  { id: 'expansion', label: 'Where should we expand next?' },
  { id: 'actions', label: 'What should I do next?' },
]

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
  }
}

export function founderAnswer(s: FounderSnapshot, id: string): ClozaAnswer {
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
      return { title: 'Growth', segments: segs, source: SOURCE }
    }

    case 'revenue': {
      const segs: ClozaSegment[] = [
        fact(`${inr(t.revenueToday)} came in today; ${inr(o.revenueMonth)} this month.`),
        fact(`MRR is ${inr(o.mrr)} across ${o.activeSubs} active ${o.activeSubs === 1 ? 'membership' : 'memberships'}.`),
      ]
      // ARPF — Average Revenue Per FAMILY (Close Eye is family-centred, not per-user).
      if (o.families > 0) segs.push(fact(`Average revenue per family (ARPF) is ${inr(Math.round(o.mrr / o.families))}/mo.`))
      if (o.outstanding > 0) segs.push(rec(`${inr(o.outstanding)} is outstanding — worth chasing the pending payments.`))
      return { title: 'Revenue', segments: segs, source: SOURCE }
    }

    case 'operations': {
      const g = s.guardian, p = s.presence
      const segs: ClozaSegment[] = [
        fact(`${g.active} ${g.active === 1 ? 'Guardian is' : 'Guardians are'} active, ${g.visitsToday} ${g.visitsToday === 1 ? 'visit' : 'visits'} today, across ${s.operations.coverage.length} ${s.operations.coverage.length === 1 ? 'city' : 'cities'}.`),
        fact(`${p.openCases} open ${p.openCases === 1 ? 'case' : 'cases'} need attention, ${p.dueToday} due today.`),
      ]
      if (g.pendingApplications > 0) segs.push(rec(`${g.pendingApplications} Guardian ${g.pendingApplications === 1 ? 'application' : 'applications'} to review.`))
      segs.push(na('SLA, response times and the emergency queue aren’t instrumented yet.'))
      return { title: 'Operations', segments: segs, source: SOURCE }
    }

    case 'expansion':
      return {
        title: 'Expansion',
        segments: [
          fact(`Live in ${t.countries} ${t.countries === 1 ? 'country' : 'countries'}, covering ${s.operations.coverage.length} ${s.operations.coverage.length === 1 ? 'city' : 'cities'}.`),
          na('There’s no expansion-readiness signal yet — demand by unserved city needs waitlist/lead geo-aggregation.'),
          rec('Deepen the cities you already serve before widening — density beats breadth pre-launch.'),
        ],
        source: SOURCE,
      }

    case 'actions': {
      const alerts = o.alerts
      if (alerts.length === 0) return { title: 'Recommended actions', segments: [rec(`Nothing urgent. Keep reaching out toward the Founding 100 (${o.foundingMembers} of 100).`)], source: SOURCE }
      return { title: 'Recommended actions', segments: alerts.map((a) => rec(a.title)), source: `${SOURCE} · from live alerts` }
    }

    default:
      return unknownAnswer()
  }
}

const KEYWORDS: [RegExp, string][] = [
  [/reven|money|mrr|paid|arpf|arpu|income|billing/i, 'revenue'],
  [/grow|famil|people|countr|acqui|sign[- ]?up|member/i, 'growth'],
  [/oper|guardian|visit|case|\bpm\b|presence|coverage|sla/i, 'operations'],
  [/expan|city|cities|country|market|where.*(next|expand)/i, 'expansion'],
  [/do next|action|priorit|focus|should i/i, 'actions'],
  [/today|business|summar|brief|how are we|overall/i, 'briefing'],
]

export function founderAsk(s: FounderSnapshot, question: string): ClozaAnswer {
  const q = question.trim()
  if (!q) return unknownAnswer()
  for (const [re, id] of KEYWORDS) if (re.test(q)) return founderAnswer(s, id)
  return unknownAnswer()
}

function unknownAnswer(): ClozaAnswer {
  return {
    title: 'I can’t answer that yet',
    segments: [na('I only answer from Close Eye’s live data today. Try a suggested question — or ask about revenue, growth, operations or expansion.')],
    source: SOURCE,
  }
}
