/**
 * Founder ops — pure view logic (status derivation, filters, search, export) for
 * the operational dashboard. Dependency-free and deterministic (times injected)
 * so it's unit-tested; operates on a structural RegistrantView so it never pulls
 * in the supabase client.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
/** 'YYYY-MM-DD' for the IST calendar day of `iso` ('' if unparseable). */
function istDayKey(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export interface RegistrantView {
  fullName: string | null
  email: string | null
  phone: string | null
  serviceArea: string | null
  relationship: string | null
  planId: string | null
  subStatus: string | null
  ref: string | null
  registeredAt: string | null
  followedUp: boolean
  followedUpAt?: string | null
}

export type RegStatus = 'activated' | 'waiting' | 'new' | 'follow_up'

export const STATUS_LABEL: Record<RegStatus, string> = {
  new: 'New',
  follow_up: 'Needs follow-up',
  waiting: 'Waiting launch',
  activated: 'Activated',
}

/**
 * What the founder should read at a glance:
 *   Activated (paid/active) → Waiting launch (already contacted) →
 *   New (registered today, not contacted) → Needs follow-up (older, not contacted).
 */
export function registrantStatus(r: RegistrantView, nowIso: string): RegStatus {
  if (r.subStatus === 'active') return 'activated'
  if (r.followedUp) return 'waiting'
  const reg = r.registeredAt ? istDayKey(r.registeredAt) : ''
  return reg && reg === istDayKey(nowIso) ? 'new' : 'follow_up'
}

export type Filter =
  | 'all' | 'today' | 'yesterday' | 'week'
  | 'connect' | 'care' | 'hyderabad' | 'follow_up' | 'activated'

function dayKeyAgo(nowIso: string, n: number): string {
  const ms = Date.parse(nowIso)
  return istDayKey(new Date((Number.isNaN(ms) ? 0 : ms) - n * 86_400_000).toISOString())
}

export function matchesFilter(r: RegistrantView, filter: Filter, nowIso: string): boolean {
  const regKey = r.registeredAt ? istDayKey(r.registeredAt) : ''
  switch (filter) {
    case 'all': return true
    case 'today': return regKey !== '' && regKey === istDayKey(nowIso)
    case 'yesterday': return regKey !== '' && regKey === dayKeyAgo(nowIso, 1)
    case 'week': {
      const keys = new Set(Array.from({ length: 7 }, (_, i) => dayKeyAgo(nowIso, i)))
      return regKey !== '' && keys.has(regKey)
    }
    case 'connect': return r.planId === 'companion'
    case 'care': return r.planId === 'trust'
    case 'hyderabad': return (r.serviceArea ?? '').trim().toLowerCase() === 'hyderabad'
    case 'follow_up': { const s = registrantStatus(r, nowIso); return s === 'new' || s === 'follow_up' }
    case 'activated': return r.subStatus === 'active'
  }
}

export function matchesSearch(r: RegistrantView, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [r.fullName, r.email, r.phone, r.ref, r.serviceArea].some((f) => (f ?? '').toLowerCase().includes(q))
}

/* ── Export ──────────────────────────────────────────────────────────────── */

export function planLabel(planId: string | null): string {
  return planId === 'trust' ? 'Care' : planId === 'companion' ? 'Connect' : ''
}

const CSV_HEADERS = ['Name', 'Mobile', 'Email', 'City', 'Registering for', 'Plan', 'Status', 'Registered', 'Referral', 'Last follow-up']

function csvCell(v: string | null | undefined): string {
  const s = (v ?? '').replace(/"/g, '""')
  return /[",\n]/.test(s) ? `"${s}"` : s
}

export function toCSV(rows: RegistrantView[], nowIso: string): string {
  const lines = [CSV_HEADERS.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.fullName,
        r.phone,
        r.email,
        r.serviceArea,
        r.relationship,
        planLabel(r.planId),
        STATUS_LABEL[registrantStatus(r, nowIso)],
        r.registeredAt,
        r.ref || 'direct',
        r.followedUpAt ?? '',
      ]
        .map(csvCell)
        .join(','),
    )
  }
  return lines.join('\n')
}

/** Comma-separated phone numbers (those we have), for a quick copy. */
export function phoneList(rows: RegistrantView[]): string {
  return rows.map((r) => (r.phone ?? '').trim()).filter(Boolean).join(', ')
}

/** One "Name +91…" per line — a ready broadcast list for WhatsApp. */
export function whatsappList(rows: RegistrantView[]): string {
  return rows
    .filter((r) => (r.phone ?? '').trim())
    .map((r) => `${(r.fullName ?? '').trim()} ${r.phone}`.trim())
    .join('\n')
}
