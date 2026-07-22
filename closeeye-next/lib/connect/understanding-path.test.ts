/**
 * Track 2, Step 6 — Understanding Constitution, Law 1 enforced: NO regex slot-filler may live in
 * the understanding path. The new comprehension path (contract → core → pipeline → service →
 * model → UI) must never import the deterministic parser (lib/connect/understand or the
 * slot-filling in lib/connect/ledger). This fails the build if the fabricating engine ever creeps
 * back in — the guarantee that the "Hyderabad is a person" bug cannot return through the new path.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..') // → closeeye-next/

// The new understanding path — nothing here may reach for the old parser.
const PATH_FILES = [
  'lib/connect/comprehension.ts',
  'lib/connect/comprehension.cases.ts',
  'lib/connect/comprehend.ts',
  'lib/connect/pipeline.ts',
  'lib/connect/understand-service.ts',
  'lib/connect/model.ts',
  'lib/connect/understand-client.ts',
  'components/connect/understanding-conversation.tsx',
  'app/(workspace)/space/connect/page.tsx',
  'app/api/understand/route.ts',
  // the public /connect first-conversation — migrated off the fabricating ledger (the screenshot
  // surface where "Hyderabad is someone you love" was born). It must stay LLM-only forever.
  'app/(connect)/connect/experience.tsx',
]

// The deterministic parser modules — the slot-filling that fabricated (Law 1).
const FORBIDDEN = [
  /from\s+['"]@\/lib\/connect\/ledger['"]/,
  /from\s+['"]@\/lib\/connect\/understand['"]/,
  /from\s+['"]\.\/ledger['"]/,
  /from\s+['"]\.\/understand['"]/,
]

describe('no regex slot-filler in the understanding path (Law 1)', () => {
  for (const rel of PATH_FILES) {
    it(`${rel} does not import the deterministic parser`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8')
      const hit = FORBIDDEN.find((re) => re.test(src))
      expect(hit, `${rel} imports the retired parser — the understanding path must be LLM-only`).toBeUndefined()
    })
  }
})
