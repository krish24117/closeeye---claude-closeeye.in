// Production-readiness preflight — runs as the first step of the deploy gate (see vercel.json /
// CI). A missing REQUIRED prerequisite fails the BUILD, so it can never fail silently at runtime.
// Optional (observability) vars only warn — the app is dormant-safe without them.
import { readFileSync } from 'node:fs'

// Merge process.env with any local .env files, so this works both in CI/Vercel (real env) and
// locally (.env.local), without adding a dotenv dependency.
function loadEnv() {
  const env = { ...process.env }
  for (const f of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').split('\n')) {
        const t = line.trim()
        if (!t || t.startsWith('#') || !t.includes('=')) continue
        const i = t.indexOf('=')
        const k = t.slice(0, i).trim()
        if (env[k] === undefined) env[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      }
    } catch { /* file may not exist — fine */ }
  }
  return env
}

const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const OPTIONAL = ['NEXT_PUBLIC_SENTRY_DSN', 'NEXT_PUBLIC_POSTHOG_KEY']

const env = loadEnv()
const missing = REQUIRED.filter((k) => !env[k])
const missingOpt = OPTIONAL.filter((k) => !env[k])

if (missing.length) {
  console.error(`\n✖ Preflight FAILED — required environment variables are missing:\n   ${missing.join('\n   ')}\n`)
  console.error('   The deployment is blocked so this cannot fail at runtime for a real family.\n')
  process.exit(1)
}
if (missingOpt.length) {
  console.warn(`⚠ Preflight — optional observability vars not set (integrations stay dormant): ${missingOpt.join(', ')}`)
}
console.log('✓ Preflight passed — required environment variables are present.')
