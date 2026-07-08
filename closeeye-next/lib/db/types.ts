/**
 * Real database row shapes for the signed-in family account. These mirror the
 * production Supabase schema (profiles, loved_ones) and are the source of truth
 * that replaces the lib/family-data.ts mock exports.
 */

export interface Profile {
  id: string
  full_name: string | null
  role: string | null
  phone: string | null
  whatsapp_number: string | null
  address: string | null
}

export interface LovedOne {
  id: string
  family_user_id: string
  full_name: string
  relationship: string | null
  age: number | null
  city: string | null
  address: string | null
  phone_number: string | null
  medical_notes: string | null
  doctor_name: string | null
  nearest_hospital: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  created_at: string | null
}

/** Input for creating a loved one (the Add Loved One flow). */
/** The user's membership subscription (subscriptions table). */
export interface Subscription {
  plan_id: string
  status: string
  current_end: string | null
}

/** A visit the family requested via /book (booking_requests table). */
export interface BookingRequest {
  id: string
  service_name: string | null
  status: string
  scheduled_at: string | null
  recipient_name: string | null
  payment_status: string | null
  created_at: string | null
}

export interface NewLovedOne {
  full_name: string
  relationship: string
  age?: number | null
  city?: string
  phone_number?: string
  address?: string
  medical_notes?: string
  doctor_name?: string
  nearest_hospital?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
}
