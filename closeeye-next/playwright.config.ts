import { defineConfig, devices } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

// Load local-only validation creds from .env.local (gitignored) if present, so `npm run e2e`
// picks up the authenticated journeys locally. CI provides these via GitHub secrets instead.
try {
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^\s*(PLAYWRIGHT_USER|PLAYWRIGHT_PASS|VALIDATE_BASE_URL)\s*=\s*(.*?)\s*$/)
      if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = (m[2] ?? '').replace(/^["']|["']$/g, '')
    }
  }
} catch {
  /* no local env — CI or public-only run */
}

/**
 * Launch Validation Harness v1 — the release gate. Deliberately SMALL: critical journeys, axe,
 * console-error detection, and screenshot regression. It runs against a deployed URL (the UAT
 * preview by default) so it validates the real artifact; override with VALIDATE_BASE_URL.
 *
 * Authenticated journeys run only when PLAYWRIGHT_USER / PLAYWRIGHT_PASS are set (a dedicated test
 * account) — never create production data casually. Lighthouse runs separately via lighthouserc.json.
 */
const baseURL = process.env.VALIDATE_BASE_URL || 'https://connect.closeeye.in'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // auth login against a live preview can flake under parallelism
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
})
