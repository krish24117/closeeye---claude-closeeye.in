/**
 * The Daily Founder Briefing must always answer the same five questions from verified data, and must
 * never invent. This freezes that contract (the same structured output Cloza inherits), so a future
 * edit can't slip a fabricated clause or a false up-trend in.
 */
import { describe, it, expect } from 'vitest'
import { composeFounderBriefing, type BriefingInput } from './founder-briefing'
import type { FounderToday } from './db/founder-workspace'

const today = (o: Partial<FounderToday> = {}): FounderToday => ({
  peopleProtected: 0, familiesProtected: 0, newFamiliesToday: 0,
  questionsToday: 0, careRequestsToday: 0, revenueToday: 0, countries: 1, ...o,
})
const input = (o: Partial<BriefingInput> = {}): BriefingInput => ({
  name: 'Krishna', today: today(), foundingMembers: 0, newFamiliesMonth: 0, revenueMonth: 0,
  alerts: [], presenceToday: 0, daysToLaunch: 25, ...o,
})

describe('composeFounderBriefing — the five questions, honest by construction', () => {
  it('answers all five even on an empty, quiet day — with no fake numbers', () => {
    const b = composeFounderBriefing(input())
    expect(b.happened).toContain('quiet day')
    expect(b.attention).toBe('Nothing needs your attention right now.')
    expect(b.improved).toContain('holding steady')
    expect(b.risk).toBe('Nothing at risk right now.')
    expect(b.next).toContain('25 days to launch')
    expect(Object.values(b).join(' ')).not.toMatch(/\bundefined\b|\bNaN\b/)
  })

  it('“what happened” reports only movements that actually happened', () => {
    const b = composeFounderBriefing(input({ today: today({ newFamiliesToday: 2, questionsToday: 5, careRequestsToday: 0, revenueToday: 0 }) }))
    expect(b.happened).toContain('2 new families')
    expect(b.happened).toContain('5 questions answered')
    expect(b.happened).not.toContain('care request') // zero → omitted, never "0 care requests"
  })

  it('“what improved” never claims an up-trend that did not happen', () => {
    expect(composeFounderBriefing(input()).improved).toContain('holding steady')
    expect(composeFounderBriefing(input({ today: today({ newFamiliesToday: 1, familiesProtected: 10 }) })).improved).toContain('+1 family today')
    expect(composeFounderBriefing(input({ newFamiliesMonth: 4 })).improved).toContain('+4 families this month')
  })

  it('attention, risk and next-action are driven by real alerts', () => {
    const b = composeFounderBriefing(input({ alerts: [{ tone: 'warning', title: '3 Guardian applications to review' }, { tone: 'info', title: '1 membership renewing this week' }] }))
    expect(b.attention).toContain('2 items need attention')
    expect(b.risk).toContain('3 guardian applications to review') // only the warning, lowercased
    expect(b.risk).not.toContain('renewing') // info-tone is not "at risk"
    expect(b.next).toBe('3 Guardian applications to review.')
  })
})
