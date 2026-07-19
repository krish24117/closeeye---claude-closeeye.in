import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility — axe on the key public screens. Fails ONLY on serious/critical impact (v1 keeps
 * the gate meaningful, not noisy); moderate/minor are reported but don't block.
 */
const PAGES = [
  { name: 'Connect experience', path: '/connect' },
  { name: 'Sign in', path: '/auth' },
]

for (const p of PAGES) {
  test(`@a11y ${p.name} — no serious/critical violations`, async ({ page }) => {
    await page.goto(p.path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(
      serious.map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}`),
      `serious/critical a11y violations on ${p.path}`,
    ).toEqual([])
  })
}
