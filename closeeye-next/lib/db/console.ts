import { supabase } from '@/lib/supabase'
import { fetchAdminThreads } from '@/lib/db/messages'

/**
 * Presence Console — the REAL caseload for the signed-in staff member.
 *
 * RLS does the scoping: a Super Admin sees every family; a Presence Manager sees
 * only the families in `family_assignments`. We read the tables a PM can already
 * reach today (loved_ones, bookings, messages) — no new policies needed — and
 * derive a warm "relationship & service health" status. Emergencies (red) come
 * later, once member_queries/visits gain a manager-read policy.
 */

export type CaseStatus = 'green' | 'yellow'

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
  loved_one_id: string | null
  status: string
  scheduled_at: string | null
  attention_needed: boolean | null
}

// Bookings that represent a live, upcoming Presence (not done, not cancelled).
const ACTIVE_BOOKING = new Set(['confirmed', 'companion_assigned', 'on_the_way', 'in_progress', 'scheduled', 'paid'])

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * Every family in the signed-in staff member's care, most-in-need first is left
 * to the caller. Three RLS-scoped reads: loved_ones + their bookings + the
 * message threads (for "awaiting reply").
 */
export async function fetchConsoleFamilies(): Promise<ConsoleFamilyLive[]> {
  const { data: loData } = await supabase
    .from('loved_ones')
    .select('id, family_user_id, full_name, relationship, age, city, phone_number')
    .order('full_name')
  const lovedOnes = (loData as LovedOneRow[] | null) ?? []
  if (lovedOnes.length === 0) return []
  const ids = lovedOnes.map((l) => l.id)

  const [{ data: bkData }, threads] = await Promise.all([
    supabase.from('bookings').select('loved_one_id, status, scheduled_at, attention_needed').in('loved_one_id', ids),
    fetchAdminThreads().catch(() => []),
  ])
  const bookings = (bkData as BookingRow[] | null) ?? []
  const awaitingByLoved = new Map<string, boolean>()
  threads.forEach((t) => awaitingByLoved.set(t.lovedOneId, t.awaitingReply))

  const now = Date.now()
  return lovedOnes.map((lo) => {
    const bks = bookings.filter((b) => b.loved_one_id === lo.id)
    const attention = bks.some((b) => b.attention_needed && b.status !== 'cancelled' && b.status !== 'completed')
    const next = bks
      .filter((b) => b.scheduled_at && ACTIVE_BOOKING.has(b.status) && new Date(b.scheduled_at).getTime() >= now)
      .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))[0]
    const awaiting = awaitingByLoved.get(lo.id) ?? false

    const reason = attention
      ? 'A visit needs your attention'
      : awaiting
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
      status: attention || awaiting ? 'yellow' : 'green',
      reason,
      nextVisitLabel: next?.scheduled_at ? fmtDate(next.scheduled_at) : null,
      awaitingReply: awaiting,
    }
  })
}
