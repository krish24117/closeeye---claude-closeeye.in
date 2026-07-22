import type { Page } from '@playwright/test'

/**
 * Runtime-error watcher. Fails a test on the things that actually break production:
 * uncaught exceptions, React/hydration errors (surface as console.error), and failed loads of
 * critical resources (document/script/stylesheet). Benign third-party / favicon noise is ignored.
 */
const IGNORE = [
  /favicon/i,
  /the server responded with a status of 404 .*(favicon|apple-touch|manifest)/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  // Vercel injects its live-preview feedback toolbar (vercel.live/_next-live/…) ONLY on preview
  // deployments; the app's strict CSP blocks it. It is Vercel infra, not app code, and never runs
  // on production — pure preview-environment noise.
  /vercel\.live/i,
]

export function watchConsole(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror (uncaught): ${e.message}`))
  page.on('requestfailed', (r) => {
    const type = r.resourceType()
    if (type === 'document' || type === 'script' || type === 'stylesheet') {
      errors.push(`requestfailed (${type}): ${r.url()} — ${r.failure()?.errorText ?? ''}`)
    }
  })
  return {
    /** Errors that should fail CI (benign noise filtered out). */
    errors: () => errors.filter((e) => !IGNORE.some((re) => re.test(e))),
  }
}
