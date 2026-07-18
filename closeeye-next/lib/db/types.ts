/**
 * Real database row shapes for the signed-in family account. These mirror the
 * production Supabase schema (profiles, loved_ones) and are the source of truth
 * that replaces the lib/family-data.ts mock exports.
 */

export interface Profile {
  id: string
  full_name: string | null
  role: string | null
  /** Staff sub-role: super_admin | presence_manager | companion | doctor (null = not staff). */
  admin_role: string | null
  phone: string | null
  whatsapp_number: string | null
  address: string | null
  /** True = registered via the Founder Program before launch. Durable authority
   *  for the pre-launch funnel gate (see lib/founder-funnel + lib/launch). */
  founder_prelaunch?: boolean | null
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
  /** Region code (lib/platform/regions) — where this loved one is. Drives their emergency
   *  number and Care availability. Absent/null = India ('IN'), the column default. */
  region_code?: string | null
}

/** Input for creating a loved one (the Add Loved One flow). */
/** The user's membership subscription (subscriptions table). */
export interface Subscription {
  plan_id: string
  status: string
  current_end: string | null
  next_billing_at: string | null
  total_paid_paise: number | null
  invoice_count: number | null
}

/** A one-time membership receipt (memberships table — founding ₹100). */
export interface MembershipReceipt {
  id: string
  amount_paise: number | null
  status: string
  razorpay_payment_id: string | null
  activated_at: string | null
  created_at: string | null
}

/** A visit the family requested via /book (booking_requests table). */
export interface BookingRequest {
  id: string
  service_name: string | null
  status: string
  scheduled_at: string | null
  recipient_name: string | null
  /** Visit-specific logistics captured at booking time (stored with the booking). */
  recipient_address: string | null
  requester_whatsapp: string | null
  notes: string | null
  visit_landmark: string | null
  visit_contact_name: string | null
  visit_contact_phone: string | null
  visit_time_window: string | null
  visit_special_instructions: string | null
  visit_access_instructions: string | null
  visit_team_notes: string | null
  visit_map_link: string | null
  payment_status: string | null
  amount_paise: number | null
  /** The materialised `bookings` row (set once paid) — the Guardian's visit. */
  booking_id: string | null
  created_at: string | null
}

/** A single message in a family member's care thread (messages table). */
export interface Message {
  id: string
  loved_one_id: string
  family_user_id: string
  sender: 'family' | 'closeeye' | 'system'
  body: string | null
  attachment_url: string | null // storage PATH within the private message-attachments bucket
  attachment_type: 'image' | 'pdf' | 'audio' | null
  related_booking_id: string | null
  read_at: string | null
  created_at: string
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
