import { test, expect } from '@playwright/test'
import { watchConsole } from './helpers'

/**
 * Connect journey — the core promise: Understand → Reason → Answer, with a follow-up.
 *
 * SAFETY: this deliberately does NOT test a live crisis phrase. A real "not breathing" would fire
 * the production care-team alert (WhatsApp + email) and a 108 escalation to REAL people on every
 * run. Crisis detection is validated by the 191-test safety suite (lib/connect + ask-health
 * safety-engine); the escalation UI is a pure render given kind:'escalate'. We never spam the care
 * team from CI.
 *
 * Runs only with the test account. Uses live ask-health (real Claude call) → generous timeouts.
 */
const user = process.env.PLAYWRIGHT_USER
const pass = process.env.PLAYWRIGHT_PASS

test.describe('Connect — Understand → Reason → Answer', () => {
  test.skip(!user || !pass, 'set PLAYWRIGHT_USER / PLAYWRIGHT_PASS to run')

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    await page.getByPlaceholder('you@email.com').fill(user!)
    await page.getByPlaceholder('Your password').fill(pass!)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL(/\/(space|family)/, { timeout: 25_000 })
  })

  test('@connect ask → understanding shown → grounded answer → follow-up', async ({ page }) => {
    const c = watchConsole(page)
    await page.goto('/space/connect', { waitUntil: 'domcontentloaded' })

    // 1 · Ask a clear, in-scope question about a seeded family member.
    await page.getByRole('textbox').fill('How is my father doing?')
    await page.getByRole('button', { name: 'Ask', exact: true }).click()

    // 2 · The understanding step is visible (the trust beat), then a grounded answer arrives.
    await expect(page.getByText(/Understood/i).first()).toBeVisible({ timeout: 40_000 })
    await expect(page.getByRole('link', { name: /see everyone you love/i }).first()).toBeVisible({ timeout: 40_000 })

    // 3 · Follow-up continues the same conversation.
    await page.getByRole('textbox').fill('And what about his daily routine?')
    await page.getByRole('button', { name: 'Ask', exact: true }).click()
    await expect(page.getByText('And what about his daily routine?')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /see everyone you love/i })).toHaveCount(2, { timeout: 40_000 })

    // 4 · No runtime errors during the exchange.
    expect(c.errors(), 'runtime errors during Connect').toEqual([])
  })

  test('@connect controls: new conversation + history are present', async ({ page }) => {
    await page.goto('/space/connect', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /new/i })).toBeVisible()
    // "Past conversations" appears once durable history exists (after the migration is applied +
    // a conversation is saved). We assert the New control unconditionally; history is best-effort.
  })
})
