import { supabase } from '@/lib/supabase'

/** A companion's assigned visit, from the real `bookings` table. */
export interface GuardianVisit {
  id: string
  lovedOneId: string | null
  memberName: string
  service: string
  address: string
  scheduledAt: string | null
  status: string
}

const SERVICE_LABEL: Record<string, string> = {
  companion_visit_single: 'Home Wellbeing Visit',
  home_visit: 'Home Wellbeing Visit',
  doctor_visit_support: 'Doctor Visit Support',
  hospital_assistance: 'Hospital Companion',
  hospital_assistance_half_day: 'Hospital Companion',
  hospital_assistance_full_day: 'Hospital Companion',
  grocery_medicine: 'Grocery & Medicine',
  emergency_response: 'Emergency Response',
}

/** Human label for a bookings.service_type. */
export function serviceLabel(s: string | null | undefined): string {
  if (!s) return 'Visit'
  return SERVICE_LABEL[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface BookingRow {
  id: string
  service_type: string | null
  scheduled_at: string | null
  status: string
  loved_one_id: string | null
}

/**
 * The signed-in companion's active assigned visits, soonest first. Reads
 * `bookings` (RLS: companion_id = current_companion_id()); resolves member
 * names from loved_ones in one batched query. Completed/cancelled are excluded.
 */
export async function fetchGuardianVisits(companionId: string): Promise<GuardianVisit[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, service_type, scheduled_at, status, loved_one_id')
    .eq('companion_id', companionId)
    .not('status', 'in', '(completed,cancelled)')
    .order('scheduled_at', { ascending: true })
  if (error) throw new Error(error.message)
  const rows = (data as BookingRow[] | null) ?? []
  if (rows.length === 0) return []

  const ids = [...new Set(rows.map((r) => r.loved_one_id).filter(Boolean))] as string[]
  const info = new Map<string, { name: string; address: string }>()
  if (ids.length) {
    const { data: los } = await supabase.from('loved_ones').select('id, full_name, address, city').in('id', ids)
    ;((los ?? []) as { id: string; full_name: string; address: string | null; city: string | null }[]).forEach((l) =>
      info.set(l.id, { name: l.full_name, address: l.address?.trim() || l.city?.trim() || '' }),
    )
  }

  return rows.map((r) => {
    const meta = r.loved_one_id ? info.get(r.loved_one_id) : undefined
    return {
      id: r.id,
      lovedOneId: r.loved_one_id,
      memberName: meta?.name ?? 'Family member',
      service: serviceLabel(r.service_type),
      address: meta?.address ?? '',
      scheduledAt: r.scheduled_at,
      status: r.status,
    }
  })
}

/** A single assigned visit + the elder's care brief, for the visit detail. */
export interface GuardianVisitBrief extends GuardianVisit {
  medicalNotes: string
  emergencyContactName: string
  emergencyContactPhone: string
}

export async function fetchGuardianVisit(companionId: string, bookingId: string): Promise<GuardianVisitBrief | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, service_type, scheduled_at, status, loved_one_id')
    .eq('id', bookingId)
    .eq('companion_id', companionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const b = data as BookingRow | null
  if (!b) return null

  let name = 'Family member'
  let address = ''
  let medicalNotes = ''
  let emergencyContactName = ''
  let emergencyContactPhone = ''
  if (b.loved_one_id) {
    const { data: lo } = await supabase
      .from('loved_ones')
      .select('full_name, address, city, medical_notes, emergency_contact_name, emergency_contact_phone')
      .eq('id', b.loved_one_id)
      .maybeSingle()
    const l = lo as {
      full_name: string; address: string | null; city: string | null; medical_notes: string | null
      emergency_contact_name: string | null; emergency_contact_phone: string | null
    } | null
    if (l) {
      name = l.full_name
      address = l.address?.trim() || l.city?.trim() || ''
      medicalNotes = l.medical_notes?.trim() || ''
      emergencyContactName = l.emergency_contact_name?.trim() || ''
      emergencyContactPhone = l.emergency_contact_phone?.trim() || ''
    }
  }

  return {
    id: b.id,
    lovedOneId: b.loved_one_id,
    memberName: name,
    service: serviceLabel(b.service_type),
    address,
    scheduledAt: b.scheduled_at,
    status: b.status,
    medicalNotes,
    emergencyContactName,
    emergencyContactPhone,
  }
}

export interface GeoCoords { lat: number; lng: number }

/** Best-effort device location — resolves null if unavailable or denied. */
export function getVisitLocation(): Promise<GeoCoords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60_000 },
    )
  })
}

/** Check in — start the visit (bookings RLS: a companion may update their own booking). */
export async function checkInVisit(bookingId: string, coords?: GeoCoords | null): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'in_progress',
      checked_in_at: new Date().toISOString(),
      ...(coords ? { check_in_lat: coords.lat, check_in_lng: coords.lng } : {}),
    })
    .eq('id', bookingId)
  if (error) throw new Error(error.message)
}

/**
 * Upload a visit photo to the private visit-photos bucket at `<bookingId>/<name>`
 * (the path convention the storage RLS keys on). Returns the storage path.
 */
export async function uploadVisitPhoto(bookingId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${bookingId}/visit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
  const { error } = await supabase.storage
    .from('visit-photos')
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
  if (error) throw new Error(error.message)
  return path
}

export interface VisitReport {
  companionId: string
  summary?: string
  mood?: number | null // 1–5
  photoPaths?: string[]
  coords?: GeoCoords | null
}

/**
 * Complete the visit: write a structured `visits` report row (mirrors the Vite
 * companion insert) + mark the booking completed. completed_at is stamped by
 * the bookings trigger. visits RLS: a companion inserts where companion_id = auth.uid.
 */
export async function completeVisit(bookingId: string, report: VisitReport): Promise<void> {
  const now = new Date().toISOString()
  const summary = report.summary?.trim() || null

  const { error: visErr } = await supabase.from('visits').insert({
    booking_id: bookingId,
    elder_id: null,
    companion_id: report.companionId,
    start_time: now,
    end_time: now,
    tier_completed: 1,
    checklist_data: {},
    flags: 'none',
    one_moment: summary,
    photo_urls: report.photoPaths ?? [],
    mood_score: report.mood ?? null,
    report_text: summary,
  })
  if (visErr) throw new Error(visErr.message)

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'completed',
      checked_out_at: now,
      ...(report.coords ? { check_out_lat: report.coords.lat, check_out_lng: report.coords.lng } : {}),
    })
    .eq('id', bookingId)
  if (error) throw new Error(error.message)
}
