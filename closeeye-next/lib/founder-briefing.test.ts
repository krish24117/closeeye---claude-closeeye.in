/**
 * The Daily Founder Briefing must never invent — it states live numbers or stays silent. This freezes
 * that contract (the same slot Cloza inherits), so a future edit can't slip a fabricated clause in.
 */
import { describe, it, expect } from 'vitest'
import { composeFounderBriefing, type BriefingInput } from './founder-briefing'
import type { FounderToday } from './db/founder-workspace'

const today = (o: Partial<FounderToday> = {}): FounderToday => ({
  peopleProtected: 0, familiesProtected: 0, newFamiliesToday: 0,
  questionsToday: 0, careRequestsToday: 0, revenueToday: 0, countries: 1, ...o,
})
const input = (o: Partial<BriefingInput> = {}): BriefingInput => ({
  name: 'Krishna', today: today(), foundingMembers: 0, alertCount: 0, presenceToday: 0, daysToLaunch: 25, ...o,
})

describe('composeFounderBriefing — honest by construction', () => {
  it('states the empty world plainly, never a fake number', () => {
    const lines = composeFounderBriefing(input())
    expect(lines[0]).toContain('No families are under Close Eye’s watch yet')
    expect(lines[1]).toContain('quiet start')
    expect(lines.join(' ')).not.toMatch(/\bundefined\b|\bNaN\b/)
  })

  it('reports only movements that actually happened (no zero-clauses)', () => {
    const lines = composeFounderBriefing(input({ today: today({ peopleProtected: 41, familiesProtected: 23, newFamiliesToday: 2, questionsToday: 5, careRequestsToday: 0 }) }))
    expect(lines[0]).toBe('Close Eye is watching over 41 people across 23 families.')
    expect(lines[1]).toContain('2 new families joined')
    expect(lines[1]).toContain('5 questions answered')
    expect(lines[1]).not.toContain('care request') // zero → omitted, not "0 care requests"
  })

  it('surfaces multiple countries only when there truly are more than one', () => {
    expect(composeFounderBriefing(input({ today: today({ peopleProtected: 1, familiesProtected: 1, countries: 1 }) }))[0]).not.toContain('countries')
    expect(composeFounderBriefing(input({ today: today({ peopleProtected: 9, familiesProtected: 5, countries: 3 }) }))[0]).toContain('in 3 countries')
  })

  it('always ends on the mission clock', () => {
    const lines = composeFounderBriefing(input({ foundingMembers: 23, daysToLaunch: 25 }))
    expect(lines[lines.length - 1]).toBe('25 days to launch · 23 of 100 founding families.')
  })
})
