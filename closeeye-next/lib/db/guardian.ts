import { supabase } from '@/lib/supabase'
import type { EmergencyContact, GuardianVisit as RichVisit, GuardianVisitStatus } from '@/lib/guardian-data'
import { buildVisitPdf, reportToPdfInput } from '@/lib/visit-pdf'
import { buildStory, moodLabel, pronounFor, wellnessScore } from '@/lib/family-report'
import { processVisit, type VisitObservations } from '@/lib/cloza'
import { reportKey, type ReportVitals, type SharedVisitReport } from '@/lib/visit-reports'
import type { CanonicalReport } from '@/lib/visit-report-canonical'

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

/** The signed-in Guardian's real profile + lifetime stats (Profile tab + shell). */
export interface GuardianProfile {
  fullName: string
  phone: string
  city: string
  status: string
  visitsCompleted: number
}

export async function fetchGuardianProfile(companionId: string): Promise<GuardianProfile> {
  const { data } = await supabase
    .from('companions')
    .select('full_name, phone, city, status')
    .eq('id', companionId)
    .maybeSingle()
  const c = data as { full_name: string | null; phone: string | null; city: string | null; status: string | null } | null

  const { count } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('companion_id', companionId)
    .eq('status', 'completed')

  return {
    fullName: c?.full_name?.trim() || 'Guardian',
    phone: c?.phone?.trim() || '',
    city: c?.city?.trim() || '',
    status: c?.status?.trim() || 'approved',
    visitsCompleted: count ?? 0,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * The rich in-visit journey. It consumes the full `GuardianVisit` shape from
 * @/lib/guardian-data; we populate that shape from REAL data — the booking, the
 * loved_one, the (optional) elder_profile care brief, and the last visit.
 * Fields with no real source stay empty (never fabricated).
 * ────────────────────────────────────────────────────────────────────────── */

const RICH_STATUS: Record<string, GuardianVisitStatus> = {
  completed: 'completed',
  in_progress: 'in-progress',
  on_the_way: 'en-route',
}

/** Split a free-text brief field into clean lines (empty → []). */
function toLines(...texts: (string | null | undefined)[]): string[] {
  return texts
    .flatMap((t) => (t ? t.split(/\r?\n|·|;|•|•/) : []))
    .map((s) => s.trim())
    .filter(Boolean)
}

function medsToLines(meds: unknown): string[] {
  if (!Array.isArray(meds)) return []
  return meds
    .map((m) => {
      if (typeof m === 'string') return m.trim()
      if (m && typeof m === 'object') {
        const o = m as Record<string, unknown>
        const name = String(o.name ?? o.medication ?? '').trim()
        const dose = String(o.dose ?? o.dosage ?? o.schedule ?? '').trim()
        return [name, dose].filter(Boolean).join(' · ')
      }
      return ''
    })
    .filter(Boolean)
}

function contactsFromJson(raw: unknown): EmergencyContact[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>
      const name = String(o.name ?? '').trim()
      const phone = String(o.phone ?? o.number ?? '').trim()
      const relation = String(o.relation ?? o.relationship ?? '').trim()
      return { name: name || 'Contact', relation, phone }
    })
    .filter((c) => c.phone || c.name !== 'Contact')
}

function timeLabelOf(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch {
    return ''
  }
}

function windowLabelOf(iso: string | null): string {
  if (!iso) return ''
  const h = new Date(iso).getHours()
  return h < 12 ? 'Morning' : h < 16 ? 'Afternoon' : h < 20 ? 'Evening' : 'Night'
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '··'
  return ((parts[0]![0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '')).toUpperCase()
}

interface LovedOneBrief {
  full_name: string
  relationship: string | null
  age: number | null
  address: string | null
  city: string | null
  medical_notes: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  doctor_name: string | null
  nearest_hospital: string | null
}

interface ElderRow {
  id: string
  medical_conditions: string | null
  current_medications: unknown
  allergies: string | null
  doctor_name: string | null
  doctor_phone: string | null
  emergency_contacts: unknown
  food_preferences: string | null
  conversation_interests: string | null
  things_to_avoid: string | null
  daily_routine: string | null
  continuity_notes: string | null
  pinned_note: string | null
}

export interface GuardianVisitFull {
  visit: RichVisit
  elderProfileId: string | null
  /** Raw scheduled time (ISO) — the rich shape only carries a short time label. */
  scheduledAt: string | null
}

/**
 * Load one assigned visit as the rich journey shape, from real data. Reads the
 * booking (RLS: companion_id), the loved_one, the optional elder_profiles brief,
 * and the guardian's own most-recent visit for this elder (for "last time").
 */
export async function fetchGuardianVisitFull(companionId: string, bookingId: string): Promise<GuardianVisitFull | null> {
  const { data: bk } = await supabase
    .from('bookings')
    .select('id, service_type, scheduled_at, status, loved_one_id, special_instructions')
    .eq('id', bookingId)
    .eq('companion_id', companionId)
    .maybeSingle()
  const b = bk as (BookingRow & { special_instructions: string | null }) | null
  if (!b) return null

  let lo: LovedOneBrief | null = null
  if (b.loved_one_id) {
    const { data } = await supabase
      .from('loved_ones')
      .select('full_name, relationship, age, address, city, medical_notes, emergency_contact_name, emergency_contact_phone, doctor_name, nearest_hospital')
      .eq('id', b.loved_one_id)
      .maybeSingle()
    lo = data as LovedOneBrief | null
  }

  let elder: ElderRow | null = null
  if (b.loved_one_id) {
    const { data } = await supabase
      .from('elder_profiles')
      .select('id, medical_conditions, current_medications, allergies, doctor_name, doctor_phone, emergency_contacts, food_preferences, conversation_interests, things_to_avoid, daily_routine, continuity_notes, pinned_note')
      .eq('loved_one_id', b.loved_one_id)
      .maybeSingle()
    elder = data as ElderRow | null
  }

  // Previous visit summary — the guardian's own most recent completed report for this elder.
  let previousSummary: string | undefined
  if (elder) {
    const { data } = await supabase
      .from('visits')
      .select('one_moment, report_text, created_at')
      .eq('companion_id', companionId)
      .eq('elder_id', elder.id)
      .neq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const v = data as { one_moment: string | null; report_text: string | null } | null
    previousSummary = (v?.one_moment || v?.report_text || '').trim() || undefined
  }

  const name = lo?.full_name?.trim() || 'Family member'
  const parts = name.split(/\s+/)
  const first = parts[0] ?? name
  const last = parts.length > 1 ? parts[parts.length - 1]! : ''

  const medicalNotes = elder
    ? [...toLines(elder.medical_conditions), ...medsToLines(elder.current_medications), ...(elder.allergies ? [`Allergies: ${elder.allergies}`] : [])]
    : toLines(lo?.medical_notes)

  const emergencyContacts = contactsFromJson(elder?.emergency_contacts)
  if (!emergencyContacts.length && lo?.emergency_contact_name) {
    emergencyContacts.push({ name: lo.emergency_contact_name, relation: 'Emergency contact', phone: lo.emergency_contact_phone ?? '' })
  }
  const docName = elder?.doctor_name || lo?.doctor_name
  if (docName) emergencyContacts.push({ name: docName, relation: 'Physician', phone: elder?.doctor_phone ?? '' })

  const specialNotes = (b.special_instructions?.trim() || elder?.pinned_note?.trim() || '')

  const visit: RichVisit = {
    id: b.id,
    familyName: last ? `${last} family` : `${first}'s family`,
    memberName: name,
    memberInitials: initialsFor(name),
    relationship: lo?.relationship?.trim() || '',
    age: lo?.age ?? 0,
    service: serviceLabel(b.service_type),
    address: lo?.address?.trim() || lo?.city?.trim() || '',
    area: lo?.city?.trim() || '',
    timeLabel: timeLabelOf(b.scheduled_at),
    windowLabel: windowLabelOf(b.scheduled_at),
    durationLabel: '',
    distanceLabel: '',
    driveLabel: '',
    status: RICH_STATUS[b.status] ?? 'upcoming',
    specialNotes,
    medicalNotes,
    preferences: toLines(elder?.food_preferences, elder?.daily_routine),
    familyInstructions: toLines(b.special_instructions, elder?.pinned_note),
    conversationSuggestions: toLines(elder?.conversation_interests),
    thingsToObserve: toLines(elder?.things_to_avoid, elder?.continuity_notes),
    emergencyContacts,
    previousSummary,
  }

  return { visit, elderProfileId: elder?.id ?? null, scheduledAt: b.scheduled_at }
}

/* ── The real report write (replaces the localStorage saveReport bridge) ──── */

const MOOD_TO_SCORE: Record<string, number> = { Excellent: 5, Good: 4, Neutral: 3, Low: 2, Concern: 1 }

export interface VisitReportInput {
  companionId: string
  elderProfileId: string | null
  scales: Record<string, string>
  moments: string[]
  social: string[]
  vitals: Record<string, string>
  prep: string[]
  win?: string
  concern?: string
  note?: string
  summary: string // short, family-safe one-liner
  story: string // the rich, human story
  moodLabel?: string
  wellnessScore: number
  guardianName: string
  service: string
  pronoun: string
  photoPaths: string[]
  voice: { path: string; durationSec: number } | null
  startedAt: number
  checkinAt: number
  completedAt: number
  /** The ONE canonical report every surface renders (family/PDF/email/WhatsApp). */
  canonical: CanonicalReport
}

/**
 * Write the completed visit as a real `visits` row: the full structured CLOza
 * record lands in checklist_data (queryable), the warm story in one_moment, and
 * the booking is marked completed. Returns the visits row id so the post-visit
 * step can attach the guardian's rating/issues to the same record.
 *
 * Upserts on booking_id (unique index `visits_booking_id_key`) so re-completing
 * a visit updates the same report instead of inserting a duplicate — making the
 * two-step write (report + booking status) idempotent under retries.
 */
export async function submitVisitReport(bookingId: string, input: VisitReportInput): Promise<string> {
  const durationSec = Math.max(1, Math.round((input.completedAt - input.startedAt) / 1000))
  const checklist_data = {
    scales: input.scales,
    moments: input.moments,
    social: input.social,
    vitals: input.vitals,
    prep: input.prep,
    win: input.win ?? null,
    concern: input.concern ?? null,
    note: input.note ?? null,
    story: input.story,
    moodLabel: input.moodLabel ?? null,
    wellnessScore: input.wellnessScore,
    guardianName: input.guardianName,
    service: input.service,
    pronoun: input.pronoun,
    voice: input.voice,
    durationSec,
    checkinAt: input.checkinAt,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    // The canonical rendered report — the single source every surface reads.
    report: input.canonical,
  }
  const mood_score = input.scales.mood ? MOOD_TO_SCORE[input.scales.mood] ?? null : null

  const { data, error } = await supabase
    .from('visits')
    .upsert(
      {
        booking_id: bookingId,
        elder_id: input.elderProfileId,
        companion_id: input.companionId,
        start_time: new Date(input.startedAt).toISOString(),
        end_time: new Date(input.completedAt).toISOString(),
        tier_completed: 1,
        checklist_data,
        flags: input.concern ? 'monitor' : 'none',
        flag_notes: input.concern ?? null,
        one_moment: input.story,
        photo_urls: input.photoPaths,
        mood_score,
        report_text: input.summary,
      },
      { onConflict: 'booking_id' },
    )
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const { error: bErr } = await supabase
    .from('bookings')
    .update({ status: 'completed', checked_out_at: new Date(input.completedAt).toISOString() })
    .eq('id', bookingId)
  if (bErr) throw new Error(bErr.message)

  return (data as { id: string }).id
}

/**
 * Deliver the completed report to the family: generate the branded PDF, upload it
 * to visit-pdfs (RLS: companion upload own), then trigger the existing
 * send-visit-whatsapp edge function — which sends the visit_completed notification
 * ("your Care Report is now available") + the warm message + PDF. Best-effort and
 * never throws: returns whether it delivered + a reason if not.
 */
export async function deliverVisitReport(args: {
  bookingId: string
  memberName: string
  guardianName: string
  service: string
  relationship: string
  scales: Record<string, string>
  moments: string[]
  social: string[]
  vitals: Record<string, string>
  note?: string
  win?: string
  concern?: string
  startedAt: number
  checkinAt: number
  completedAt: number
}): Promise<{ delivered: boolean; reason?: string }> {
  try {
    const pronoun = pronounFor(args.relationship || '')
    const story = buildStory(args.memberName, pronoun, args.scales, args.moments, args.social, args.vitals as ReportVitals)
    const obs: VisitObservations = {
      scales: args.scales, moments: args.moments, social: args.social,
      concern: args.concern, note: args.note, win: args.win, photos: [], voiceNote: null,
    }
    const intel = processVisit(obs, args.memberName)
    const report: SharedVisitReport = {
      key: reportKey(args.memberName),
      memberName: args.memberName,
      guardianName: args.guardianName,
      service: args.service,
      pronoun,
      summary: intel.summary,
      story,
      mood: moodLabel(args.scales.mood),
      wellnessScore: wellnessScore(args.scales),
      scales: args.scales,
      moments: args.moments,
      social: args.social,
      vitals: args.vitals as ReportVitals,
      note: args.note,
      win: args.win,
      photos: [],
      voice: null,
      startedAt: args.startedAt,
      checkinAt: args.checkinAt,
      completedAt: args.completedAt,
      durationSec: Math.max(1, Math.round((args.completedAt - args.startedAt) / 1000)),
    }
    const clock = (ms: number) => {
      try { return new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) } catch { return '—' }
    }
    const mins = Math.max(1, Math.round((args.completedAt - args.startedAt) / 60000))
    const stats = {
      arrival: clock(args.checkinAt),
      departure: clock(args.completedAt),
      durationLabel: mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr ${mins % 60} min`,
    }

    const pdf = await buildVisitPdf(reportToPdfInput(report, stats, intel.recommendations, intel.followUps))
    const blob = pdf.output('blob') as Blob

    const path = `${args.bookingId}/care-report-${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage.from('visit-pdfs').upload(path, blob, { contentType: 'application/pdf', upsert: true })
    if (upErr) return { delivered: false, reason: upErr.message }

    const { data: signed } = await supabase.storage.from('visit-pdfs').createSignedUrl(path, 60 * 60 * 24 * 7)
    const pdfUrl = signed?.signedUrl
    if (!pdfUrl) return { delivered: false, reason: 'sign_failed' }

    // Email — capture the function's ACTUAL response (Resend HTTP status + body),
    // not just the generic "non-2xx" wrapper, so the exact cause is traceable.
    let emailResult: Record<string, unknown>
    try {
      const { data: eData, error: eErr } = await supabase.functions.invoke('send-visit-email', { body: { booking_id: args.bookingId, pdf_url: pdfUrl } })
      if (eErr) {
        const ctx = (eErr as { context?: Response }).context
        let response: unknown = eErr.message
        let status: number | undefined
        if (ctx && typeof ctx.clone === 'function') {
          status = ctx.status
          try { response = await ctx.clone().json() } catch { try { response = await ctx.text() } catch { /* keep message */ } }
        }
        emailResult = { error: eErr.message, status, response }
      } else {
        emailResult = (eData as Record<string, unknown>) ?? { success: true }
      }
    } catch (e) {
      emailResult = { error: e instanceof Error ? e.message : 'invoke_failed' }
    }

    const { data, error } = await supabase.functions.invoke('send-visit-whatsapp', { body: { booking_id: args.bookingId, pdf_url: pdfUrl } })
    const wa = data as { success?: boolean; skipped?: boolean; reason?: string } | null

    // Persist the delivery outcome on the visits row — evidence + a status the family reads.
    try {
      const delivery = {
        email: emailResult,
        whatsapp: error ? { error: error.message } : (wa ?? null),
        pdfPath: path,
        at: new Date(args.completedAt).toISOString(),
      }
      const { data: vrow } = await supabase
        .from('visits')
        .select('id, checklist_data')
        .eq('booking_id', args.bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const row = vrow as { id: string; checklist_data: Record<string, unknown> | null } | null
      if (row) await supabase.from('visits').update({ checklist_data: { ...(row.checklist_data ?? {}), delivery } }).eq('id', row.id)
    } catch {
      /* non-fatal — delivery still happened */
    }

    if (error) return { delivered: false, reason: error.message }
    return { delivered: Boolean(wa?.success), reason: wa?.reason }
  } catch (e) {
    return { delivered: false, reason: e instanceof Error ? e.message : 'error' }
  }
}

/** Attach the guardian's post-visit rating + raised issues to the saved report. */
export async function updateVisitFeedback(visitRowId: string, feedback: { rating?: number; issues?: string[] }): Promise<void> {
  const issues = feedback.issues ?? []
  const urgent = issues.some((i) => i === 'urgent' || i === 'medical' || i === 'safety')

  const { data } = await supabase.from('visits').select('checklist_data, flag_notes').eq('id', visitRowId).maybeSingle()
  const row = data as { checklist_data: Record<string, unknown> | null; flag_notes: string | null } | null
  const cd = row?.checklist_data ?? {}

  const patch: Record<string, unknown> = {
    checklist_data: { ...cd, guardianRating: feedback.rating ?? null, guardianIssues: issues },
  }
  if (urgent) {
    patch.flags = 'urgent'
    patch.flag_notes = [row?.flag_notes, `Guardian flagged: ${issues.join(', ')}`].filter(Boolean).join(' · ')
  }
  const { error } = await supabase.from('visits').update(patch).eq('id', visitRowId)
  if (error) throw new Error(error.message)
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
