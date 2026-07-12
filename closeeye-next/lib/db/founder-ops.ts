import { supabase } from '@/lib/supabase'
import type { FounderAction, FounderReminder } from '@/lib/founder-ops-view'

/**
 * Founder ops — the registrant list for the operational dashboard. Reads through
 * the admin-only `admin_founder_registrants` function (emails live in auth.users,
 * unreadable from the browser), and lets an admin mark follow-up / save notes
 * (allowed by the "Profiles: update own or admin" RLS).
 */
export interface FounderRegistrant {
  id: string
  fullName: string | null
  email: string | null
  phone: string | null
  serviceArea: string | null
  relationship: string | null
  planId: string | null
  subStatus: string | null
  ref: string | null
  registeredAt: string | null
  followedUp: boolean
  followedUpAt: string | null
  notes: string | null
  isFoundingMember: boolean
  foundingNumber: number | null
  stage: string | null
  source: string | null
}

interface RawRegistrant {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  service_area: string | null
  relationship: string | null
  plan_id: string | null
  sub_status: string | null
  ref: string | null
  registered_at: string | null
  followed_up: boolean | null
  followed_up_at: string | null
  notes: string | null
  is_founding_member: boolean | null
  founding_number: number | null
  founder_stage: string | null
  founder_source: string | null
}

export async function fetchFounderRegistrants(): Promise<FounderRegistrant[]> {
  const { data, error } = await supabase.rpc('admin_founder_registrants')
  if (error) {
    console.error('[founder-ops] fetchFounderRegistrants failed:', error.message)
    return []
  }
  return ((data as RawRegistrant[] | null) ?? []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    serviceArea: r.service_area,
    relationship: r.relationship,
    planId: r.plan_id,
    subStatus: r.sub_status,
    ref: r.ref,
    registeredAt: r.registered_at,
    followedUp: !!r.followed_up,
    followedUpAt: r.followed_up_at,
    notes: r.notes,
    isFoundingMember: !!r.is_founding_member,
    foundingNumber: r.founding_number,
    stage: r.founder_stage,
    source: r.founder_source,
  }))
}

/** A founder-funnel hand-raiser who left their details (the low-friction /join
 *  path → waitlist, tagged "Founder Program"). Not an account yet — so they sit
 *  in their own "Interested" list on the Founder page, distinct from registrants. */
export interface FounderLead {
  id: string
  fullName: string | null
  phone: string | null
  email: string | null
  city: string | null
  outsideHyderabad: boolean
  createdAt: string | null
}

export async function fetchFounderLeads(): Promise<FounderLead[]> {
  const { data, error } = await supabase
    .from('waitlist')
    .select('id, full_name, whatsapp_number, email, loved_one_city, support_needed, created_at')
    .ilike('support_needed', 'Founder Program%')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[founder-ops] fetchFounderLeads failed:', error.message)
    return []
  }
  return ((data as { id: string; full_name: string | null; whatsapp_number: string | null; email: string | null; loved_one_city: string | null; support_needed: string | null; created_at: string | null }[] | null) ?? []).map((r) => ({
    id: r.id,
    fullName: r.full_name,
    phone: r.whatsapp_number,
    email: r.email,
    city: r.loved_one_city,
    outsideHyderabad: (r.support_needed ?? '').toLowerCase().includes('outside'),
    createdAt: r.created_at,
  }))
}

export async function setFollowedUp(userId: string, value: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ founder_followed_up: value, founder_followed_up_at: value ? new Date().toISOString() : null })
    .eq('id', userId)
  return { error: error?.message ?? null }
}

export async function setFounderNotes(userId: string, notes: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ founder_notes: notes.trim() || null }).eq('id', userId)
  return { error: error?.message ?? null }
}

/** Set the manual pipeline stage (new|qualified|conversation|offer|referred; 'won' is
 *  derived from a live subscription, never written here). Admin-update RLS on profiles. */
export async function setFounderStage(userId: string, stage: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ founder_stage: stage }).eq('id', userId)
  return { error: error?.message ?? null }
}

/** Set the lead source (channel attribution). Admin-update RLS on profiles. */
export async function setFounderSource(userId: string, source: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ founder_source: source || null }).eq('id', userId)
  return { error: error?.message ?? null }
}

export type FounderActionType = 'call' | 'whatsapp' | 'email'
export type { FounderAction }

/** Log a founder outbound action, fire-and-forget — never blocks the tap, and
 *  swallows errors (incl. before the founder_actions migration lands). */
export function logFounderAction(registrantId: string, actionType: FounderActionType): void {
  try {
    void supabase
      .from('founder_actions')
      .insert({ registrant_id: registrantId, action_type: actionType })
      .then(() => {}, () => {})
  } catch {
    /* best-effort */
  }
}

/** All founder actions (admin RLS), newest first — for KPIs + per-family timelines. */
export async function fetchFounderActions(): Promise<FounderAction[]> {
  const { data, error } = await supabase
    .from('founder_actions')
    .select('registrant_id, action_type, created_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[founder-ops] fetchFounderActions failed:', error.message)
    return []
  }
  return ((data as { registrant_id: string; action_type: string; created_at: string }[] | null) ?? []).map((a) => ({
    registrantId: a.registrant_id,
    actionType: a.action_type,
    createdAt: a.created_at,
  }))
}

export type { FounderReminder }

/** All open + recent reminders (admin RLS), soonest due first. */
export async function fetchReminders(): Promise<FounderReminder[]> {
  const { data, error } = await supabase
    .from('founder_reminders')
    .select('id, registrant_id, due_on, note, done')
    .order('due_on', { ascending: true })
  if (error) {
    console.error('[founder-ops] fetchReminders failed:', error.message)
    return []
  }
  return ((data as { id: string; registrant_id: string; due_on: string; note: string | null; done: boolean }[] | null) ?? []).map((r) => ({
    id: r.id,
    registrantId: r.registrant_id,
    dueOn: r.due_on,
    note: r.note,
    done: r.done,
  }))
}

export async function addReminder(registrantId: string, dueOn: string, note: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('founder_reminders').insert({ registrant_id: registrantId, due_on: dueOn, note: note.trim() || null })
  return { error: error?.message ?? null }
}

export async function setReminderDone(id: string, done: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('founder_reminders').update({ done }).eq('id', id)
  return { error: error?.message ?? null }
}
