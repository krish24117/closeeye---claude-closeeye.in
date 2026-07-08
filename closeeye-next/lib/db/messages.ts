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
