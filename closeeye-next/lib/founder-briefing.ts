/**
 * The Daily Founder Briefing — composed from live metrics with templates. RULE-BASED today; the SAME
 * function-shaped slot Cloza fills with a generated briefing in Phase ④, so the UI never changes:
 * swap the composer, keep the card. Honest by construction — every clause is a live number or it is
 * omitted. Never invents a trend or a cause. Pure (no I/O, no Date) so it is unit-testable.
 */
import type { FounderToday } from '@/lib/db/founder-workspace'

export interface BriefingInput {
  name: string
  today: FounderToday
  foundingMembers: number
  alertCount: number
  presenceToday: number
  daysToLaunch: number | null
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Returns the briefing as ordered sentences (the card renders one per line). */
export function composeFounderBriefing(i: BriefingInput): string[] {
  const t = i.today
  const lines: string[] = []

  // 1 — who we're watching over.
  lines.push(
    t.peopleProtected === 0
      ? 'No families are under Close Eye’s watch yet — the first one is the one that matters most.'
      : `Close Eye is watching over ${t.peopleProtected} ${t.peopleProtected === 1 ? 'person' : 'people'} across ${t.familiesProtected} ${t.familiesProtected === 1 ? 'family' : 'families'}${t.countries > 1 ? ` in ${t.countries} countries` : ''}.`,
  )

  // 2 — today's movement (only clauses that actually happened).
  const moves: string[] = []
  if (t.newFamiliesToday > 0) moves.push(`${t.newFamiliesToday} new ${t.newFamiliesToday === 1 ? 'family' : 'families'} joined`)
  if (t.questionsToday > 0) moves.push(`${t.questionsToday} ${t.questionsToday === 1 ? 'question' : 'questions'} answered`)
  if (t.careRequestsToday > 0) moves.push(`${t.careRequestsToday} care ${t.careRequestsToday === 1 ? 'request' : 'requests'} came in`)
  if (i.presenceToday > 0) moves.push(`${i.presenceToday} ${i.presenceToday === 1 ? 'visit' : 'visits'} in the field`)
  lines.push(moves.length ? `Today so far: ${joinList(moves)}.` : 'A quiet start — nothing new yet today.')

  // 3 — money and system health.
  const rev = t.revenueToday > 0 ? `${inr(t.revenueToday)} came in today.` : 'No revenue yet today.'
  const health = i.alertCount === 0 ? 'All systems calm.' : `${i.alertCount} ${i.alertCount === 1 ? 'thing needs' : 'things need'} your attention.`
  lines.push(`${rev} ${health}`)

  // 4 — the mission clock.
  lines.push(
    i.daysToLaunch != null && i.daysToLaunch >= 0
      ? `${i.daysToLaunch} ${i.daysToLaunch === 1 ? 'day' : 'days'} to launch · ${i.foundingMembers} of 100 founding families.`
      : `${i.foundingMembers} of 100 founding families.`,
  )

  return lines
}
