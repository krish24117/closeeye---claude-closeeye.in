import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_FILE = path.join(__dirname, '../.auth/admin.json')

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth')
  await page.waitForLoadState('networkidle')

  // Click "Log in" tab if signup mode is showing
  const loginTab = page.locator('text=Log in').first()
  if (await loginTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await loginTab.click()
  }

  await page.fill('input[placeholder="you@email.com"]', 'krish24117@gmail.com')
  await page.fill('input[placeholder="••••••••"]', 'Admin@123')
  await page.click('button[type="submit"]')

  await page.waitForURL(/\/admin/, { timeout: 25_000 })
  await expect(page).toHaveURL(/\/admin/)

  await page.context().storageState({ path: ADMIN_FILE })
})
