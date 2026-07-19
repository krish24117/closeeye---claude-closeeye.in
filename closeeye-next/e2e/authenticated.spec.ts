import { test, expect } from '@playwright/test'
import { watchConsole } from './helpers'

/**
 * Authenticated journeys — run ONLY when a dedicated test account is provided via
 * PLAYWRIGHT_USER / PLAYWRIGHT_PASS (so CI never creates production data). These are READ-ONLY
 * smoke checks: they open surfaces and assert they render without runtime errors — they do NOT
 * submit sign-up, add a family member, purchase a plan, or otherwise mutate data.
 *
 * NOTE: the sign-in selectors below are best-effort against the /auth form; verify/adjust them
 * the first time a test account is wired (I could not run this path without credentials).
 */
const user = process.env.PLAYWRIGHT_USER
const pass = process.env.PLAYWRIGHT_PASS

test.describe('authenticated journeys', () => {
  test.skip(!user || !pass, 'set PLAYWRIGHT_USER / PLAYWRIGHT_PASS (a test account) to run')

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    await page.getByLabel(/email/i).first().fill(user!)
    await page.getByLabel(/password/i).first().fill(pass!)
    await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click()
    await page.waitForURL(/\/(space|family|pm|admin|guardian)/, { timeout: 20_000 })
  })

  test('@auth Workspace opens', async ({ page }) => {
    const c = watchConsole(page)
    await page.goto('/space', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('navigation').first()).toBeVisible()
    await page.waitForTimeout(1500)
    expect(c.errors(), 'runtime errors on /space').toEqual([])
  })

  test('@auth Profile (Settings) opens', async ({ page }) => {
    await page.goto('/space/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/you and your access|profile/i).first()).toBeVisible()
  })

  test('@auth Add-family form is reachable (not submitted)', async ({ page }) => {
    await page.goto('/space/people/add', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('textbox').first()).toBeVisible()
  })
})
