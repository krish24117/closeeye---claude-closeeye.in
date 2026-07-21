/**
 * UAT simulation runner + acceptance gate. Runs the 1,000-persona journey model and prints the full
 * report as JSON (captured to build the founder deliverable). Also asserts the cohort is well-formed
 * and the acceptance criteria are evaluated (soft — the recommendation is a human call on the evidence).
 */
import { writeFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { generatePersonas } from './personas'
import { runUatSimulation } from './journey-sim'

describe('Collaboration UAT — 1,000-persona simulation', () => {
  const personas = generatePersonas(1000)
  const report = runUatSimulation(personas)
  const refined = runUatSimulation(personas, true) // projected, with the 5 approved refinements modeled

  it('runs a well-formed cohort of 1,000', () => {
    expect(personas).toHaveLength(1000)
    expect(report.n).toBe(1000)
    expect(report.perStep).toHaveLength(7)
  })

  it('emits the report', () => {
    if (process.env.UAT_OUT) writeFileSync(process.env.UAT_OUT, JSON.stringify({ baseline: report, refined }))
    expect(report.overallCompletion).toBeGreaterThan(0)
  })

  it('the refinements lift the core journey and clear the empty-network walls', () => {
    expect(refined.coreJourneyCompletion).toBeGreaterThan(report.coreJourneyCompletion)
    expect(refined.understandNetwork).toBeGreaterThan(report.understandNetwork)
    const walls = refined.rankedIssues.filter((i) => i.key.includes('empty-network-wall'))
    expect(walls).toHaveLength(0)
  })
})
