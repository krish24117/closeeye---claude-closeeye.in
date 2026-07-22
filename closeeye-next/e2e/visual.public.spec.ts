import { test, expect } from '@playwright/test'

/**
 * Screenshot regression — key public screens only (v1). Auth'd screens (Workspace/Family/Settings)
 * carry dynamic data and join once a seeded test account exists (v1.1). Tolerances + disabled
 * animations keep it stable against a live deployment; regenerate baselines with
 *   npx playwright test visual --update-snapshots
 */
const SCREENS = [
  { name: 'connect', path: '/connect' },
]

for (const s of SCREENS) {
  test(`@visual ${s.name}`, async ({ page }) => {
    await page.goto(s.path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await expect(page).toHaveScreenshot(`${s.name}.png`, {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    })
  })
}
