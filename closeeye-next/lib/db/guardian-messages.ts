import { supabase } from '@/lib/supabase'

/**
 * Guardian ↔ Presence Manager messaging. A parallel to lib/db/messages.ts, keyed
 * by companion_id (= the guardian's auth uid) instead of a loved_one. The
 * guardian side filters by their own companion_id; the admin/PM side relies on
 * RLS (guardians serving their assigned families) + the summaries RPC.
 */

export interface GuardianMessage {
  id: string
  companion_id: string
  sender: 'guardian' | 'closeeye' | 'system'
  body: string | null
  attachment_url: string | null
  attachment_type: 'image' | 'pdf' | 'audio' | null
  read_at: string | null
  created_at: string
}

const GM_COLS = 'id, companion_id, sender, body, attachment_url, attachment_type, read_at, created_at'

// ── Guardian side ────────────────────────────────────────────────────────────

/** The guardian's own thread, oldest first. */
export async function fetchGuardianThread(companionId: string): Promise<GuardianMessage[]> {
  const { data, error } = await supabase
    .from('guardian_messages')
    .select(GM_COLS)
    .eq('companion_id', companionId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as GuardianMessage[] | null) ?? []
}

/** Guardian sends a message into their own thread (sender='guardian'). */
export async function sendGuardianMessage(companionId: string, body: string): Promise<GuardianMessage> {
  const row = { companion_id: companionId, sender: 'guardian' as const, body: body.trim() || null }
  const { data, error } = await supabase.from('guardian_messages').insert(row).select(GM_COLS).single()
  if (error) throw new Error(error.message)
  return data as GuardianMessage
}

/** Mark inbound (non-guardian) messages as read. Best-effort. */
export async function markGuardianThreadRead(companionId: string): Promise<void> {
  const { error } = await supabase
    .from('guardian_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('companion_id', companionId)
    .neq('sender', 'guardian')
    .is('read_at', null)
  if (error) throw new Error(error.message)
}

/** Live INSERTs for one guardian's thread (RLS-filtered). Returns an unsubscribe fn. */
export function subscribeToGuardianThread(companionId: string, onInsert: (m: GuardianMessage) => void): () => void {
  const channel = supabase
    .channel(`guardian_messages:${companionId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'guardian_messages', filter: `companion_id=eq.${companionId}` },
      (payload) => onInsert(payload.new as GuardianMessage),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

// ── Admin / Presence Manager side ────────────────────────────────────────────

/** The minimum a guardian conversation needs to render on the staff side. */
export interface GuardianThreadRef {
  companionId: string
  guardianName: string
  guardianCity: string | null
}

export interface GuardianThread extends GuardianThreadRef {
  lastMessage: GuardianMessage
  awaitingReply: boolean // the guardian sent the most recent message
  count: number
}

interface GuardianThreadRow {
  companion_id: string
  guardian_name: string | null
  guardian_city: string | null
  last_message_id: string
  last_sender: GuardianMessage['sender']
  last_body: string | null
  last_attachment_type: GuardianMessage['attachment_type']
  last_created_at: string
  awaiting_reply: boolean
  message_count: number
}

/**
 * Every active guardian conversation (one per guardian with messages), newest
 * first, via the `guardian_thread_summaries` RPC (SECURITY INVOKER → RLS scopes
 * Super Admin=all / PM=guardians serving their families).
 */
export async function fetchGuardianThreadsAsAdmin(): Promise<GuardianThread[]> {
  const { data, error } = await supabase.rpc('guardian_thread_summaries', { p_limit: 200 })
  if (error) throw new Error(error.message)
  const rows = (data as GuardianThreadRow[] | null) ?? []
  return rows.map((r) => ({
    companionId: r.companion_id,
    guardianName: r.guardian_name ?? 'Guardian',
    guardianCity: r.guardian_city,
    lastMessage: {
      id: r.last_message_id,
      companion_id: r.companion_id,
      sender: r.last_sender,
      body: r.last_body,
      attachment_url: null,
      attachment_type: r.last_attachment_type,
      read_at: null,
      created_at: r.last_created_at,
    },
    awaitingReply: r.awaiting_reply,
    count: Number(r.message_count),
  }))
}

/** One guardian's full thread, staff-scoped (RLS decides visibility). */
export async function fetchGuardianThreadAsAdmin(companionId: string): Promise<GuardianMessage[]> {
  const { data, error } = await supabase
    .from('guardian_messages')
    .select(GM_COLS)
    .eq('companion_id', companionId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as GuardianMessage[] | null) ?? []
}

/** Resolve a guardian thread's header (name + city) for the staff view. */
export async function fetchGuardianThreadMeta(companionId: string): Promise<GuardianThreadRef | null> {
  const { data, error } = await supabase.from('companions').select('id, full_name, city').eq('id', companionId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const c = data as { id: string; full_name: string | null; city: string | null }
  return { companionId: c.id, guardianName: c.full_name ?? 'Guardian', guardianCity: c.city }
}

/** Reply to a guardian as Close Eye (sender='closeeye'); the guardian receives it via realtime. */
export async function sendAdminGuardianMessage(companionId: string, body: string): Promise<GuardianMessage> {
  const row = { companion_id: companionId, sender: 'closeeye' as const, body: body.trim() || null }
  const { data, error } = await supabase.from('guardian_messages').insert(row).select(GM_COLS).single()
  if (error) throw new Error(error.message)
  return data as GuardianMessage
}
