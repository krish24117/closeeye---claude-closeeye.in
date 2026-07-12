import { supabase } from '@/lib/supabase'
import type { BookingRequest, LovedOne, NewLovedOne, Profile } from '@/lib/db/types'
import { reportKey, type Pronoun, type ReportPhoto, type SharedVisitReport } from '@/lib/visit-reports'
import { processVisit, type VisitObservations } from '@/lib/cloza'

const PROFILE_COLS_BASE = 'id, full_name, role, admin_role, phone, whatsapp_number, address'
const PROFILE_COLS = `${PROFILE_COLS_BASE}, founder_prelaunch`
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
  if (!error) return (data as Profile | null) ?? null
  // Resilience: in the brief window before the founder_prelaunch migration lands
  // in prod, selecting that column errors. Fall back to the base columns so the
  // family app never breaks — founder gating simply stays off until the column
  // exists (it only affects pre-launch payment/booking, so this is safe).
  const base = await supabase.from('profiles').select(PROFILE_COLS_BASE).eq('id', userId).maybeSingle()
  if (base.error) throw new Error(base.error.message)
  return (base.data as Profile | null) ?? null
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

const BOOKING_REQUEST_COLS = 'id, service_name, status, scheduled_at, recipient_name, recipient_address, requester_whatsapp, notes, visit_landmark, visit_contact_name, visit_contact_phone, visit_time_window, visit_special_instructions, visit_access_instructions, visit_team_notes, visit_map_link, payment_status, amount_paise, booking_id, created_at'

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

/** Which of these bookings have a completed visit report (for Visit History). */
export async function fetchReportedBookingIds(bookingIds: string[]): Promise<Set<string>> {
  const ids = bookingIds.filter(Boolean)
  if (!ids.length) return new Set()
  const { data, error } = await supabase.from('visits').select('booking_id').in('booking_id', ids)
  if (error) return new Set()
  return new Set(((data ?? []) as { booking_id: string | null }[]).map((r) => r.booking_id).filter(Boolean) as string[])
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

/* ── The complete Family Visit Report (Human Presence Experience) ─────────── */

/** Everything the approved report UI needs, mapped from the real `visits` row. */
export interface FullVisitReport {
  report: SharedVisitReport
  stats: { arrival: string; departure: string; durationLabel: string }
  recommendations: string[]
  followUps: string[]
  /** Signed URL for the branded PDF uploaded at completion (the one WhatsApp used). */
  pdfUrl?: string
  /** Delivery outcome recorded at completion — for the report's status + tracing. */
  delivery?: { emailOk: boolean; emailReason?: string; whatsappOk: boolean }
}

const NUM_TO_MOOD: Record<number, string> = { 5: 'Cheerful', 4: 'Good', 3: 'Calm', 2: 'Low', 1: 'Low' }
const asNum = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined)
const toMs = (iso: string | null): number | undefined => {
  if (!iso) return undefined
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : undefined
}
function clockLabel(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return '—'
  }
}
function durationLabel(sec: number): string {
  if (!sec || sec < 1) return '—'
  const min = Math.max(1, Math.round(sec / 60))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/**
 * Build the full report from the completed `visits` row: the structured CLOza
 * record in checklist_data + one_moment/photo_urls/mood, resolving photos and the
 * voice note to signed URLs. Deterministic recommendations/follow-ups are derived
 * from the stored observations. Returns null if no visit report exists yet.
 */
export async function fetchFullVisitReport(
  bookingId: string,
  fallback: { memberName: string; service: string },
): Promise<FullVisitReport | null> {
  const { data, error } = await supabase
    .from('visits')
    .select('id, one_moment, report_text, mood_score, photo_urls, created_at, start_time, end_time, checklist_data')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const v = data as {
    id: string; one_moment: string | null; report_text: string | null; mood_score: number | null
    photo_urls: string[] | null; created_at: string | null; start_time: string | null; end_time: string | null
    checklist_data: Record<string, unknown> | null
  }
  const cd = (v.checklist_data ?? {}) as Record<string, unknown>

  // Photos → signed URLs (the approved gallery renders <img src=…> directly).
  const paths: string[] = Array.isArray(v.photo_urls) ? v.photo_urls : []
  const photos: ReportPhoto[] = []
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('visit-photos').createSignedUrls(paths, 3600)
    ;(signed ?? []).forEach((s, i) => {
      if (s.signedUrl) photos.push({ id: `ph-${i}`, thumb: s.signedUrl })
    })
  }

  // Voice note → signed URL from the visit-audio bucket.
  let voice: SharedVisitReport['voice'] = null
  const vp = cd.voice as { path?: string; durationSec?: number } | null | undefined
  if (vp?.path) {
    const { data: sv } = await supabase.storage.from('visit-audio').createSignedUrl(vp.path, 3600)
    if (sv?.signedUrl) voice = { dataUrl: sv.signedUrl, durationSec: vp.durationSec ?? 0 }
  }

  const completedAt = asNum(cd.completedAt) ?? toMs(v.end_time) ?? toMs(v.created_at) ?? Date.now()
  const checkinAt = asNum(cd.checkinAt) ?? toMs(v.start_time) ?? completedAt
  const startedAt = asNum(cd.startedAt) ?? checkinAt
  const durationSec = asNum(cd.durationSec) ?? Math.max(1, Math.round((completedAt - startedAt) / 1000))

  const scales = (cd.scales ?? {}) as Record<string, string>
  const moments = (cd.moments ?? []) as string[]
  const social = (cd.social ?? []) as string[]
  const vitals = (cd.vitals ?? {}) as SharedVisitReport['vitals']
  const note = (typeof cd.note === 'string' && cd.note) || undefined
  const win = (typeof cd.win === 'string' && cd.win) || undefined

  const report: SharedVisitReport = {
    key: reportKey(fallback.memberName),
    memberName: fallback.memberName,
    guardianName: (cd.guardianName as string) || 'Your Guardian',
    service: (cd.service as string) || fallback.service,
    pronoun: (cd.pronoun as Pronoun) || 'they',
    summary: v.one_moment || v.report_text || '',
    story: (cd.story as string) || v.one_moment || v.report_text || '',
    mood: (cd.moodLabel as string) || (v.mood_score ? NUM_TO_MOOD[v.mood_score] : undefined),
    wellnessScore: asNum(cd.wellnessScore) ?? -1,
    scales,
    moments,
    social,
    vitals,
    note,
    win,
    photos,
    voice,
    startedAt,
    checkinAt,
    completedAt,
    durationSec,
  }

  // Recommendations + follow-ups — deterministic, from the stored observations.
  const obs: VisitObservations = {
    scales,
    moments,
    social,
    concern: (typeof cd.concern === 'string' && cd.concern) || undefined,
    note,
    win,
    photos: photos.map((p) => ({ id: p.id, name: '', thumb: p.thumb, size: 0, status: 'done' as const, progress: 100 })),
    voiceNote: voice ? { id: 'v', dataUrl: voice.dataUrl, durationSec: voice.durationSec, size: 0, status: 'done' as const, progress: 100 } : null,
  }
  const intel = processVisit(obs, fallback.memberName)

  // The branded PDF uploaded at completion (served instead of client-side regen)
  // + the recorded delivery outcome (for the report status + tracing).
  type Diag = {
    resendStatus?: number
    resendBody?: { message?: string; name?: string } | string
    from?: string
    to?: string
    domains?: Array<{ name: string; status: string }>
    missingEnv?: string[]
  }
  type DeliveryEmail = {
    success?: boolean; skipped?: boolean; reason?: string; error?: string
    diagnostics?: Diag
    response?: { diagnostics?: Diag; error?: string } | string
  }
  const rawDelivery = (cd.delivery ?? null) as {
    email?: DeliveryEmail | null
    whatsapp?: { success?: boolean } | null
    pdfPath?: string
  } | null

  let pdfUrl: string | undefined
  if (rawDelivery?.pdfPath) {
    const { data: s } = await supabase.storage.from('visit-pdfs').createSignedUrl(rawDelivery.pdfPath, 3600)
    pdfUrl = s?.signedUrl ?? undefined
  }

  let delivery: FullVisitReport['delivery']
  if (rawDelivery) {
    const e = rawDelivery.email
    const emailOk = e?.success === true
    const diag: Diag | undefined = e?.diagnostics ?? (e && typeof e.response === 'object' ? e.response?.diagnostics : undefined)
    let emailReason: string | undefined
    if (!emailOk) {
      const parts: string[] = []
      if (diag?.resendStatus) parts.push(`Resend HTTP ${diag.resendStatus}`)
      const body = diag?.resendBody
      if (body && typeof body === 'object' && body.message) parts.push(body.message)
      else if (typeof body === 'string' && body) parts.push(body.slice(0, 160))
      if (diag?.from) parts.push(`from ${diag.from}`)
      if (diag?.to) parts.push(`to ${diag.to}`)
      if (diag?.domains?.length) parts.push(`domains ${diag.domains.map((d) => `${d.name}:${d.status}`).join(', ')}`)
      if (diag?.missingEnv?.length) parts.push(`missing env ${diag.missingEnv.join(',')}`)
      if (e?.reason) parts.push(e.reason)
      if (!parts.length) parts.push(e?.error || 'unknown')
      emailReason = parts.join(' · ')
    }
    delivery = { emailOk, emailReason, whatsappOk: rawDelivery.whatsapp?.success === true }
  }

  // Prefer the ONE canonical report's derived content; re-derive only for legacy
  // visits written before the canonical existed.
  const canon = (cd.report ?? null) as { recommendations?: string[]; followUps?: string[] } | null

  return {
    report,
    stats: { arrival: clockLabel(checkinAt), departure: clockLabel(completedAt), durationLabel: durationLabel(durationSec) },
    recommendations: canon?.recommendations ?? intel.recommendations,
    followUps: canon?.followUps ?? intel.followUps,
    pdfUrl,
    delivery,
  }
}

/* ── Health Profile (elder_profiles) — the family-owned care brief ─────────── */

export interface ElderProfileForm {
  food_preferences: string
  conversation_interests: string
  daily_routine: string
  things_to_avoid: string
  medical_conditions: string
  allergies: string
  /** One medication per line in the UI; stored as a jsonb string[]. */
  current_medications: string[]
  doctor_name: string
  doctor_phone: string
  /** The language they're most comfortable in (Family Intelligence + Memory). */
  language: string
  /** Free text — birthdays, anniversaries, festivals they cherish (Family Memory). */
  important_dates: string
  pinned_note: string
  /** Allow the Guardian to share visit photos with the family on WhatsApp. */
  photo_consent: boolean
}

const EMPTY_ELDER: ElderProfileForm = {
  food_preferences: '', conversation_interests: '', daily_routine: '', things_to_avoid: '',
  medical_conditions: '', allergies: '', current_medications: [], doctor_name: '', doctor_phone: '',
  language: '', important_dates: '', pinned_note: '', photo_consent: false,
}

/** The Health Profile for a loved one (RLS: family read own). Empty form if none. */
export async function fetchElderProfile(lovedOneId: string): Promise<ElderProfileForm> {
  const { data, error } = await supabase
    .from('elder_profiles')
    .select('food_preferences, conversation_interests, daily_routine, things_to_avoid, medical_conditions, allergies, current_medications, doctor_name, doctor_phone, language, important_dates, pinned_note, photo_consent')
    .eq('loved_one_id', lovedOneId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return { ...EMPTY_ELDER }
  const d = data as Record<string, unknown>
  return {
    food_preferences: (d.food_preferences as string) ?? '',
    conversation_interests: (d.conversation_interests as string) ?? '',
    daily_routine: (d.daily_routine as string) ?? '',
    things_to_avoid: (d.things_to_avoid as string) ?? '',
    medical_conditions: (d.medical_conditions as string) ?? '',
    allergies: (d.allergies as string) ?? '',
    current_medications: Array.isArray(d.current_medications) ? (d.current_medications as unknown[]).map(String) : [],
    doctor_name: (d.doctor_name as string) ?? '',
    doctor_phone: (d.doctor_phone as string) ?? '',
    language: (d.language as string) ?? '',
    important_dates: (d.important_dates as string) ?? '',
    pinned_note: (d.pinned_note as string) ?? '',
    photo_consent: Boolean(d.photo_consent),
  }
}

/**
 * Create or update the Health Profile (RLS: family insert/update own). name + age
 * mirror the loved one so downstream (the Guardian brief, WhatsApp) has them.
 * emergency_contacts is intentionally omitted so an existing value is preserved.
 */
export async function upsertElderProfile(
  lovedOneId: string,
  input: ElderProfileForm,
  meta: { name: string; age: number | null },
): Promise<void> {
  const t = (s: string) => (s.trim() ? s.trim() : null)
  const row = {
    loved_one_id: lovedOneId,
    name: meta.name,
    age: meta.age,
    food_preferences: t(input.food_preferences),
    conversation_interests: t(input.conversation_interests),
    daily_routine: t(input.daily_routine),
    things_to_avoid: t(input.things_to_avoid),
    medical_conditions: t(input.medical_conditions),
    allergies: t(input.allergies),
    current_medications: input.current_medications.map((m) => m.trim()).filter(Boolean),
    doctor_name: t(input.doctor_name),
    doctor_phone: t(input.doctor_phone),
    language: t(input.language),
    important_dates: t(input.important_dates),
    pinned_note: t(input.pinned_note),
    photo_consent: input.photo_consent,
  }
  const { error } = await supabase.from('elder_profiles').upsert(row, { onConflict: 'loved_one_id' })
  if (error) throw new Error(error.message)
}
