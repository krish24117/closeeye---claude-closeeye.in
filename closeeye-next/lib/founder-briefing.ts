/**
 * The Daily Founder Briefing — the signature experience. It ALWAYS answers the same five questions,
 * in 30–60 seconds of reading, from verified live data only:
 *   1. What happened today?   2. What requires my attention?   3. What improved?
 *   4. What is at risk?       5. What should I do next?
 * RULE-BASED today; the SAME structured output Cloza fills in Phase ④ (Cloza wraps each answer with
 * an epistemic tag — fact vs recommendation). Honest by construction: every clause is a live number
 * or an honest "quiet/steady/nothing". It never invents a trend, a cause, or a certainty. Pure (no
 * I/O, no Date) so it is unit-testable and identical wherever it renders.
 */
import type { FounderToday } from '@/lib/db/founder-workspace'

export interface BriefingAlert { tone: 'warning' | 'info'; title: string }

export interface BriefingInput {
  name: string
  today: FounderToday
  foundingMembers: number
  newFamiliesMonth: number
  revenueMonth: number
  alerts: BriefingAlert[]
  presenceToday: number
  daysToLaunch: number | null
}

/** The five answers, in order. The Today card and Cloza both render these. */
export interface FounderBriefing {
  happened: string
  attention: string
  improved: string
  risk: string
  next: string
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function composeFounderBriefing(i: BriefingInput): FounderBriefing {
  const t = i.today
  const warnings = i.alerts.filter((a) => a.tone === 'warning')

  // 1 — What happened today? (only clauses that actually happened)
  const moves: string[] = []
  if (t.newFamiliesToday > 0) moves.push(`${t.newFamiliesToday} new ${t.newFamiliesToday === 1 ? 'family' : 'families'}`)
  if (t.questionsToday > 0) moves.push(`${t.questionsToday} ${t.questionsToday === 1 ? 'question' : 'questions'} answered`)
  if (t.careRequestsToday > 0) moves.push(`${t.careRequestsToday} care ${t.careRequestsToday === 1 ? 'request' : 'requests'}`)
  if (i.presenceToday > 0) moves.push(`${i.presenceToday} ${i.presenceToday === 1 ? 'visit' : 'visits'} in the field`)
  if (t.revenueToday > 0) moves.push(`${inr(t.revenueToday)} in`)
  const happened = moves.length ? `${cap(joinList(moves))} today.` : 'A quiet day so far — nothing new yet.'

  // 2 — What requires my attention?
  const attention = i.alerts.length === 0
    ? 'Nothing needs your attention right now.'
    : `${i.alerts.length} ${i.alerts.length === 1 ? 'item needs' : 'items need'} attention — starting with “${i.alerts[0]!.title}”.`

  // 3 — What improved? (a verifiable gain, or an honest "steady" — never a fake up-trend)
  const improved = t.newFamiliesToday > 0
    ? `+${t.newFamiliesToday} ${t.newFamiliesToday === 1 ? 'family' : 'families'} today — ${t.familiesProtected} now under watch.`
    : i.newFamiliesMonth > 0
    ? `+${i.newFamiliesMonth} ${i.newFamiliesMonth === 1 ? 'family' : 'families'} this month.`
    : t.revenueToday > 0
    ? `${inr(t.revenueToday)} earned today.`
    : 'No standout gains today — holding steady.'

  // 4 — What is at risk?
  const risk = warnings.length === 0
    ? 'Nothing at risk right now.'
    : `${cap(joinList(warnings.map((w) => w.title.toLowerCase())))}.`

  // 5 — What should I do next? (the single most useful move — a real alert, or the mission)
  const next = warnings.length > 0
    ? `${cap(warnings[0]!.title)}.`
    : i.daysToLaunch != null
    ? `Keep reaching out — ${i.foundingMembers} of 100 founding families, ${i.daysToLaunch} ${i.daysToLaunch === 1 ? 'day' : 'days'} to launch.`
    : `Keep building toward the Founding 100 (${i.foundingMembers} of 100).`

  return { happened, attention, improved, risk, next }
}
