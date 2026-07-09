import { supabase } from '@/lib/supabase'
import type { Message } from '@/lib/db/types'

const MESSAGE_COLS =
  'id, loved_one_id, family_user_id, sender, body, attachment_url, attachment_type, related_booking_id, read_at, created_at'

const ATTACH_BUCKET = 'message-attachments'

/** A per-member thread's headline for the inbox list. */
export interface ThreadSummary {
  lovedOneId: string
  lastMessage: Message | null
  unread: number
}

/**
 * All messages in one family member's thread, oldest first. Filter explicitly
 * by family_user_id — the messages RLS also grants ADMINS a global read, so
 * relying on RLS alone would let an admin account see every family's threads.
 */
export async function fetchThread(userId: string, lovedOneId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLS)
    .eq('family_user_id', userId)
    .eq('loved_one_id', lovedOneId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Message[] | null) ?? []
}

/**
 * Last message + unread count for every one of the user's threads, keyed by
 * loved_one_id. One query (newest first); grouped client-side.
 */
export async function fetchThreadSummaries(userId: string): Promise<Map<string, ThreadSummary>> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLS)
    .eq('family_user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (data as Message[] | null) ?? []
  const map = new Map<string, ThreadSummary>()
  for (const m of rows) {
    let s = map.get(m.loved_one_id)
    if (!s) {
      // rows are newest-first, so the first one seen per member is the latest.
      s = { lovedOneId: m.loved_one_id, lastMessage: m, unread: 0 }
      map.set(m.loved_one_id, s)
    }
    if (m.read_at === null && m.sender !== 'family') s.unread++
  }
  return map
}

/** Send a family message into a member's thread. Returns the created row. */
export async function sendMessage(
  userId: string,
  input: { lovedOneId: string; body?: string; attachmentPath?: string; attachmentType?: 'image' | 'pdf' },
): Promise<Message> {
  const row = {
    family_user_id: userId,
    loved_one_id: input.lovedOneId,
    sender: 'family' as const,
    body: input.body?.trim() || null,
    attachment_url: input.attachmentPath ?? null,
    attachment_type: input.attachmentType ?? null,
  }
  const { data, error } = await supabase.from('messages').insert(row).select(MESSAGE_COLS).single()
  if (error) throw new Error(error.message)
  return data as Message
}

/** Mark every inbound (non-family) message in a thread as read. Best-effort. */
export async function markThreadRead(userId: string, lovedOneId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('family_user_id', userId)
    .eq('loved_one_id', lovedOneId)
    .neq('sender', 'family')
    .is('read_at', null)
  if (error) throw new Error(error.message)
}

/**
 * Upload an image or PDF to the private message-attachments bucket at
 * "<userId>/<lovedOneId>/<name>". Returns the storage path (stored on the
 * message row) + normalised type. Rendering uses a short-lived signed URL.
 */
export async function uploadAttachment(
  userId: string,
  lovedOneId: string,
  file: File,
): Promise<{ path: string; type: 'image' | 'pdf' }> {
  const isPdf = file.type === 'application/pdf'
  const isImage = file.type.startsWith('image/')
  if (!isPdf && !isImage) throw new Error('Only images and PDFs can be attached.')
  const ext = (isPdf ? 'pdf' : (file.name.split('.').pop() || 'jpg')).toLowerCase()
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = `${userId}/${lovedOneId}/${name}`
  const { error } = await supabase.storage.from(ATTACH_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return { path, type: isPdf ? 'pdf' : 'image' }
}

/** A short-lived signed URL to display a private attachment (null on failure). */
export async function signedAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(ATTACH_BUCKET).createSignedUrl(path, 3600)
  if (error) return null
  return data?.signedUrl ?? null
}

/**
 * Live INSERTs for one member's thread via Supabase realtime (RLS-filtered, so
 * only the owner/admin receive them). Returns an unsubscribe fn. Realtime is an
 * enhancement — the thread still works via fetch + optimistic send without it.
 */
export function subscribeToThread(lovedOneId: string, onInsert: (m: Message) => void): () => void {
  const channel = supabase
    .channel(`messages:${lovedOneId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `loved_one_id=eq.${lovedOneId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

// ── Admin / Presence Manager side ────────────────────────────────────────────
// Admins (profiles.role='admin') read & reply to EVERY thread via the
// "Messages: admin manage" RLS. These fns intentionally do NOT filter by
// family_user_id — the opposite of the family-side fns. There is currently no
// admin→family assignment model, so every admin sees every conversation; add a
// family_assignments table + RLS if per-Presence-Manager scoping is ever needed.

/** The minimum a conversation needs to render on the admin side. */
export interface AdminThreadRef {
  lovedOneId: string
  lovedOneName: string
  familyUserId: string // the owning family account (denormalised onto each message)
  familyName: string
}

export interface AdminThread extends AdminThreadRef {
  lastMessage: Message
  awaitingReply: boolean // the family sent the most recent message
  count: number
}

interface AdminThreadRow {
  loved_one_id: string
  loved_one_name: string | null
  family_user_id: string
  family_name: string | null
  last_message_id: string
  last_sender: Message['sender']
  last_body: string | null
  last_attachment_type: Message['attachment_type']
  last_created_at: string
  awaiting_reply: boolean
  message_count: number
}

/**
 * Every active conversation (one per loved_one that has messages), newest first.
 * Aggregation happens server-side via the `admin_thread_summaries` RPC (SECURITY
 * INVOKER → RLS still scopes Super Admin=all / PM=assigned), so the whole
 * platform's messages are NOT pulled into the browser. Bounded to p_limit rows.
 */
export async function fetchAdminThreads(): Promise<AdminThread[]> {
  const { data, error } = await supabase.rpc('admin_thread_summaries', { p_limit: 200 })
  if (error) throw new Error(error.message)
  const rows = (data as AdminThreadRow[] | null) ?? []
  return rows.map((r) => ({
    lovedOneId: r.loved_one_id,
    lovedOneName: r.loved_one_name ?? 'Family member',
    familyUserId: r.family_user_id,
    familyName: r.family_name || 'Family',
    lastMessage: {
      id: r.last_message_id,
      loved_one_id: r.loved_one_id,
      family_user_id: r.family_user_id,
      sender: r.last_sender,
      body: r.last_body,
      attachment_url: null,
      attachment_type: r.last_attachment_type,
      related_booking_id: null,
      read_at: null,
      created_at: r.last_created_at,
    },
    awaitingReply: r.awaiting_reply,
    count: Number(r.message_count),
  }))
}

/** One thread's full history, admin-scoped (filter by loved_one_id only). */
export async function fetchThreadAsAdmin(lovedOneId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLS)
    .eq('loved_one_id', lovedOneId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Message[] | null) ?? []
}

/** Resolve a single thread's header info (loved one + owning family) for the admin view. */
export async function fetchAdminThreadMeta(lovedOneId: string): Promise<AdminThreadRef | null> {
  const { data, error } = await supabase
    .from('loved_ones')
    .select('id, full_name, family_user_id')
    .eq('id', lovedOneId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const lo = data as { id: string; full_name: string; family_user_id: string }
  const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', lo.family_user_id).maybeSingle()
  return {
    lovedOneId: lo.id,
    lovedOneName: lo.full_name,
    familyUserId: lo.family_user_id,
    familyName: (prof as { full_name: string | null } | null)?.full_name || 'Family',
  }
}

/**
 * Reply into a thread as Close Eye (sender='closeeye'). Requires the thread's
 * owning family id (family_user_id is a NOT NULL denormalised column). The
 * family receives it instantly via their existing realtime subscription.
 */
export async function sendAdminMessage(input: {
  lovedOneId: string
  familyUserId: string
  body?: string
  attachmentPath?: string
  attachmentType?: 'image' | 'pdf'
}): Promise<Message> {
  const row = {
    family_user_id: input.familyUserId,
    loved_one_id: input.lovedOneId,
    sender: 'closeeye' as const,
    body: input.body?.trim() || null,
    attachment_url: input.attachmentPath ?? null,
    attachment_type: input.attachmentType ?? null,
  }
  const { data, error } = await supabase.from('messages').insert(row).select(MESSAGE_COLS).single()
  if (error) throw new Error(error.message)
  return data as Message
}
