/**
 * UAT simulation — the journey model + metrics.
 *
 * HONESTY CONTRACT (so the numbers can be trusted for what they are):
 *  • STRUCTURAL, measured from the real build: the seven steps, their tap counts, and the GATES —
 *    Share needs a family member in the network; Assign needs any trusted identity; Trusted Network
 *    is NOT in the dock (reached from the People header); Recommended Next Steps hides unwired
 *    groups. These are facts about the shipped UI (commits 5fc16ee/61915e2), not guesses.
 *  • MODELED, estimated from persona attributes: completion probability, hesitation/confusion, and
 *    time. These are heuristics (tech ability, stress, age, first-time vs returning, scenario↔copy
 *    fit) — a fast, reproducible signal, NOT a substitute for observing real humans.
 *
 * The point is to surface WHERE the flow breaks and for WHOM, at 1,000-persona scale, before Phase 4.
 */
import type { Persona, Scenario } from './personas'

export const STEPS = [
  'Connect answer', 'Recommended Next Steps', 'Trusted Network', 'Share', 'Invite', 'Assign', 'Coordination Timeline',
] as const
export type StepName = (typeof STEPS)[number]

interface StepModel {
  name: StepName
  baseComplete: number // P(complete) for a median (medium-tech, low-stress, returning-neutral) user
  taps: number         // structural: interactions to complete
  timeSec: number      // median seconds
  baseConfusion: number
}

// Structural + median-user baselines, grounded in the actual screens.
const MODEL: StepModel[] = [
  { name: 'Connect answer',          baseComplete: 0.985, taps: 3, timeSec: 42, baseConfusion: 0.06 },
  { name: 'Recommended Next Steps',  baseComplete: 0.90,  taps: 1, timeSec: 12, baseConfusion: 0.18 },
  { name: 'Trusted Network',         baseComplete: 0.78,  taps: 2, timeSec: 20, baseConfusion: 0.30 },
  { name: 'Share',                   baseComplete: 0.90,  taps: 3, timeSec: 18, baseConfusion: 0.12 },
  { name: 'Invite',                  baseComplete: 0.80,  taps: 6, timeSec: 55, baseConfusion: 0.20 },
  { name: 'Assign',                  baseComplete: 0.85,  taps: 4, timeSec: 30, baseConfusion: 0.15 },
  { name: 'Coordination Timeline',   baseComplete: 0.74,  taps: 2, timeSec: 15, baseConfusion: 0.24 },
]

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const NON_CARE: Scenario[] = ['business', 'legal', 'property', 'finance']

export interface StepResult { name: StepName; attempted: boolean; completed: boolean; taps: number; timeSec: number; confusion: number; issues: string[] }
export interface JourneyResult { persona: Persona; steps: StepResult[]; completedAll: boolean }

/** Persona → completion/confusion/time/tap modifiers, applied per step. `refined` models the five
 *  approved fixes: (1) auto-seeded network → nobody is empty; (2) inline add → no navigation wall;
 *  (3) value-first (no upfront teaching); (4) a Home coordination card → timeline is seen; the network
 *  is met populated (real family), which lifts comprehension. */
function evalStep(m: StepModel, p: Persona, idx: number, refined = false): StepResult {
  const r = rng(p.id * 101 + idx * 7 + (refined ? 11 : 3))
  // (1) seeding: every family already has loved ones (+ often a PM), so the network is never empty.
  const hasNetwork = refined ? true : p.hasNetwork
  const hasFamilyInNetwork = refined ? true : p.hasFamilyInNetwork
  let complete = m.baseComplete
  let confusion = m.baseConfusion
  let timeSec = m.timeSec
  let taps = m.taps
  const issues: string[] = []

  // Technical ability.
  if (p.tech === 'low') { complete *= 0.82; confusion += 0.12; timeSec *= 1.6 }
  else if (p.tech === 'high') { complete *= 1.05; confusion -= 0.06; timeSec *= 0.8 }
  // Stress.
  if (p.stress === 'high') { complete *= 0.95; confusion += 0.08; timeSec *= 1.25 }
  // Age × low tech compounding.
  if (p.age >= 65 && p.tech === 'low') { complete *= 0.9; confusion += 0.06; timeSec *= 1.2 }
  // Returning users are fluent.
  if (p.returning) { complete *= 1.06; confusion -= 0.05 } else { confusion += 0.03 }

  // Step-specific structural effects (the real gates + known friction).
  if (m.name === 'Trusted Network') {
    // Refined: met populated with real family (their mother, their PM) → far easier to grasp.
    complete *= refined ? (p.returning ? 0.98 : 0.9) : (p.returning ? 0.95 : 0.78)
    if (!refined && !p.returning) { confusion += 0.10; issues.push('trusted-network-discoverability') }
    else if (refined && !p.returning) confusion += 0.03
    if (p.tech === 'low') confusion += refined ? 0.03 : 0.06
  }
  if (m.name === 'Recommended Next Steps') {
    // On non-care scenarios the health-framed copy ("their care", sage) fits less well.
    if (NON_CARE.includes(p.scenario)) { confusion += 0.10; issues.push('care-centric-copy-on-noncare') }
    // Empty network hid groups — gone once the network is seeded.
    if (!hasNetwork) { confusion += 0.05; issues.push('rns-groups-hidden-when-empty') }
  }
  if (m.name === 'Share') {
    if (!hasFamilyInNetwork) {
      // The empty-network wall — REMOVED in refined (inline add + seeding).
      complete *= 0.55; confusion += 0.18; taps += 4; timeSec *= 1.8; issues.push('share-empty-network-wall')
    } else if (refined && !p.hasFamilyInNetwork) {
      // Seeded, so they pick from real family — smooth.
      complete *= 1.02
    }
  }
  if (m.name === 'Assign') {
    if (!hasNetwork) { complete *= 0.5; confusion += 0.18; taps += 4; timeSec *= 1.8; issues.push('assign-empty-network-wall') }
  }
  if (m.name === 'Invite') {
    // Required purpose builds trust but adds a field; low-tech feel it more.
    if (p.tech === 'low') { taps += 1; confusion += 0.05 }
    issues.push('invite-purpose-required-friction')
  }
  if (m.name === 'Coordination Timeline') {
    // Refined: a Home coordination card surfaces the payoff → far more people see it.
    complete *= refined ? (p.returning ? 0.99 : 0.94) : (p.returning ? 0.98 : 0.85)
    if (!refined && !p.returning) { confusion += 0.06; issues.push('timeline-discoverability') }
  }

  complete = clamp(complete, 0, 0.995)
  confusion = clamp(confusion)
  const attempted = true
  const completed = r() < complete
  // Only keep issue tags when this persona actually struggled (confusion high or step failed).
  const keptIssues = (confusion >= 0.35 || !completed) ? issues : []
  return { name: m.name, attempted, completed, taps: Math.round(taps), timeSec: Math.round(timeSec), confusion, issues: keptIssues }
}

export function simulateJourney(p: Persona, refined = false): JourneyResult {
  const steps = MODEL.map((m, i) => evalStep(m, p, i, refined))
  return { persona: p, steps, completedAll: steps.every((s) => s.completed) }
}

/* ── Aggregate report ────────────────────────────────────────────────────────────────────────── */
export interface StepAgg { name: StepName; completionRate: number; avgTaps: number; avgTimeSec: number; confusion: number }
export interface Issue { key: string; label: string; screen: StepName; frequency: number; severity: 'low' | 'medium' | 'high'; rank: number }
export interface UatReport {
  n: number
  perStep: StepAgg[]
  overallCompletion: number
  /** The REAL funnel: Connect answer → Recommended Next Steps → at least one action (share/invite/assign). */
  coreJourneyCompletion: number
  /** Completed at least one collaboration action of any kind. */
  firstActionSuccess: number
  understandRNS: number       // proxy: engaged RNS without high confusion
  understandNetwork: number   // proxy: completed + low-confusion on Trusted Network
  invitationSuccess: number
  assignmentSuccess: number
  navConfusionRate: number    // share of journeys with a discoverability issue
  heatmap: { screen: StepName; confusion: number }[]
  rankedIssues: Issue[]
  segments: { key: string; label: string; completion: number; avgConfusion: number }[]
  whatsapp: { closeeyeTrackedCompletion: number; whatsappTracked: number; closeeyeAvgTapsAssign: number; note: string }
}

const ISSUE_META: Record<string, { label: string; severity: Issue['severity'] }> = {
  'trusted-network-discoverability': { label: 'Trusted Network is hard to find (not in the dock)', severity: 'high' },
  'share-empty-network-wall': { label: 'Share hits an empty-network wall for first-timers', severity: 'high' },
  'assign-empty-network-wall': { label: 'Assign hits an empty-network wall for first-timers', severity: 'high' },
  'care-centric-copy-on-noncare': { label: 'Care-framed copy feels off for legal/property/finance/business', severity: 'medium' },
  'rns-groups-hidden-when-empty': { label: 'Recommended Next Steps shows fewer groups than expected when empty', severity: 'medium' },
  'invite-purpose-required-friction': { label: 'Required “purpose” adds a step to Invite', severity: 'low' },
  'timeline-discoverability': { label: 'Coordination timeline is easy to miss on Activity', severity: 'medium' },
}
const SEV_WEIGHT = { low: 1, medium: 2, high: 3 } as const

export function runUatSimulation(personas: Persona[], refined = false): UatReport {
  const journeys = personas.map((p) => simulateJourney(p, refined))
  const n = journeys.length
  const stepIdx = (name: StepName) => STEPS.indexOf(name)

  const perStep: StepAgg[] = STEPS.map((name) => {
    const col = journeys.map((j) => j.steps[stepIdx(name)]!)
    const done = col.filter((s) => s.completed)
    return {
      name,
      completionRate: col.filter((s) => s.completed).length / n,
      avgTaps: done.length ? done.reduce((s, x) => s + x.taps, 0) / done.length : 0,
      avgTimeSec: done.length ? done.reduce((s, x) => s + x.timeSec, 0) / done.length : 0,
      confusion: col.reduce((s, x) => s + x.confusion, 0) / n,
    }
  })

  const rnsCol = journeys.map((j) => j.steps[stepIdx('Recommended Next Steps')]!)
  const netCol = journeys.map((j) => j.steps[stepIdx('Trusted Network')]!)
  const understandRNS = rnsCol.filter((s) => s.completed && s.confusion < 0.35).length / n
  const understandNetwork = netCol.filter((s) => s.completed && s.confusion < 0.35).length / n

  const invitationSuccess = perStep[stepIdx('Invite')]!.completionRate
  const assignmentSuccess = perStep[stepIdx('Assign')]!.completionRate

  // Issue frequencies.
  const freq = new Map<string, number>()
  for (const j of journeys) for (const s of j.steps) for (const key of s.issues) freq.set(key, (freq.get(key) ?? 0) + 1)
  const rankedIssues: Issue[] = [...freq.entries()]
    .map(([key, f]) => {
      const meta = ISSUE_META[key] ?? { label: key, severity: 'low' as const }
      const screen = (STEPS.find((st) => journeys.some((j) => j.steps[stepIdx(st)]!.issues.includes(key))) ?? 'Connect answer') as StepName
      return { key, label: meta.label, screen, frequency: f / n, severity: meta.severity, rank: (f / n) * SEV_WEIGHT[meta.severity] }
    })
    .sort((a, b) => b.rank - a.rank)

  const navConfusionRate = journeys.filter((j) =>
    j.steps.some((s) => s.issues.includes('trusted-network-discoverability') || s.issues.includes('timeline-discoverability'))).length / n

  const heatmap = perStep.map((s) => ({ screen: s.name, confusion: s.confusion })).sort((a, b) => b.confusion - a.confusion)

  const answeredIdx = stepIdx('Connect answer'), rnsIdx = stepIdx('Recommended Next Steps')
  const actionIdxs = [stepIdx('Share'), stepIdx('Invite'), stepIdx('Assign')]
  const isCore = (j: JourneyResult) =>
    j.steps[answeredIdx]!.completed && j.steps[rnsIdx]!.completed && actionIdxs.some((i) => j.steps[i]!.completed)
  const seg = (label: string, key: string, filter: (p: Persona) => boolean) => {
    const js = journeys.filter((j) => filter(j.persona))
    const completion = js.length ? js.filter(isCore).length / js.length : 0
    const avgConfusion = js.length ? js.reduce((s, j) => s + j.steps.reduce((a, x) => a + x.confusion, 0) / j.steps.length, 0) / js.length : 0
    return { key, label, completion, avgConfusion }
  }
  const segments = [
    seg('First-time users', 'first_time', (p) => !p.returning),
    seg('Returning users', 'returning', (p) => p.returning),
    seg('Low tech ability', 'low_tech', (p) => p.tech === 'low'),
    seg('High tech ability', 'high_tech', (p) => p.tech === 'high'),
    seg('Age 65+', 'senior', (p) => p.age >= 65),
    seg('High stress', 'high_stress', (p) => p.stress === 'high'),
    seg('Non-care scenarios', 'non_care', (p) => NON_CARE.includes(p.scenario)),
    seg('Health scenario', 'health', (p) => p.scenario === 'health'),
  ]

  // "Simpler than WhatsApp": not fewer taps, but a TRACKED, remembered responsibility. WhatsApp
  // records 0% as a structured, completable, timeline-linked task.
  const assignCol = journeys.map((j) => j.steps[stepIdx('Assign')]!)
  const closeeyeTrackedCompletion = assignCol.filter((s) => s.completed).length / n
  const closeeyeAvgTapsAssign = assignCol.filter((s) => s.completed).reduce((s, x) => s + x.taps, 0) / Math.max(1, assignCol.filter((s) => s.completed).length)

  const firstActionSuccess = journeys.filter((j) => actionIdxs.some((i) => j.steps[i]!.completed)).length / n
  const coreJourneyCompletion = journeys.filter(isCore).length / n

  return {
    n, perStep, overallCompletion: journeys.filter((j) => j.completedAll).length / n,
    coreJourneyCompletion, firstActionSuccess,
    understandRNS, understandNetwork, invitationSuccess, assignmentSuccess, navConfusionRate,
    heatmap, rankedIssues, segments,
    whatsapp: {
      closeeyeTrackedCompletion, whatsappTracked: 0, closeeyeAvgTapsAssign,
      note: 'WhatsApp completes 0% as a tracked, timeline-linked responsibility; Close Eye assignments are structured and remembered.',
    },
  }
}
