/**
 * Guardian App — the visit type contract.
 *
 * `GuardianVisit` is the shape the in-visit journey consumes; it is built from
 * REAL data in `lib/db/guardian.ts` (bookings + loved_ones + elder_profiles).
 * `PRESENCE_MANAGER` (re-exported from family-data) is the Close Eye support
 * contact used by the Guardian shell's SOS — the one shared line across modules.
 */
import { PRESENCE_MANAGER } from '@/lib/family-data'

export { PRESENCE_MANAGER }

export type GuardianVisitStatus = 'upcoming' | 'en-route' | 'in-progress' | 'completed'

export interface EmergencyContact {
  name: string
  relation: string
  phone: string
}

export interface GuardianVisit {
  id: string
  familyName: string
  memberName: string
  memberInitials: string
  relationship: string
  age: number
  service: string
  address: string
  area: string
  timeLabel: string
  windowLabel: string
  durationLabel: string
  distanceLabel: string
  driveLabel: string
  status: GuardianVisitStatus
  specialNotes: string
  medicalNotes: string[]
  preferences: string[]
  familyInstructions: string[]
  conversationSuggestions: string[]
  thingsToObserve: string[]
  emergencyContacts: EmergencyContact[]
  previousSummary?: string
  /**
   * B1 — the per-visit logistics the family entered for THIS visit (materialised
   * onto the booking). Optional so legacy visits without them render unchanged.
   */
  visitLogistics?: {
    landmark?: string | null
    contactName?: string | null
    contactPhone?: string | null
    accessInstructions?: string | null
    timeWindow?: string | null
  }
  visitMapLink?: string | null
}

/* The structured visit-report / observation capture lives in `lib/cloza.ts` —
   the CLOza Index foundation (queryable observations, no exposed scores). */
