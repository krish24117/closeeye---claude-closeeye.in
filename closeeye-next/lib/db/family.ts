import { supabase } from '@/lib/supabase'
import type { LovedOne, NewLovedOne, Profile } from '@/lib/db/types'

const PROFILE_COLS = 'id, full_name, role, phone, whatsapp_number, address'
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
