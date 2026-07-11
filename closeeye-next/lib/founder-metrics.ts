/**
 * Founder Activation Dashboard — pure metric derivation (Phase 4).
 *
 * Real numbers only, computed from real rows. Dependency-free and deterministic
 * (times are passed IN) so every derivation is unit-tested. The DB wrapper
 * (lib/db/founder-dashboard.ts) fetches the rows and calls deriveFounderMetrics.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 'YYYY-MM-DD' for the IST calendar day containing `iso` ('' if unparseable). */
export function istDayKey(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/** The 7 IST day keys ending on the day of `nowIso` (oldest first). */
export function last7DayKeys(nowIso: string): string[] {
  const nowMs = Date.parse(nowIso)
  const base = Number.isNaN(nowMs) ? 0 : nowMs
  const keys: string[] = []
  for (let i = 6; i >= 0; i--) keys.push(new Date(base + IST_OFFSET_MS - i * 86400000).toISOString().slice(0, 10))
  return keys
}

/** '2026-07-12' → '12 Jul'. */
export function shortLabel(dayKey: string): string {
  const [, m, d] = dayKey.split('-')
  const mi = parseInt(m ?? '', 10) - 1
  return `${parseInt(d ?? '', 10)} ${MONTHS[mi] ?? ''}`.trim()
}

export interface FounderMetricsInput {
  registrations: { service_area?: string | null; registered_at?: string | null }[]
  subs: { plan_id?: string | null; status?: string | null }[]
  waitlist: number
  landingViews: number
  whatsappClicks: number
  nowIso: string
}

export interface FounderMetrics {
  totalRegistrations: number
  hyderabadFamilies: number
  waitlist: number
  connectSelected: number
  careSelected: number
  registrationsToday: number
  daily: { label: string; value: number }[]
  whatsappClicks: number
  landingViews: number
  conversionPct: number | null
  activationQueue: number
  careSharePct: number | null
}

export function deriveFounderMetrics(input: FounderMetricsInput): FounderMetrics {
  const total = input.registrations.length
  const hyderabad = input.registrations.filter(
    (r) => (r.service_area ?? '').trim().toLowerCase() === 'hyderabad',
  ).length

  const connect = input.subs.filter((s) => s.plan_id === 'companion').length
  const care = input.subs.filter((s) => s.plan_id === 'trust').length
  const activated = input.subs.filter((s) => s.status === 'active').length
  const activationQueue = Math.max(0, total - activated)

  const byDay = new Map<string, number>()
  for (const r of input.registrations) {
    const k = r.registered_at ? istDayKey(r.registered_at) : ''
    if (k) byDay.set(k, (byDay.get(k) ?? 0) + 1)
  }
  const daily = last7DayKeys(input.nowIso).map((k) => ({ label: shortLabel(k), value: byDay.get(k) ?? 0 }))
  const registrationsToday = byDay.get(istDayKey(input.nowIso)) ?? 0

  // A conversion rate is ≤ 100% by definition; direct entries (no landing view)
  // can push registrations above views, so cap the display. The raw counts are
  // shown on their own, so nothing is hidden.
  const conversionPct = input.landingViews > 0 ? Math.min(100, Math.round((total / input.landingViews) * 100)) : null
  const careDenom = care + connect
  const careSharePct = careDenom > 0 ? Math.round((care / careDenom) * 100) : null

  return {
    totalRegistrations: total,
    hyderabadFamilies: hyderabad,
    waitlist: input.waitlist,
    connectSelected: connect,
    careSelected: care,
    registrationsToday,
    daily,
    whatsappClicks: input.whatsappClicks,
    landingViews: input.landingViews,
    conversionPct,
    activationQueue,
    careSharePct,
  }
}
