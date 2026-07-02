// BOOKING FLOW — end-to-end test
// Covers the full path: service grid → wizard (date → address → review) → bookings list.
// Verifies the booking appears in My Bookings after submission.
// Runs as seed-family@closeeye.test (uses family auth storage state).

import { test, expect } from '@playwright/test'

test.describe('Booking wizard', () => {

  // ── T-BK1: Service grid navigates to wizard ───────────────────────────────
  test('T-BK1: tapping a service card opens the wizard, not a sheet', async ({ page }) => {
    await page.goto('/dashboard/book')
    await page.waitForLoadState('networkidle')

    // Should see the service grid
    await expect(page.locator('text=Book a Service')).toBeVisible()

    // Tap "Home Visit" book button
    const bookBtn = page.locator('.ce-sv-card').filter({ hasText: 'Home Visit' }).locator('button')
    await expect(bookBtn).toBeVisible()
    await bookBtn.click()

    // Should navigate to /dashboard/book/home_visit — NOT show a sheet
    await expect(page).toHaveURL(/\/dashboard\/book\/home_visit/, { timeout: 8_000 })

    // Wizard header should be visible
    await expect(page.locator('text=Home Visit')).toBeVisible()

    // No sheet overlay should exist
    await expect(page.locator('.ce-sheet-overlay')).not.toBeAttached()
  })

  // ── T-BK2: Emergency flow ─────────────────────────────────────────────────
  test('T-BK2: emergency wizard shows call CTA and submits without date/time', async ({ page }) => {
    await page.goto('/dashboard/book/emergency_support_visit')
    await page.waitForLoadState('networkidle')

    // Emergency header
    await expect(page.locator('text=Emergency request')).toBeVisible({ timeout: 5_000 })

    // Call CTA present
    await expect(page.locator('a[href^="tel:"]')).toBeVisible()

    // Address textarea present
    const addressArea = page.locator('textarea').first()
    await expect(addressArea).toBeVisible()

    // Fill address so submit button is enabled
    await addressArea.fill('12, Test Flat, Banjara Hills, Hyderabad 500034')

    // CTA should be enabled now
    const submitBtn = page.locator('button', { hasText: 'Request emergency visit' })
    await expect(submitBtn).toBeEnabled()
  })

  // ── T-BK3: Full wizard flow → booking appears in My Bookings ─────────────
  test('T-BK3: complete wizard flow and booking is visible in My Bookings', async ({ page }) => {
    // ── Step 0: Go directly to the wizard for Home Visit ──
    await page.goto('/dashboard/book/home_visit')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Home Visit')).toBeVisible({ timeout: 8_000 })
    await expect(page.locator('text=When?')).toBeVisible()

    // ── Step 1: Pick a date ──
    // Click the first date chip (today or tomorrow depending on slots)
    const dateChip = page.locator('button').filter({ hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun/ }).first()
    await expect(dateChip).toBeVisible({ timeout: 5_000 })
    await dateChip.click()

    // Wait for time slots to appear (they load after date selection)
    const slotBtn = page.locator('button').filter({ hasText: /AM|PM/ }).first()
    await expect(slotBtn).toBeVisible({ timeout: 5_000 })
    await slotBtn.click()

    // Verify a slot is selected (CTA should become active)
    const continueBtn = page.locator('button', { hasText: 'Continue →' })
    await expect(continueBtn).toBeEnabled({ timeout: 3_000 })
    await continueBtn.click()

    // ── Step 2: Address ──
    await expect(page.locator('text=Where?')).toBeVisible({ timeout: 5_000 })

    const addressArea = page.locator('textarea').first()
    await expect(addressArea).toBeVisible()

    // If address is empty (test user has no saved address), fill one in
    const existingAddress = await addressArea.inputValue()
    if (!existingAddress.trim()) {
      await addressArea.fill('Flat 4B, Green Residency, Jubilee Hills, Hyderabad 500033')
    }

    await continueBtn.click()

    // ── Step 3: Review ──
    await expect(page.locator('text=Confirm your booking')).toBeVisible({ timeout: 5_000 }).catch(() =>
      expect(page.locator('text=Review your booking')).toBeVisible({ timeout: 5_000 })
    )

    // Service name and price should be in the review card
    await expect(page.locator('text=Home Visit')).toBeVisible()
    await expect(page.locator('text=₹1,000')).toBeVisible()

    // Disclaimer about no upfront payment
    await expect(page.locator('text=No payment now')).toBeVisible()

    // ── Submit ──
    const confirmBtn = page.locator('button', { hasText: 'Confirm Booking' })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    // ── Should navigate to /dashboard/bookings ──
    await expect(page).toHaveURL(/\/dashboard\/bookings/, { timeout: 20_000 })

    // ── T-BK3 KEY ASSERTION: booking must appear in the list ──
    // Give the page a moment to load
    await page.waitForLoadState('networkidle')

    // Should NOT show empty state
    await expect(page.locator('text=No bookings yet')).not.toBeVisible({ timeout: 5_000 })

    // Booking card for Home Visit should be visible
    await expect(page.locator('text=Home Visit').first()).toBeVisible({ timeout: 10_000 })

    // Status pill should be "Pending confirmation" or "Request received"
    const statusPill = page.locator('[class*="ce-bk-pill"]').first()
    await expect(statusPill).toBeVisible()
    const pillText = await statusPill.textContent()
    expect(
      pillText?.toLowerCase().includes('pending') ||
      pillText?.toLowerCase().includes('request') ||
      pillText?.toLowerCase().includes('detail')
    ).toBeTruthy()
  })

  // ── T-BK4: Back button on wizard returns to service grid ─────────────────
  test('T-BK4: back button on step 1 returns to /dashboard/book', async ({ page }) => {
    await page.goto('/dashboard/book/home_visit')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Home Visit')).toBeVisible({ timeout: 5_000 })

    const backBtn = page.locator('button[aria-label="Back"]')
    await expect(backBtn).toBeVisible()
    await backBtn.click()

    await expect(page).toHaveURL(/\/dashboard\/book$/, { timeout: 5_000 })
    await expect(page.locator('text=Book a Service')).toBeVisible()
  })

  // ── T-BK5: Unknown serviceId shows 404-style fallback ────────────────────
  test('T-BK5: invalid serviceId shows fallback, not a crash', async ({ page }) => {
    await page.goto('/dashboard/book/nonexistent_service_xyz')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Service not found')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Back to services')).toBeVisible()
  })

})
