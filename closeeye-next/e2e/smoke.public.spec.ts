import { test, expect } from '@playwright/test'
import { watchConsole } from './helpers'

/**
 * Public smoke — the pages a signed-out visitor reaches. Each must render and produce no critical
 * console/runtime errors (uncaught exceptions, React/hydration errors, failed critical loads).
 */
const PUBLIC = [
  { name: 'Front door (/)', path: '/' },
  { name: 'Sign in', path: '/auth' },
]

for (const p of PUBLIC) {
  test(`@public ${p.name} renders cleanly`, async ({ page }) => {
    const c = watchConsole(page)
    const resp = await page.goto(p.path, { waitUntil: 'domcontentloaded' })
    expect(resp?.status(), `HTTP status for ${p.path}`).toBeLessThan(400)
    await expect(page.locator('body')).toBeVisible()
    await page.waitForTimeout(1500) // allow hydration to settle
    expect(c.errors(), `runtime errors on ${p.path}`).toEqual([])
  })
}
