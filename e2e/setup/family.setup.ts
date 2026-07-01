import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FAMILY_FILE = path.join(__dirname, '../.auth/family.json')

setup('authenticate as family', async ({ page }) => {
  await page.goto('/auth')
  await page.waitForLoadState('networkidle')

  // Click "Log in" tab if signup mode is showing
  const loginTab = page.locator('text=Log in').first()
  if (await loginTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await loginTab.click()
  }

  await page.fill('input[placeholder="you@email.com"]', 'seed-family@closeeye.test')
  await page.fill('input[placeholder="••••••••"]', 'E2ETest@2026')
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/dashboard/, { timeout: 25_000 })
  await expect(page).toHaveURL(/\/dashboard/)

  await page.context().storageState({ path: FAMILY_FILE })
})
