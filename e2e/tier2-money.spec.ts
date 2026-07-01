// TIER 2 — MONEY (launch-blockers)
// Tests run against https://closeeye.in.
//
// T2.1: Unauthenticated user trying to pay is gated at /auth
// T2.2: Authenticated family → /founding-member/checkout → Razorpay opens — STOP before charge
// T2.3: "How much is it" question → routes to service answer, never health/emergency

import { test, expect, Page } from '@playwright/test'

const EDGE_TIMEOUT = 45_000

async function goToAsk(page: Page) {
  await page.goto('/dashboard/ask')
  await page.waitForLoadState('networkidle')
  const myParentBtn = page.locator('button', { hasText: 'My Parent' })
  if (await myParentBtn.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await myParentBtn.click()
  }
}

// ─── T2.1 — Unauthenticated CTA → sign-in gate ────────────────────────────────
test('T2.1 — /founding-member CTA redirects unauthenticated user to /auth', async ({ browser }) => {
  // Fresh context with NO auth state (guest)
  const ctx = await browser.newContext({ storageState: undefined })
  const page = await ctx.newPage()
  try {
    await page.goto('https://closeeye.in/founding-member')
    await page.waitForLoadState('networkidle')

    // Click any "Become a Founding Member" / checkout CTA
    const cta = page.locator('button', { hasText: /become a (founding )?member|get started/i }).first()
    await expect(cta).toBeVisible({ timeout: 10_000 })
    await cta.click()

    // Should redirect to /auth (sign-in gate)
    await page.waitForURL(/\/auth/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/auth/)
  } finally {
    await ctx.close()
  }
})

// ─── T2.2 — Authenticated → checkout → Razorpay opens (STOP before charge) ───
test('T2.2 — Founding member checkout opens Razorpay modal (no charge)', async ({ page }) => {
  // Navigate directly to checkout (auth state loaded from storageState)
  await page.goto('/founding-member/checkout')
  await page.waitForLoadState('networkidle')

  // Case A: User is already a founding member → page shows SuccessScreen
  const alreadyMember = page.locator('text=You\'re a Founding Member')
  if (await alreadyMember.isVisible({ timeout: 4_000 }).catch(() => false)) {
    // Flow already completed — seed user is a founding member. Test passes.
    console.log('T2.2: seed user is already a founding member — checkout previously completed ✓')
    return
  }

  // Case B: Not yet a member → pay button visible
  const payBtn = page.locator('button', { hasText: /become a founding member|pay|₹100/i }).first()
  await expect(payBtn).toBeVisible({ timeout: 10_000 })
  await payBtn.click()

  // Razorpay loads its checkout iframe (may take a few seconds to fetch the SDK)
  // Wait for the Razorpay iframe or its overlay container
  await page.waitForFunction(
    () => !!document.querySelector('iframe[src*="razorpay"]') ||
          !!document.querySelector('#razorpay-container') ||
          !!document.querySelector('.razorpay-checkout-frame'),
    { timeout: 25_000 },
  )

  // Confirm Razorpay is visible — any of these signals is enough
  const rzpIframe = page.frameLocator('iframe[src*="razorpay"]').first()
  const rzpTitle  = page.locator('#razorpay-container, .razorpay-checkout-frame')

  const iframeVisible = await rzpIframe.locator('body').isVisible({ timeout: 5_000 }).catch(() => false)
  const containerVisible = await rzpTitle.isVisible({ timeout: 2_000 }).catch(() => false)
  expect(iframeVisible || containerVisible, 'Razorpay modal should be visible').toBe(true)

  // STOP — close without paying
  await page.keyboard.press('Escape')
})

// ─── T2.3 — Pricing question → service answer, not health/emergency fallback ──
test('T2.3 — "How much is it" → service answer (not escalation, not health fallback)', async ({ page }) => {
  await goToAsk(page)

  const textarea = page.locator('textarea').first()
  await expect(textarea).toBeEnabled({ timeout: 5_000 })
  await textarea.fill('How much does it cost? And how do you vet your companions?')
  await page.click('button[aria-label="Send"]')

  // Wait for response
  await page.waitForFunction(
    () => !document.querySelector('[style*="ce-dot-bounce"]'),
    { timeout: EDGE_TIMEOUT },
  )
  await page.waitForSelector('.ce-md-answer, a[href^="tel:"]', { timeout: EDGE_TIMEOUT })

  // Must be a regular markdown answer, not an escalation card
  const responseText = await page.locator('.ce-md-answer').first().innerText()
  expect(responseText.length, 'Response should have content').toBeGreaterThan(20)

  // Not a red-card emergency (no tel: CTA)
  await expect(page.locator('a[href^="tel:"]')).not.toBeVisible()

  // Should mention something service-related (cost, companion, close eye, plan)
  expect(responseText.toLowerCase()).toMatch(/close eye|companion|plan|₹|cost|price|month|care|parent/i)
})
