// TIER 3 — NAV INTEGRITY
// Tests run against https://closeeye.in as admin (super_admin role).
// Verifies every sidebar item: correct route, single active highlight, correct page title.
// Special assertion: Health reports (/admin/health-reports) ≠ Health queries (/admin/queries).

import { test, expect, Page } from '@playwright/test'

// All 17 sidebar items — { path, expectedTitle, label }
const NAV_ITEMS = [
  { path: '/admin',                label: 'Dashboard',        title: 'Dashboard' },
  { path: '/admin/visits',         label: 'Visits',           title: 'Visits' },
  { path: '/admin/queries',        label: 'Health queries',   title: 'Health queries' },
  { path: '/admin/bookings',       label: 'Bookings',         title: 'Bookings' },
  { path: '/admin/live-map',       label: 'Schedules',        title: 'Schedules' },
  { path: '/admin/founding-members', label: 'Founding members', title: 'Founding members' },
  { path: '/admin/families',       label: 'Families',         title: 'Families' },
  { path: '/admin/companions',     label: 'Companions',       title: 'Companions' },
  { path: '/admin/elders',         label: 'Elders',           title: 'Elders' },
  { path: '/admin/doctors',        label: 'Doctors',          title: 'Doctors' },
  { path: '/admin/revenue',        label: 'Revenue',          title: 'Revenue' },
  { path: '/admin/payments',       label: 'Payments',         title: 'Payments' },
  { path: '/admin/plans',          label: 'Plans',            title: 'Plans' },
  { path: '/admin/reports',        label: 'Visit reports',    title: 'Visit reports' },
  { path: '/admin/health-reports', label: 'Health reports',   title: 'Health reports' },
  { path: '/admin/export',         label: 'Export data',      title: 'Export data' },
  { path: '/admin/settings',       label: 'Settings',         title: 'Settings' },
]

async function checkNavState(page: Page, expectedPath: string, expectedTitle: string) {
  await page.goto(expectedPath)
  await page.waitForLoadState('networkidle')

  // 1. URL should match
  await expect(page).toHaveURL(new RegExp(expectedPath.replace('/', '\\/') + '$'))

  // 2. Exactly ONE active nav item
  const activeItems = page.locator('a.adm-nav-item.is-active')
  const count = await activeItems.count()
  expect(count, `Expected exactly 1 active nav item on ${expectedPath}, got ${count}`).toBe(1)

  // 3. Page title in topbar matches expected
  const titleEl = page.locator('.adm-title').first()
  await expect(titleEl).toBeVisible({ timeout: 5_000 })
  const titleText = await titleEl.innerText()
  expect(titleText.trim(), `Wrong page title on ${expectedPath}`).toBe(expectedTitle)

  // 4. The active nav item's label should match the nav label
  const activeLabel = await activeItems.first().innerText()
  // activeLabel may include an icon character — just check it contains the label text
  expect(activeLabel, `Active nav label mismatch on ${expectedPath}`)
    .toContain(NAV_ITEMS.find(n => n.path === expectedPath)!.label)
}

// One test per nav item for clear failure attribution
for (const item of NAV_ITEMS) {
  test(`T3 — ${item.label} (${item.path}) → 1 active item, title "${item.title}"`, async ({ page }) => {
    await checkNavState(page, item.path, item.title)
  })
}

// ─── Critical: Health reports ≠ Health queries ────────────────────────────────
test('T3.special — /admin/health-reports title is "Health reports" not "Health queries"', async ({ page }) => {
  await page.goto('/admin/health-reports')
  await page.waitForLoadState('networkidle')

  const title = await page.locator('.adm-title').first().innerText()
  expect(title.trim()).toBe('Health reports')
  expect(title.trim()).not.toBe('Health queries')

  // And /admin/queries should show "Health queries"
  await page.goto('/admin/queries')
  await page.waitForLoadState('networkidle')
  const title2 = await page.locator('.adm-title').first().innerText()
  expect(title2.trim()).toBe('Health queries')
  expect(title2.trim()).not.toBe('Health reports')
})

// ─── T3.topbar — Contextual action button presence ────────────────────────────
test('T3.topbar — No stray "New visit" button on non-dashboard pages', async ({ page }) => {
  const pagesToCheck = [
    '/admin/queries',
    '/admin/families',
    '/admin/companions',
    '/admin/settings',
    '/admin/revenue',
  ]
  for (const path of pagesToCheck) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const newVisitBtn = page.locator('button', { hasText: /new visit/i })
    await expect(newVisitBtn, `"New visit" button should NOT appear on ${path}`).not.toBeVisible()
  }
})
