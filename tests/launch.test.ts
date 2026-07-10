// Founder Funnel Launch Mode (Phase 1) — the gate must withhold payment/booking
// ONLY for a founder registrant, ONLY while pre-launch. A normal visitor is never
// gated, so QA + production stay fully live until launch. The AUTHORITY is the
// durable account signal; the localStorage session hint is only a fallback.
//
// (isFounderPreLaunch is tested against the default launch date — 15 Aug 2026 IST
//  — since NEXT_PUBLIC_FOUNDER_LAUNCH_DATE is unset in the test environment.)
//
// Run: node --test tests/launch.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isFounderPreLaunch, launchMode, shouldGateFounderFunnel } from '../closeeye-next/lib/launch.ts'

const before = Date.parse('2026-07-11T12:00:00+05:30')
const justBefore = Date.parse('2026-08-14T23:59:00+05:30')
const atLaunch = Date.parse('2026-08-15T00:00:00+05:30')
const after = Date.parse('2026-08-16T09:00:00+05:30')

test('isFounderPreLaunch: true before the launch date (IST); false at and after', () => {
  assert.equal(isFounderPreLaunch(before), true)
  assert.equal(isFounderPreLaunch(justBefore), true)
  assert.equal(isFounderPreLaunch(atLaunch), false) // the launch moment is live, not pre-launch
  assert.equal(isFounderPreLaunch(after), false)
})

test('launchMode: "pre-launch" before the launch date, "live" at and after', () => {
  assert.equal(launchMode(before), 'pre-launch')
  assert.equal(launchMode(justBefore), 'pre-launch')
  assert.equal(launchMode(atLaunch), 'live')
  assert.equal(launchMode(after), 'live')
})

test('shouldGateFounderFunnel: withholds ONLY for a founder registrant, pre-launch', () => {
  // A normal (no-signal) visitor is NEVER gated — existing routes stay fully live.
  assert.equal(shouldGateFounderFunnel({ preLaunch: true, sessionHint: false }), false)
  // Session hint gates (provisional, pre-account).
  assert.equal(shouldGateFounderFunnel({ preLaunch: true, sessionHint: true }), true)
  // The durable account AUTHORITY gates on its own, hint or no hint.
  assert.equal(shouldGateFounderFunnel({ preLaunch: true, accountIsFounderPrelaunch: true }), true)
  assert.equal(shouldGateFounderFunnel({ preLaunch: true, accountIsFounderPrelaunch: true, sessionHint: false }), true)
})

test('shouldGateFounderFunnel: nothing is gated once launched', () => {
  assert.equal(shouldGateFounderFunnel({ preLaunch: false, sessionHint: true }), false)
  assert.equal(shouldGateFounderFunnel({ preLaunch: false, accountIsFounderPrelaunch: true }), false)
})
