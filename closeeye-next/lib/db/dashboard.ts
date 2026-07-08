import { fetchMyBookingRequests } from '@/lib/db/family'
import { fetchThreadSummaries } from '@/lib/db/messages'
import type { BookingRequest, LovedOne, Subscription } from '@/lib/db/types'

/**
 * The four Home Dashboard lifecycle states. Exactly one applies to a user at any
 * time; the dashboard evolves automatically as they progress.
 */
export type DashboardState = 'new' | 'family_added' | 'visit_booked' | 'active'

export interface DashboardData {
  state: DashboardState
  familyCount: number
  membershipActive: boolean
  visitCount: number
  upcomingVisits: BookingRequest[]
  upcomingVisit: BookingRequest | null
  hasCompletedVisit: boolean
  completedVisits: BookingRequest[]
  unreadMessages: number
  /** First family member with an incomplete health profile, if any (State 2 step 3). */
  healthIncompleteMember: LovedOne | null
}

/**
 * The two lightweight reads the dashboard needs beyond what FamilyDataProvider
 * already holds (profile/lovedOnes/subscription): the user's visits and their
 * unread message count. Reuses existing fetchers — no duplicated queries.
 */
export async function fetchDashboardSignals(
  userId: string,
): Promise<{ visits: BookingRequest[]; unreadMessages: number }> {
  const [visits, summaries] = await Promise.all([fetchMyBookingRequests(userId), fetchThreadSummaries(userId)])
  let unreadMessages = 0
  summaries.forEach((s) => {
    unreadMessages += s.unread
  })
  return { visits, unreadMessages }
}

// A visit counts as "completed" once its scheduled time has passed and it had
// progressed to a confirmed/paid state (booking_requests has no 'completed'
// status — this derives it from existing data, no new schema).
const COMPLETED_STATUSES = ['confirmed', 'scheduled', 'companion_confirmed', 'paid']

// Same definition of a complete health profile the family card uses.
function healthComplete(lo: LovedOne): boolean {
  return Boolean(lo.medical_notes?.trim() && lo.phone_number?.trim() && lo.emergency_contact_name?.trim())
}

/**
 * Pure lifecycle derivation from already-loaded data — the single source of
 * truth for which dashboard a user sees. No queries here; callers pass what the
 * provider + fetchDashboardSignals already loaded.
 */
export function deriveDashboard(input: {
  lovedOnes: LovedOne[]
  subscription: Subscription | null
  visits: BookingRequest[]
  unreadMessages: number
  now?: number
}): DashboardData {
  const now = input.now ?? Date.now()
  const familyCount = input.lovedOnes.length
  const membershipActive = input.subscription?.status === 'active'

  const live = input.visits.filter((v) => v.status !== 'cancelled')
  const isCompleted = (v: BookingRequest) =>
    !!v.scheduled_at && new Date(v.scheduled_at).getTime() < now && COMPLETED_STATUSES.includes(v.status)
  const completedVisits = live.filter(isCompleted)
  const upcomingVisits = live
    .filter((v) => !isCompleted(v))
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
  const hasVisit = live.length > 0
  const hasCompletedVisit = completedVisits.length > 0

  let state: DashboardState
  if (familyCount === 0) state = 'new'
  else if (hasVisit && membershipActive && hasCompletedVisit) state = 'active'
  else if (hasVisit) state = 'visit_booked'
  else state = 'family_added'

  return {
    state,
    familyCount,
    membershipActive,
    visitCount: live.length,
    upcomingVisits,
    upcomingVisit: upcomingVisits[0] ?? null,
    hasCompletedVisit,
    completedVisits,
    unreadMessages: input.unreadMessages,
    healthIncompleteMember: input.lovedOnes.find((lo) => !healthComplete(lo)) ?? null,
  }
}
