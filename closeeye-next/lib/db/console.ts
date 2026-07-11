import { supabase } from '@/lib/supabase'
import { fetchAdminThreads, fetchAdminThreadMeta, type AdminThreadRef } from '@/lib/db/messages'
import { fetchElderProfile, fetchReportedBookingIds } from '@/lib/db/family'

/**
 * Presence Console — the REAL caseload + Today overview for the signed-in staff
 * member. RLS does the scoping: a Super Admin sees every family; a Presence
 * Manager sees only the families in `family_assignments`. Reads loved_ones,
 * bookings, messages, urgent member_queries + best-effort companions.
 * (member_queries/visits gain a PM read policy in 20260709160000_pm_console_reads;
 * Super Admins can already read them via is_admin().)
 */

export type CaseStatus = 'green' | 'yellow' | 'red'
export const CASE_RANK: Record<CaseStatus, number> = { red: 0, yellow: 1, green: 2 }

export interface ConsoleFamilyLive {
  lovedOneId: string
  familyUserId: string
  name: string
  relationship: string | null
  age: number | null
  city: string | null
  phone: string | null
  status: CaseStatus
  reason: string
  nextVisitLabel: string | null
  awaitingReply: boolean
  needsVisitAttention: boolean
  urgentQuestion: string | null
}

export interface ConsoleTriageItem {
  id: string
  lovedOneId: string
  memberName: string
  kind: 'urgent' | 'message' | 'visit'
  tone: 'red' | 'amber'
  tag: string
  text: string
  href: string
}

export type ConsoleVisitStatus = 'upcoming' | 'en-route' | 'on-site' | 'completed' | 'cancelled'

export interface ConsoleScheduleItem {
  id: string
  lovedOneId: string
  memberName: string
  guardianName: string | null
  timeLabel: string
  status: ConsoleVisitStatus
}

export interface ConsoleOverview {
  families: ConsoleFamilyLive[]
  triage: ConsoleTriageItem[]
  schedule: ConsoleScheduleItem[]
}

interface LovedOneRow {
  id: string
  family_user_id: string
  full_name: string
  relationship: string | null
  age: number | null
  city: string | null
  phone_number: string | null
}
interface BookingRow {
  id: string
  loved_one_id: string | null
  status: string
  scheduled_at: string | null
  attention_needed: boolean | null
  companion_id: string | null
}
interface CompanionRow { id: string; full_name: string | null }
interface QueryRow { loved_one_id: string | null; question: string }

const ACTIVE_BOOKING = new Set(['confirmed', 'companion_assigned', 'on_the_way', 'in_progress', 'scheduled', 'paid'])

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString()
}
function clip(s: string, n = 64): string {
  return s.length > n ? `${s.slice(0, n).trimEnd()}…` : s
}
function mapBookingStatus(s: string): ConsoleVisitStatus {
  if (s === 'completed') return 'completed'
  if (s === 'in_progress') return 'on-site'
  if (s === 'on_the_way') return 'en-route'
  if (s === 'cancelled') return 'cancelled'
  return 'upcoming'
}

interface Caseload {
  lovedOnes: LovedOneRow[]
  bookings: BookingRow[]
  awaiting: Map<string, boolean>
  guardians: Map<string, string>
  urgent: Map<string, string>
  reported: Set<string> // booking ids with a completed visit report (visits row)
}

async function loadCaseload(): Promise<Caseload> {
  const { data: loData } = await supabase
    .from('loved_ones')
    .select('id, family_user_id, full_name, relationship, age, city, phone_number')
    .order('full_name')
  const lovedOnes = (loData as LovedOneRow[] | null) ?? []
  if (lovedOnes.length === 0) return { lovedOnes: [], bookings: [], awaiting: new Map(), guardians: new Map(), urgent: new Map(), reported: new Set() }
  const ids = lovedOnes.map((l) => l.id)

  const [{ data: bkData }, threads, { data: mqData }] = await Promise.all([
    supabase.from('bookings').select('id, loved_one_id, status, scheduled_at, attention_needed, companion_id').in('loved_one_id', ids),
    fetchAdminThreads().catch(() => []),
    supabase.from('member_queries').select('loved_one_id, question').in('loved_one_id', ids).eq('urgency', 'urgent').eq('status', 'pending').order('created_at', { ascending: false }),
  ])
  const bookings = (bkData as BookingRow[] | null) ?? []
  const awaiting = new Map<string, boolean>()
  threads.forEach((t) => awaiting.set(t.lovedOneId, t.awaitingReply))

  const urgent = new Map<string, string>()
  ;((mqData as QueryRow[] | null) ?? []).forEach((q) => {
    if (q.loved_one_id && !urgent.has(q.loved_one_id)) urgent.set(q.loved_one_id, q.question)
  })

  // Best-effort Guardian names for today's visits (RLS may return none for a PM).
  const compIds = Array.from(new Set(bookings.filter((b) => b.companion_id).map((b) => b.companion_id as string)))
  const guardians = new Map<string, string>()
  if (compIds.length) {
    const { data: cData } = await supabase.from('companions').select('id, full_name').in('id', compIds)
    ;((cData as CompanionRow[] | null) ?? []).forEach((c) => { if (c.full_name) guardians.set(c.id, c.full_name) })
  }
  const bookingIds = bookings.map((b) => b.id)
  const reported = bookingIds.length ? await fetchReportedBookingIds(bookingIds).catch(() => new Set<string>()) : new Set<string>()
  return { lovedOnes, bookings, awaiting, guardians, urgent, reported }
}

function mapFamilies({ lovedOnes, bookings, awaiting, urgent }: Caseload): ConsoleFamilyLive[] {
  const now = Date.now()
  return lovedOnes.map((lo) => {
    const bks = bookings.filter((b) => b.loved_one_id === lo.id)
    const needsVisitAttention = bks.some((b) => b.attention_needed && b.status !== 'cancelled' && b.status !== 'completed')
    const next = bks
      .filter((b) => b.scheduled_at && ACTIVE_BOOKING.has(b.status) && new Date(b.scheduled_at).getTime() >= now)
      .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))[0]
    const awaitingReply = awaiting.get(lo.id) ?? false
    const urgentQuestion = urgent.get(lo.id) ?? null

    const status: CaseStatus = urgentQuestion ? 'red' : needsVisitAttention || awaitingReply ? 'yellow' : 'green'
    const reason = urgentQuestion
      ? 'An urgent health question needs a human answer'
      : needsVisitAttention
        ? 'A visit needs your attention'
        : awaitingReply
          ? 'A family message is waiting for a reply'
          : 'Doing well'

    return {
      lovedOneId: lo.id,
      familyUserId: lo.family_user_id,
      name: lo.full_name,
      relationship: lo.relationship,
      age: lo.age,
      city: lo.city,
      phone: lo.phone_number,
      status,
      reason,
      nextVisitLabel: next?.scheduled_at ? fmtDate(next.scheduled_at) : null,
      awaitingReply,
      needsVisitAttention,
      urgentQuestion,
    }
  })
}

/** Just the caseload — used by the Families directory. */
export async function fetchConsoleFamilies(): Promise<ConsoleFamilyLive[]> {
  return mapFamilies(await loadCaseload())
}

/** Caseload + "Needs you now" triage + Today's Presence — used by the dashboard. */
export async function fetchConsoleOverview(): Promise<ConsoleOverview> {
  const data = await loadCaseload()
  const families = mapFamilies(data)
  const byId = new Map(families.map((f) => [f.lovedOneId, f]))

  // Needs you now — urgent (red) first, then visit attention, then awaiting replies.
  const triage: ConsoleTriageItem[] = []
  families.forEach((f) => {
    if (f.urgentQuestion) triage.push({ id: `u-${f.lovedOneId}`, lovedOneId: f.lovedOneId, memberName: f.name, kind: 'urgent', tone: 'red', tag: 'Urgent', text: `Urgent health question: “${clip(f.urgentQuestion)}”`, href: `/pm/families/${f.lovedOneId}` })
  })
  families.forEach((f) => {
    if (f.needsVisitAttention) triage.push({ id: `v-${f.lovedOneId}`, lovedOneId: f.lovedOneId, memberName: f.name, kind: 'visit', tone: 'amber', tag: 'Needs action', text: 'A recent visit needs your attention.', href: `/pm/families/${f.lovedOneId}` })
  })
  families.forEach((f) => {
    if (f.awaitingReply) triage.push({ id: `m-${f.lovedOneId}`, lovedOneId: f.lovedOneId, memberName: f.name, kind: 'message', tone: 'amber', tag: 'Awaiting reply', text: 'A family message is waiting for your reply.', href: `/pm/families/${f.lovedOneId}` })
  })

  // Today's Presence.
  const schedule: ConsoleScheduleItem[] = data.bookings
    .filter((b) => b.scheduled_at && isToday(b.scheduled_at) && b.status !== 'cancelled')
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
    .map((b) => ({
      id: b.id,
      lovedOneId: b.loved_one_id ?? '',
      memberName: (b.loved_one_id ? byId.get(b.loved_one_id)?.name : null) ?? 'A family member',
      guardianName: (b.companion_id ? data.guardians.get(b.companion_id) : null) ?? null,
      timeLabel: b.scheduled_at ? fmtTime(b.scheduled_at) : '—',
      status: data.reported.has(b.id) ? 'completed' : mapBookingStatus(b.status),
    }))

  return { families, triage, schedule }
}

function deriveTriage(families: ConsoleFamilyLive[]): ConsoleTriageItem[] {
  const triage: ConsoleTriageItem[] = []
  families.forEach((f) => { if (f.urgentQuestion) triage.push({ id: `u-${f.lovedOneId}`, lovedOneId: f.lovedOneId, memberName: f.name, kind: 'urgent', tone: 'red', tag: 'Urgent', text: `Urgent health question: "${clip(f.urgentQuestion)}"`, href: `/pm/families/${f.lovedOneId}` }) })
  families.forEach((f) => { if (f.needsVisitAttention) triage.push({ id: `v-${f.lovedOneId}`, lovedOneId: f.lovedOneId, memberName: f.name, kind: 'visit', tone: 'amber', tag: 'Needs action', text: 'A recent visit needs your attention.', href: `/pm/families/${f.lovedOneId}` }) })
  families.forEach((f) => { if (f.awaitingReply) triage.push({ id: `m-${f.lovedOneId}`, lovedOneId: f.lovedOneId, memberName: f.name, kind: 'message', tone: 'amber', tag: 'Awaiting reply', text: 'A family message is waiting for your reply.', href: `/pm/families/${f.lovedOneId}` }) })
  return triage
}

/** The full "Needs you now" list — used by the Escalations page. */
export async function fetchConsoleEscalations(): Promise<ConsoleTriageItem[]> {
  return deriveTriage(mapFamilies(await loadCaseload()))
}

/** Today's Presence visits (incl. cancelled) — used by the live monitor. */
export async function fetchConsoleVisits(): Promise<ConsoleScheduleItem[]> {
  const data = await loadCaseload()
  const nameById = new Map(mapFamilies(data).map((f) => [f.lovedOneId, f.name]))
  return data.bookings
    .filter((b) => b.scheduled_at && isToday(b.scheduled_at))
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
    .map((b) => ({
      id: b.id,
      lovedOneId: b.loved_one_id ?? '',
      memberName: (b.loved_one_id ? nameById.get(b.loved_one_id) : null) ?? 'A family member',
      guardianName: (b.companion_id ? data.guardians.get(b.companion_id) : null) ?? null,
      timeLabel: b.scheduled_at ? fmtTime(b.scheduled_at) : '—',
      status: data.reported.has(b.id) ? 'completed' : mapBookingStatus(b.status),
    }))
}

export interface ConsoleFamilyDetail {
  meta: AdminThreadRef
  relationship: string | null
  age: number | null
  city: string | null
  phone: string | null
  nextVisitLabel: string | null
  nextBookingId: string | null
  nextGuardianId: string | null
  nextGuardian: string | null
  glance: { label: string; value: string }[]
}

interface DetailBookingRow { id: string; scheduled_at: string | null; status: string; companion_id: string | null }

/** One family's live workspace context — header, next Presence + Guardian, at-a-glance care brief. */
export async function fetchConsoleFamilyDetail(lovedOneId: string): Promise<ConsoleFamilyDetail | null> {
  const meta = await fetchAdminThreadMeta(lovedOneId)
  if (!meta) return null

  const [{ data: loRow }, { data: bkRows }, ep] = await Promise.all([
    supabase.from('loved_ones').select('relationship, age, city, phone_number').eq('id', lovedOneId).maybeSingle(),
    supabase.from('bookings').select('id, scheduled_at, status, companion_id').eq('loved_one_id', lovedOneId),
    fetchElderProfile(lovedOneId).catch(() => null),
  ])
  const lo = loRow as { relationship: string | null; age: number | null; city: string | null; phone_number: string | null } | null
  const bookings = (bkRows as DetailBookingRow[] | null) ?? []

  const now = Date.now()
  const next = bookings
    .filter((b) => b.scheduled_at && ACTIVE_BOOKING.has(b.status) && new Date(b.scheduled_at).getTime() >= now)
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))[0]
  let nextGuardian: string | null = null
  if (next?.companion_id) {
    const { data: c } = await supabase.from('companions').select('full_name').eq('id', next.companion_id).maybeSingle()
    nextGuardian = (c as { full_name: string | null } | null)?.full_name ?? null
  }

  const glance: { label: string; value: string }[] = []
  if (lo?.age) glance.push({ label: 'Age', value: String(lo.age) })
  if (ep) {
    const add = (label: string, v: string | null | undefined) => { if (v && v.trim()) glance.push({ label, value: v.trim() }) }
    add('Conditions', ep.medical_conditions)
    if (ep.current_medications?.length) glance.push({ label: 'Medications', value: ep.current_medications.join(', ') })
    add('Allergies', ep.allergies)
    add('Avoid', ep.things_to_avoid)
  }

  return {
    meta,
    relationship: lo?.relationship ?? null,
    age: lo?.age ?? null,
    city: lo?.city ?? null,
    phone: lo?.phone_number ?? null,
    nextVisitLabel: next?.scheduled_at ? fmtDate(next.scheduled_at) : null,
    nextBookingId: next?.id ?? null,
    nextGuardianId: next?.companion_id ?? null,
    nextGuardian,
    glance,
  }
}

export interface ConsoleCalendarDay {
  key: string
  label: string
  isToday: boolean
  items: ConsoleScheduleItem[]
}

/** Upcoming Presence grouped by day (next `days` days) — the Calendar. */
export async function fetchConsoleCalendar(days = 14): Promise<ConsoleCalendarDay[]> {
  const data = await loadCaseload()
  const nameById = new Map(mapFamilies(data).map((f) => [f.lovedOneId, f.name]))
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const endMs = start.getTime() + days * 86400000
  const todayKey = new Date().toLocaleDateString('en-CA')

  const groups = new Map<string, ConsoleCalendarDay>()
  data.bookings
    .filter((b) => b.scheduled_at && b.status !== 'cancelled')
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
    .forEach((b) => {
      const at = b.scheduled_at
      if (!at) return
      const t = new Date(at).getTime()
      if (t < start.getTime() || t >= endMs) return
      const d = new Date(at)
      const key = d.toLocaleDateString('en-CA')
      const item: ConsoleScheduleItem = {
        id: b.id,
        lovedOneId: b.loved_one_id ?? '',
        memberName: (b.loved_one_id ? nameById.get(b.loved_one_id) : null) ?? 'A family member',
        guardianName: (b.companion_id ? data.guardians.get(b.companion_id) : null) ?? null,
        timeLabel: fmtTime(at),
        status: data.reported.has(b.id) ? 'completed' : mapBookingStatus(b.status),
      }
      const g = groups.get(key)
      if (g) g.items.push(item)
      else groups.set(key, { key, label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), isToday: key === todayKey, items: [item] })
    })
  return Array.from(groups.values())
}

export interface ConsoleReports {
  families: number
  doingWell: number
  needAttention: number
  urgent: number
  awaitingReplies: number
  presenceToday: number
  visitsThisWeek: number
  completedThisWeek: number
}

/** Honest, real service counts — the Reports page (no fabricated percentages). */
export async function fetchConsoleReports(): Promise<ConsoleReports> {
  const data = await loadCaseload()
  const families = mapFamilies(data)
  const ws = new Date()
  ws.setHours(0, 0, 0, 0)
  ws.setDate(ws.getDate() - ws.getDay())
  const weekStart = ws.getTime()
  const weekEnd = weekStart + 7 * 86400000
  const inWeek = (iso: string | null) => {
    if (!iso) return false
    const t = new Date(iso).getTime()
    return t >= weekStart && t < weekEnd
  }
  return {
    families: families.length,
    doingWell: families.filter((f) => f.status === 'green').length,
    needAttention: families.filter((f) => f.status !== 'green').length,
    urgent: families.filter((f) => f.status === 'red').length,
    awaitingReplies: families.filter((f) => f.awaitingReply).length,
    presenceToday: data.bookings.filter((b) => b.status !== 'cancelled' && b.scheduled_at && isToday(b.scheduled_at)).length,
    visitsThisWeek: data.bookings.filter((b) => b.status !== 'cancelled' && inWeek(b.scheduled_at)).length,
    completedThisWeek: data.bookings.filter((b) => data.reported.has(b.id) && inWeek(b.scheduled_at)).length,
  }
}

export interface ConsoleGuardianLive {
  id: string
  name: string
  city: string | null
  phone: string | null
  status: string | null
}
interface CompDirRow { id: string; full_name: string | null; phone: string | null; city: string | null; status: string | null }

/**
 * The Care Team directory. RLS on `companions` is admin/own-only today, so a
 * Super Admin sees the full roster and a Presence Manager sees an empty list
 * (a "companions: manager read" policy would open it to a PM's assigned team).
 */
export async function fetchConsoleGuardians(): Promise<ConsoleGuardianLive[]> {
  const { data } = await supabase.from('companions').select('id, full_name, phone, city, status').order('full_name')
  return ((data as CompDirRow[] | null) ?? []).map((c) => ({ id: c.id, name: c.full_name ?? 'Guardian', city: c.city, phone: c.phone, status: c.status }))
}

/**
 * Assign (or reassign) a Guardian to a booked visit. Super Admins satisfy the
 * bookings UPDATE RLS via is_admin(); Presence Managers via the additive
 * "bookings: manager assign" policy (can_manage_family). Mirrors the proven Vite
 * admin flow: set companion_id and move a still-open visit to companion_assigned.
 * Pass companionId = null to clear the assignment (status is left unchanged).
 */
export async function assignGuardian(bookingId: string, companionId: string | null): Promise<void> {
  const { data: bk } = await supabase.from('bookings').select('status').eq('id', bookingId).maybeSingle()
  const status = (bk as { status: string } | null)?.status ?? 'confirmed'
  const nextStatus = companionId && (status === 'pending' || status === 'confirmed') ? 'companion_assigned' : status
  const { error } = await supabase.from('bookings').update({ companion_id: companionId, status: nextStatus }).eq('id', bookingId)
  if (error) throw error
}
