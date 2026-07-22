/**
 * Guard: workspace components must never navigate to India-app routes (/family/*) or
 * link to the India domain (closeeye.in). These are different front doors of the same
 * codebase — the Connect workspace (/space) must stay self-contained.
 *
 * If this test fails, change the href to a /space or /join route.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, relative } from 'path'
import { fileURLToPath } from 'url'

const here = fileURLToPath(new URL('.', import.meta.url))
// Both homes of workspace UI: the route tree AND its shared components. The shell (Add-someone
// link, dock) lives in components/workspace — omitting it once let a /family/add link slip through.
const workspaceDirs = [
  join(here, '../../app/(workspace)'),
  join(here, '../../components/workspace'),
]

function walkSync(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walkSync(full))
    else if (extname(full) === '.tsx' || extname(full) === '.ts') out.push(full)
  }
  return out
}

describe('workspace cross-domain link guard', () => {
  it('no workspace file navigates to /family/* or external closeeye.in links', () => {
    const files = workspaceDirs.flatMap(walkSync)
    const violations: string[] = []

    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      const rel = relative(join(here, '../..'), file)

      // href="/family/..." — India-only routes, invalid on Connect front door
      if (/href=["'`]\/family\//.test(src)) {
        violations.push(`${rel}: links to /family/ route (India-only — use /join, /space, or /auth instead)`)
      }
      // href="https://closeeye.in/..." — deprecated India domain
      if (/href=["'`]https?:\/\/(www\.)?closeeye\.in/.test(src)) {
        violations.push(`${rel}: external link to closeeye.in (deprecated India app)`)
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `\nWorkspace cross-domain link violations — these break the Connect experience:\n\n` +
        violations.map((v) => `  ✗ ${v}`).join('\n') + '\n'
      )
    }
  })
})
