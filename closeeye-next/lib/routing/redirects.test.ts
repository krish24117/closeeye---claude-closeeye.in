/**
 * Phase 0 guardrail — the deep-link safety net for the Workspace home consolidation.
 *
 * Navigation Law 5: every deep link resolves to a canonical URL. This test freezes the contract
 * of legacy paths that must ALWAYS resolve, and fails the build the moment one would 404 — a
 * page removed without a redirect to replace it. It is what makes every later phase safe to move.
 *
 * Resolution = a page renders at that route OR a WORKSPACE_REDIRECTS entry covers it. In Phase 0
 * every page still exists, so this passes on page-existence alone; in Phase 4, as capabilities
 * re-home under /space, the moved page's redirect must appear here or this test goes red.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WORKSPACE_REDIRECTS } from './redirects'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..') // → closeeye-next/

// The FROZEN contract: every legacy path that must always resolve through the migration.
// Do not delete entries when a route moves — add its redirect instead. That is the point.
const CONTRACT = [
  '/space',
  '/family',
  '/family/add',
  '/family/billing',
  '/family/book',
  '/family/connect',
  '/family/connect/[id]',
  '/family/connect/ask',
  '/family/documents',
  '/family/members',
  '/family/members/[id]',
  '/family/members/[id]/health',
  '/family/membership',
  '/family/messages',
  '/family/messages/[id]',
  '/family/profile',
  '/family/profile/edit',
  '/family/services',
  '/family/visits',
  '/family/visits/[id]',
]

/** Does a page render at this route? ('/space' lives in the (workspace) route group.) */
function pageExists(route: string): boolean {
  const rel = route === '/space' ? join('app', '(workspace)', 'space') : join('app', ...route.slice(1).split('/'))
  return existsSync(join(ROOT, rel, 'page.tsx'))
}

/** Is this route covered by a redirect in the single-source map? */
function redirectCovers(route: string): boolean {
  return WORKSPACE_REDIRECTS.some((r) => r.source === route)
}

/** Every /family route that actually exists on disk (to catch a route outside the contract). */
function familyRoutesOnDisk(): string[] {
  const out: string[] = []
  const base = join(ROOT, 'app', 'family')
  const walk = (dir: string, prefix: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const route = `${prefix}/${e.name}`
      if (existsSync(join(dir, e.name, 'page.tsx'))) out.push(route)
      walk(join(dir, e.name), route)
    }
  }
  walk(base, '/family')
  return out
}

describe('deep-link contract — nothing 404s through the migration (Nav Law 5)', () => {
  for (const route of CONTRACT) {
    it(`${route} resolves (renders or redirects)`, () => {
      expect(pageExists(route) || redirectCovers(route), `${route} neither renders nor redirects`).toBe(true)
    })
  }
})

describe('the contract covers every /family route that exists on disk', () => {
  it('no /family route is outside the safety net', () => {
    const missing = familyRoutesOnDisk().filter((r) => !CONTRACT.includes(r))
    expect(missing, `these routes are not in the frozen contract: ${missing.join(', ')}`).toEqual([])
  })
})

describe('the redirect map stays well-formed', () => {
  for (const r of WORKSPACE_REDIRECTS) {
    it(`${r.source} → ${r.destination} is a valid canonical redirect`, () => {
      expect(r.source.startsWith('/')).toBe(true)
      expect(r.destination.startsWith('/')).toBe(true)
      expect(typeof r.permanent).toBe('boolean')
      expect(r.source).not.toBe(r.destination)
    })
  }
  it('map is an array (present even when empty in Phase 0)', () => {
    expect(Array.isArray(WORKSPACE_REDIRECTS)).toBe(true)
  })
})
