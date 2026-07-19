import { test, expect } from '@playwright/test'

/**
 * Authenticated screenshot regression — the migration safety net. Baselines the Workspace surfaces
 * a colour/spacing migration touches, so any unintended pixel change (a typo'd class dropping a
 * background, etc.) is caught. Runs only with a test account (PLAYWRIGHT_USER/PASS). The greeting
 * (time-of-day) is masked; animations disabled; small tolerance for anti-aliasing.
 */
const user = process.env.PLAYWRIGHT_USER
const pass = process.env.PLAYWRIGHT_PASS

test.describe('workspace visual regression', () => {
  test.skip(!user || !pass, 'set PLAYWRIGHT_USER / PLAYWRIGHT_PASS to run')

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    await page.getByPlaceholder('you@email.com').fill(user!)
    await page.getByPlaceholder('Your password').fill(pass!)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL(/\/(space|family)/, { timeout: 25_000 })
  })

  test('@visual-auth Workspace home', async ({ page }) => {
    await page.goto('/space', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot('space-home.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('h1').first()], // the "Good <time>, Anita" greeting varies by time of day
    })
  })

  test('@visual-auth Profile', async ({ page }) => {
    await page.goto('/space/settings', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await expect(page).toHaveScreenshot('space-profile.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    })
  })
})
