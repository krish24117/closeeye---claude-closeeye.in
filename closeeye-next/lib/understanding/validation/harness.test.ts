/**
 * The release gate — run the seed corpus through a provider and require the metrics to clear thresholds.
 * "Success isn't 'it compiles'." Today it grades the reference provider (the baseline); when the
 * Claude-backed Reasoning + Classifier land behind the same interfaces, this exact test grades them.
 */
import { describe, it, expect } from 'vitest'
import { runHarness, RELEASE_GATE } from './harness'
import { SEED_CORPUS } from './corpus'
import { referenceProviders } from './reference-providers'

describe('Validation Harness — release gate', () => {
  it('the reference provider clears the gate across every metric', async () => {
    const m = await runHarness(SEED_CORPUS, referenceProviders())
    // Visible in the test output — the metrics dashboard the CTO asked for.
    // eslint-disable-next-line no-console
    console.log('Understanding metrics:', JSON.stringify(m, null, 2))

    expect(m.understandingAccuracy).toBeGreaterThanOrEqual(RELEASE_GATE.understandingAccuracy)
    expect(m.wrongClassificationRate).toBeLessThanOrEqual(RELEASE_GATE.wrongClassificationRate)
    expect(m.hallucinationRate).toBeLessThanOrEqual(RELEASE_GATE.hallucinationRate)
    expect(m.correctDomainResolution).toBeGreaterThanOrEqual(RELEASE_GATE.correctDomainResolution)
    expect(m.correctSubjectResolution).toBeGreaterThanOrEqual(RELEASE_GATE.correctSubjectResolution)
    expect(m.clarificationAccuracy).toBeGreaterThanOrEqual(RELEASE_GATE.clarificationAccuracy)
  })
})
