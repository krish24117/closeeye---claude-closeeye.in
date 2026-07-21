/**
 * UAT simulation — persona generation. 1,000 realistic families, deterministically seeded so the
 * whole run is reproducible (same seed → same cohort → same metrics). Distributions are chosen to
 * mirror Close Eye's real audience: caregiver-aged adults coordinating elder care, an NRI slice, a
 * long tail of non-health responsibilities (legal/property/finance/business/travel/household), and a
 * realistic spread of technical ability correlated with age.
 *
 * These attributes drive the journey model (journey-sim.ts). Nothing here is random at runtime —
 * a seeded PRNG makes the cohort a fixed, auditable dataset.
 */
export type Tech = 'low' | 'medium' | 'high'
export type Structure = 'nuclear' | 'joint' | 'nri' | 'single_child' | 'sandwich'
export type Scenario = 'health' | 'business' | 'legal' | 'property' | 'finance' | 'travel' | 'household'
export type Stress = 'low' | 'medium' | 'high'

export interface Persona {
  id: number
  age: number
  tech: Tech
  structure: Structure
  scenario: Scenario
  stress: Stress
  returning: boolean
  /** Already has trusted people saved (returning + certain structures are likelier to). */
  hasNetwork: boolean
  /** Has at least one FAMILY member in the network (gates Share). */
  hasFamilyInNetwork: boolean
}

/** mulberry32 — tiny deterministic PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T>(r: () => number, weighted: [T, number][]): T => {
  const total = weighted.reduce((s, [, w]) => s + w, 0)
  let x = r() * total
  for (const [v, w] of weighted) { if ((x -= w) <= 0) return v }
  return weighted[weighted.length - 1]![0]
}

export function generatePersonas(n = 1000, seed = 20260722): Persona[] {
  const out: Persona[] = []
  for (let i = 0; i < n; i++) {
    const r = rng(seed + i * 2654435761)
    const age = 24 + Math.floor(r() * 58) // 24–81
    // Tech correlates with age: older skews lower.
    const tech: Tech = age >= 62
      ? pick(r, [['low', 6], ['medium', 3], ['high', 1]])
      : age >= 45
        ? pick(r, [['low', 3], ['medium', 5], ['high', 3]])
        : pick(r, [['low', 1], ['medium', 4], ['high', 5]])
    const structure = pick<Structure>(r, [['nuclear', 4], ['joint', 3], ['nri', 2], ['single_child', 2], ['sandwich', 3]])
    // Health dominates (elder-care core); real long tail across other domains.
    const scenario = pick<Scenario>(r, [
      ['health', 46], ['finance', 12], ['legal', 9], ['property', 9], ['business', 8], ['travel', 8], ['household', 8],
    ])
    const stress: Stress = scenario === 'health' || scenario === 'legal'
      ? pick(r, [['low', 2], ['medium', 4], ['high', 4]])
      : pick(r, [['low', 4], ['medium', 4], ['high', 2]])
    const returning = r() < 0.35
    const hasNetwork = returning ? r() < 0.8 : r() < 0.15
    const hasFamilyInNetwork = hasNetwork && (structure === 'nuclear' || structure === 'joint' || structure === 'sandwich' ? r() < 0.85 : r() < 0.5)
    out.push({ id: i, age, tech, structure, scenario, stress, returning, hasNetwork, hasFamilyInNetwork })
  }
  return out
}
