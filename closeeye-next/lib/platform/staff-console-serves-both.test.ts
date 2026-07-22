/**
 * GUARDRAIL — the staff console serves both front doors, always.
 *
 * closeeye.in and connect.closeeye.in are not two domains — they are two front doors of ONE
 * platform. The staff console (Guardian / Admin / Presence Manager) is Care's operational
 * backbone: region-agnostic, brand-agnostic, front-door-agnostic. It must serve every family
 * with active Care, whichever door they came in.
 *
 * Family-facing surfaces adapt to the FAMILY's region (Phase 5 — an out-of-region family
 * never sees "Book a visit"). The staff console does NOT adapt to the visitor's host. If a
 * future change ever made the console appear on one front door but not the other, this test
 * fails before it ships.
 *
 * It scans the staff route sources for the only mechanisms that could silo them: branching on
 * the request host, a host-conditional redirect, or a deploy-time exclusion. There are none
 * today; this pins that.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..') // → closeeye-next/
const STAFF_DIRS = ['app/guardian', 'app/admin', 'app/pm']

/** Every .ts/.tsx file under a directory tree. */
function sources(dir: string): string[] {
  const abs = join(ROOT, dir)
  if (!existsSync(abs)) return []
  const out: string[] = []
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...sources(p))
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

/** Strip comments so a domain named in prose can't false-trip a code check. */
function code(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

// The host-branching mechanisms — the ONLY ways one app can serve different content per host.
const HOST_GATES: { name: string; re: RegExp }[] = [
  { name: 'location.host / location.hostname', re: /\blocation\s*\.\s*host(name)?\b/ },
  { name: 'x-forwarded-host header', re: /x-forwarded-host/i },
  { name: 'a request-host read from headers()', re: /headers\(\)[\s\S]{0,40}\.get\(\s*['"`]host['"`]/i },
  { name: 'a hardcoded connect. subdomain comparison', re: /['"`]connect\.closeeye/i },
]

describe('the staff console is present on the ONE app both front doors build from', () => {
  for (const dir of STAFF_DIRS) {
    it(`${dir} exists and has route files`, () => {
      expect(sources(dir).length).toBeGreaterThan(0)
    })
  }
})

describe('no staff route branches on the request host', () => {
  const files = STAFF_DIRS.flatMap(sources)
  it('there are staff route files to check', () => expect(files.length).toBeGreaterThan(0))
  for (const gate of HOST_GATES) {
    it(`no staff source uses ${gate.name}`, () => {
      const offenders = files.filter((f) => gate.re.test(code(f)))
      expect(offenders, `host-gating in: ${offenders.join(', ')}`).toEqual([])
    })
  }
})

describe('no deploy-time or config mechanism can silo the console to one front door', () => {
  it('next.config has no host-conditional redirect/rewrite', () => {
    const cfg = ['next.config.ts', 'next.config.mjs', 'next.config.js']
      .map((f) => join(ROOT, f)).find(existsSync)
    expect(cfg, 'next.config not found').toBeTruthy()
    const src = readFileSync(cfg!, 'utf8')
    // Next host-gates a route via `has`/`missing` with `type: 'host'`.
    expect(/type:\s*['"`]host['"`]/.test(src)).toBe(false)
  })

  it('no .vercelignore excludes the staff routes from a deployment', () => {
    const vi = join(ROOT, '.vercelignore')
    if (!existsSync(vi)) return // none = nothing excluded = serves both
    const lines = readFileSync(vi, 'utf8').split('\n').map((l) => l.trim())
    const excludesStaff = lines.some((l) => /guardian|admin|(^|\/)pm(\/|$)/.test(l))
    expect(excludesStaff, '.vercelignore drops a staff route').toBe(false)
  })
})
