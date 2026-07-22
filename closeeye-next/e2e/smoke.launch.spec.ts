import { test, expect } from '@playwright/test'
import { watchConsole } from './helpers'

/**
 * Launch smoke — the pre-beta production gate (Launch Decision Record, Condition 3).
 *
 * Point it at the launch target and re-run before every gate:
 *   VALIDATE_BASE_URL=https://www.closeeye.app npm run smoke:launch
 *
 * PUBLIC checks always run. The AUTHENTICATED journey (the real Connect answer → Recommended Next
 * Steps → Trusted Network) runs only with a dedicated test account (PLAYWRIGHT_USER / PLAYWRIGHT_PASS)
 * — never create production data casually.
 *
 * SAFETY: this NEVER sends a live crisis phrase to production. A real "not breathing" would fire the
 * production 108 escalation + care-team WhatsApp/email to REAL people on every run. Crisis detection is
 * covered by the deterministic safety suite (lib/connect + ask-health safety-engine); the escalation UI
 * is a pure render. We do not spam the care team from a smoke test.
 */

const user = process.env.PLAYWRIGHT_USER
const pass = process.env.PLAYWRIGHT_PASS

test.describe('Launch smoke — public (always runs)', () => {
  test('@launch front door renders, brand present, no runtime errors', async ({ page }) => {
    const c = watchConsole(page)
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(res, 'front door responded').toBeTruthy()
    expect(res!.status(), 'front door HTTP status').toBeLessThan(400)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('body')).toContainText(/close eye/i)
    expect(c.errors(), 'runtime errors on the front door').toEqual([])
  })

  test('@launch health endpoint is OK', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status(), '/api/health status').toBe(200)
  })

  test('@launch legal pages load (privacy + terms)', async ({ page }) => {
    for (const path of ['/privacy', '/terms']) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(res!.status(), `${path} status`).toBeLessThan(400)
      await expect(page.locator('h1, h2').first()).toBeVisible()
    }
  })

  test('@launch sign-in surface renders both methods', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    // Email + password fields present (the family auth path — Google + email, no magic-link).
    await expect(page.getByPlaceholder('you@email.com')).toBeVisible()
    await expect(page.getByPlaceholder('Your password')).toBeVisible()
  })

  test('@launch auth guard — the workspace is not reachable unauthenticated', async ({ page }) => {
    await page.goto('/space', { waitUntil: 'domcontentloaded' })
    // Unauthenticated, we must be routed away from the workspace (to auth / the public door) — never
    // left sitting on /space with authed content.
    await expect
      .poll(() => new URL(page.url()).pathname.startsWith('/space'), { timeout: 15_000 })
      .toBe(false)
  })
})

test.describe('Launch smoke — authenticated critical journey', () => {
  test.skip(!user || !pass, 'set PLAYWRIGHT_USER / PLAYWRIGHT_PASS (dedicated test account) to run')

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    await page.getByPlaceholder('you@email.com').fill(user!)
    await page.getByPlaceholder('Your password').fill(pass!)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL(/\/(space|family)/, { timeout: 25_000 })
  })

  test('@launch Connect answer → Recommended Next Steps → Trusted Network', async ({ page }) => {
    const c = watchConsole(page)

    // 1 · Ask a benign, grounding question — the first suggested prompt (always about the primary
    //     person), so it resolves a subject and surfaces Recommended Next Steps. No crisis (see header).
    await page.goto('/space/connect', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /been lately\?/i }).first().click()

    // Clear the consent backstop if this account predates consent-in-onboarding (new users won't see it).
    const consentBtn = page.getByRole('button', { name: /i understand and agree/i })
    if (await consentBtn.isVisible({ timeout: 5_000 }).catch(() => false)) await consentBtn.click()

    // 2 · The trust beat, then a grounded answer.
    await expect(page.getByText(/Understood/i).first()).toBeVisible({ timeout: 40_000 })
    await expect(page.getByRole('link', { name: /see everyone you love/i }).first()).toBeVisible({ timeout: 40_000 })

    // 3 · The collaboration surface appears under a grounded answer (the launch-hardening work):
    //     the Recommended Next Steps section + a standing door into the Trusted Network.
    await expect(page.getByText(/recommended next steps/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: /your trusted network/i }).first()).toBeVisible({ timeout: 15_000 })

    // 4 · The Trusted Network itself loads (auto-seeded, so never empty).
    await page.goto('/space/network', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /trusted network/i })).toBeVisible({ timeout: 15_000 })

    // 5 · No runtime errors across the journey.
    expect(c.errors(), 'runtime errors during the authenticated journey').toEqual([])
  })
})
