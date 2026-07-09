import { supabase } from '@/lib/supabase'
import type { BookingRequest, LovedOne, NewLovedOne, Profile } from '@/lib/db/types'

const PROFILE_COLS = 'id, full_name, role, admin_role, phone, whatsapp_number, address'
const LOVED_ONE_COLS =
  'id, family_user_id, full_name, relationship, age, city, address, phone_number, medical_notes, doctor_name, nearest_hospital, emergency_contact_name, emergency_contact_phone, created_at'

const clean = (v?: string | null): string | null => {
  const t = (v ?? '').trim()
  return t.length ? t : null
}
/** Non-null trimmed value — for base loved_ones columns that are NOT NULL. */
const orEmpty = (v?: string | null): string => (v ?? '').trim()

/** The signed-in user's own profile row (RLS lets a user read their own row). */
export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Profile | null) ?? null
}

/**
 * The user's loved ones (RLS: family_user_id = auth.uid()). Empty for a brand
 * new account — the caller renders the empty state + Add Loved One CTA.
 * We select loved_ones columns only (no bookings join) to stay clear of the
 * historical loved_ones↔bookings RLS recursion.
 */
export async function fetchMyLovedOnes(userId: string): Promise<LovedOne[]> {
  const { data, error } = await supabase
    .from('loved_ones')
    .select(LOVED_ONE_COLS)
    .eq('family_user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as LovedOne[] | null) ?? []
}

/** Add a loved one for the signed-in user; returns the created row. */
export async function addLovedOne(userId: string, input: NewLovedOne): Promise<LovedOne> {
  // address + the health text columns are NOT NULL in the base table, but
  // onboarding only collects name/relationship/city — default the rest to ''
  // (satisfies NOT NULL; the UI treats '' as "not provided" and prompts to add).
  const row = {
    family_user_id: userId,
    full_name: input.full_name.trim(),
    relationship: clean(input.relationship),
    age: input.age ?? null,
    city: clean(input.city),
    address: orEmpty(input.address),
    phone_number: clean(input.phone_number),
    medical_notes: orEmpty(input.medical_notes),
    doctor_name: orEmpty(input.doctor_name),
    nearest_hospital: orEmpty(input.nearest_hospital),
    emergency_contact_name: orEmpty(input.emergency_contact_name),
    emergency_contact_phone: orEmpty(input.emergency_contact_phone),
  }
  const { data, error } = await supabase.from('loved_ones').insert(row).select(LOVED_ONE_COLS).single()
  if (error) throw new Error(error.message)
  return data as LovedOne
}

/** Remove a family member (RLS: a family user may delete their own rows). */
export async function deleteLovedOne(id: string): Promise<void> {
  const { error } = await supabase.from('loved_ones').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Update a family member's full profile (RLS: update own). Returns the new row. */
export async function updateFamilyMember(id: string, input: NewLovedOne): Promise<LovedOne> {
  const row = {
    full_name: input.full_name.trim(),
    relationship: clean(input.relationship),
    age: input.age ?? null,
    city: clean(input.city),
    address: orEmpty(input.address),
    phone_number: clean(input.phone_number),
    medical_notes: orEmpty(input.medical_notes),
    doctor_name: orEmpty(input.doctor_name),
    nearest_hospital: orEmpty(input.nearest_hospital),
    emergency_contact_name: orEmpty(input.emergency_contact_name),
    emergency_contact_phone: orEmpty(input.emergency_contact_phone),
  }
  const { data, error } = await supabase.from('loved_ones').update(row).eq('id', id).select(LOVED_ONE_COLS).single()
  if (error) throw new Error(error.message)
  return data as LovedOne
}

const BOOKING_REQUEST_COLS = 'id, service_name, status, scheduled_at, recipient_name, payment_status, amount_paise, booking_id, created_at'

/**
 * The signed-in family user's own visit requests. We filter explicitly by
 * user_id — the booking_requests RLS also grants ADMINS a global read, so
 * relying on RLS alone would show an admin every family's requests here.
 */
export async function fetchMyBookingRequests(userId: string): Promise<BookingRequest[]> {
  const { data, error } = await supabase
    .from('booking_requests')
    .select(BOOKING_REQUEST_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as BookingRequest[] | null) ?? []
}

/** The Guardian's completed-visit report for a materialised booking, if any. */
export interface VisitReport {
  id: string
  summary: string | null
  mood: number | null
  photoPaths: string[]
  createdAt: string | null
}

export async function fetchVisitReport(bookingId: string): Promise<VisitReport | null> {
  const { data, error } = await supabase
    .from('visits')
    .select('id, one_moment, report_text, mood_score, photo_urls, created_at')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const v = data as {
    id: string; one_moment: string | null; report_text: string | null
    mood_score: number | null; photo_urls: string[] | null; created_at: string | null
  }
  return {
    id: v.id,
    summary: v.one_moment || v.report_text || null,
    mood: v.mood_score,
    photoPaths: v.photo_urls ?? [],
    createdAt: v.created_at,
  }
}

/** A short-lived signed URL for a private visit photo (null on failure). */
export async function signedVisitPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('visit-photos').createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
