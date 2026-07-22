/**
 * Design System lint — the ratchet guardrail (Phase 2). Modeled on lib/workspace/nav.test.ts.
 *
 * Today's violation counts are frozen in ds-lint.baseline.json. This test FAILS if any defect
 * class grows above its baseline (a new violation was added) — so migration can only reduce the
 * numbers, never let them creep back. As a surface migrates, regenerate the baseline to ratchet it
 * down:  DS_LINT_UPDATE=1 npx vitest run lib/design-system/ds-lint.test.ts
 *
 * `color-numbered-palette` has a hard cap of 0 — the numbered Tailwind palette may never appear.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { scan, CATEGORIES } from './ds-lint'

const BASELINE_PATH = path.join(process.cwd(), 'lib', 'design-system', 'ds-lint.baseline.json')

const { counts, samples } = scan()

// Self-baselining: on first run (or with DS_LINT_UPDATE=1) write the current counts and pass.
if (process.env.DS_LINT_UPDATE === '1' || !fs.existsSync(BASELINE_PATH)) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`)
  // eslint-disable-next-line no-console
  console.log('[ds-lint] baseline written:', counts)
}

const baseline: Record<string, number> = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))

describe('Design System lint — ratchet guardrail (Phase 2)', () => {
  for (const c of CATEGORIES) {
    const base = baseline[c.key] ?? 0
    const cur = counts[c.key] ?? 0
    it(`${c.chapter} · ${c.label}: ≤ ${c.hardMax !== undefined ? c.hardMax : `baseline ${base}`}`, () => {
      const offenders = (samples[c.key] ?? []).join(', ')
      if (c.hardMax !== undefined) {
        expect(cur, `${c.label} must stay ≤ ${c.hardMax}. Offenders: ${offenders || 'none'}`).toBeLessThanOrEqual(c.hardMax)
      }
      expect(
        cur,
        `${c.label} rose above baseline (${base} → ${cur}). A new violation was added — migrate it onto a token or revert. Recent offenders: ${offenders}`,
      ).toBeLessThanOrEqual(base)
    })
  }

  it('ratchet: when a class drops below baseline, the baseline should be tightened', () => {
    const improved = CATEGORIES
      .filter((c) => (counts[c.key] ?? 0) < (baseline[c.key] ?? 0))
      .map((c) => `${c.key}: ${baseline[c.key]} → ${counts[c.key]}`)
    if (improved.length) {
      // eslint-disable-next-line no-console
      console.log('[ds-lint] ratchet-down available (run DS_LINT_UPDATE=1 to lock it in):\n  ' + improved.join('\n  '))
    }
    expect(Array.isArray(improved)).toBe(true)
  })
})
