/**
 * Design System Constitution — Phase 2 · Lint (the enforcement layer).
 *
 * Treats typography/colour/spacing/motion violations as ARCHITECTURAL DEFECTS, exactly like the
 * navigation guardrail (lib/workspace/nav.test.ts). A pure filesystem scanner: it counts each
 * defect class across the source tree. The companion test (ds-lint.test.ts) runs this as a
 * RATCHET — today's counts are frozen as a baseline; CI fails if any class grows, and the baseline
 * is tightened as each surface migrates onto the tokens. See docs/DESIGN_SYSTEM_CONSTITUTION.md.
 *
 * Phase 2 covers the clear, greppable defect classes; richer rules (off-grid spacing, per-script
 * letter-spacing, ambient-pause) land as migration reaches the surfaces that need them.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SCAN_DIRS = ['app', 'components', 'features', 'lib', 'hooks', 'styles']
const SKIP_DIR = new Set(['node_modules', '.next', 'dist', 'ios', 'android', 'mobile-shell', 'coverage'])
// The lint's own source describes the patterns literally — never scan it (it would match itself).
const SELF = 'lib/design-system/'

export interface Category {
  key: string
  chapter: string
  label: string
  exts: string[]
  re: RegExp
  /** path substrings genuinely exempt (brand logos, the root error page, the swatch reference). */
  allow?: string[]
  /** an absolute cap independent of the baseline (e.g. 0 — must never appear at all). */
  hardMax?: number
}

export const CATEGORIES: Category[] = [
  { key: 'motion-transition-all-tsx', chapter: 'Ch.4 Motion', label: 'transition-all (className)', exts: ['.tsx'], re: /\btransition-all\b/g },
  { key: 'motion-transition-all-css', chapter: 'Ch.4 Motion', label: 'CSS transition: all', exts: ['.css'], re: /transition(?:-property)?:[^;{]*\ball\b/g },
  { key: 'color-white-black', chapter: 'Ch.2 Color', label: 'raw text/bg-white|black', exts: ['.tsx'], re: /\b(?:text|bg|border|fill|stroke|ring|divide|from|to|via|placeholder)-(?:white|black)(?:\/\d+)?\b/g },
  { key: 'color-numbered-palette', chapter: 'Ch.2 Color', label: 'numbered Tailwind palette', exts: ['.tsx'], re: /\b(?:text|bg|border|from|to|via|ring|fill|stroke|divide|outline|placeholder|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)\b/g, hardMax: 0 },
  { key: 'color-raw-hex-tsx', chapter: 'Ch.2 Color', label: 'raw hex colour in TSX', exts: ['.tsx'], re: /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g, allow: ['global-error', 'design-system/page', 'auth/page'] },
  { key: 'type-arbitrary-size', chapter: 'Ch.1 Typography', label: 'text-[…] arbitrary size', exts: ['.tsx'], re: /\btext-\[/g },
  { key: 'type-inline-fontsize', chapter: 'Ch.1 Typography', label: 'inline fontSize', exts: ['.tsx'], re: /fontSize\s*:/g },
  // Fonts are a token, never an inline string. Use the `font-display` / `font-sans` utilities, never
  // `style={{ fontFamily: … }}` — that ad-hoc pattern is exactly how the /join funnel drifted to the
  // wrong typeface. global-error renders before hydration (no Tailwind), so it is the one exemption.
  { key: 'type-inline-fontfamily', chapter: 'Ch.1 Typography', label: 'inline fontFamily (use font-display / font-sans)', exts: ['.tsx'], re: /fontFamily\s*:/g, allow: ['global-error'], hardMax: 0 },
  { key: 'radius-arbitrary', chapter: 'Ch.3 Spacing & Layout', label: 'rounded-[…] arbitrary radius', exts: ['.tsx'], re: /\brounded(?:-[a-z]+)?-\[/g },
  { key: 'spacing-physical-direction', chapter: 'Ch.3 Spacing & Layout', label: 'physical direction utilities (ml/mr/pl/pr, text-left/right) — use logical ms/me/ps/pe', exts: ['.tsx'], re: /\b-?(?:ml|mr|pl|pr)-(?:\d|\[|auto)|\btext-(?:left|right)\b/g },
]

function walk(dir: string, out: string[]): void {
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (SKIP_DIR.has(e.name) || e.name.startsWith('.')) continue
      walk(full, out)
    } else {
      out.push(full)
    }
  }
}

export interface ScanResult {
  counts: Record<string, number>
  /** up to a few sample offender files per class, for a helpful failure message. */
  samples: Record<string, string[]>
}

export function scan(): ScanResult {
  const counts: Record<string, number> = {}
  const samples: Record<string, string[]> = {}
  for (const c of CATEGORIES) { counts[c.key] = 0; samples[c.key] = [] }

  const files: string[] = []
  for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files)

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')
    if (rel.startsWith(SELF)) continue
    const ext = path.extname(file)
    let content: string | null = null
    for (const c of CATEGORIES) {
      if (!c.exts.includes(ext)) continue
      if (c.allow && c.allow.some((a) => rel.includes(a))) continue
      if (content === null) { try { content = fs.readFileSync(file, 'utf8') } catch { content = '' } }
      const m = content.match(c.re)
      if (m && m.length) {
        counts[c.key] = (counts[c.key] ?? 0) + m.length
        const s = samples[c.key]
        if (s && s.length < 8) s.push(`${rel} (${m.length})`)
      }
    }
  }
  return { counts, samples }
}
