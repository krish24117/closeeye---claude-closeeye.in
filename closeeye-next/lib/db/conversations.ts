import { supabase } from '@/lib/supabase'
import type { Understanding } from '@/lib/connect/comprehension'

/**
 * Durable Connect conversations (Priority 1, Decision 2). A proper thread model so a customer can
 * reopen a past conversation and continue it across days. RLS scopes every read/write to the owner.
 *
 * All writes are BEST-EFFORT: if the tables aren't there yet (migration not applied), persistence
 * silently no-ops and the live answer flow still works — durable history simply activates once the
 * migration lands. Never let a persistence hiccup break answering the family's question.
 */
export interface ConversationSummary {
  id: string
  title: string
  subjectLabel: string | null
  lovedOneId: string | null
  updatedAt: string
}

export type TurnKind = 'answer' | 'escalate' | 'pending' | 'out_of_scope'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind: TurnKind
  understanding: Understanding | null
  ambulanceNumber: string | null
  createdAt: string
}

export interface ConversationThread {
  id: string
  subjectLabel: string | null
  lovedOneId: string | null
  messages: ConversationMessage[]
}

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

/** Start a thread; returns its id (or null if persistence is unavailable pre-migration). */
export async function createConversation(input: { title: string; subjectLabel?: string | null; lovedOneId?: string | null }): Promise<string | null> {
  const userId = await uid()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title: input.title.slice(0, 200), subject_label: input.subjectLabel ?? null, loved_one_id: input.lovedOneId ?? null })
      .select('id')
      .single()
    if (error || !data) return null
    return data.id
  } catch {
    return null
  }
}

/** Append one turn. Best-effort; touches the parent's updated_at so history sorts by recency. */
export async function appendMessage(
  conversationId: string,
  msg: { role: 'user' | 'assistant'; content: string; kind?: TurnKind; understanding?: Understanding | null; ambulanceNumber?: string | null },
): Promise<void> {
  const userId = await uid()
  if (!userId || !conversationId) return
  try {
    await supabase.from('conversation_messages').insert({
      conversation_id: conversationId,
      user_id: userId,
      role: msg.role,
      content: msg.content,
      kind: msg.kind ?? 'answer',
      understanding: msg.understanding ?? null,
      ambulance_number: msg.ambulanceNumber ?? null,
    })
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
  } catch {
    /* best-effort */
  }
}

/** The history list — most-recently-updated first. Empty (never throws) if unavailable. */
export async function fetchConversations(limit = 20): Promise<ConversationSummary[]> {
  const userId = await uid()
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, subject_label, loved_one_id, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []
    return data.map((c) => ({ id: c.id, title: c.title ?? 'Conversation', subjectLabel: c.subject_label ?? null, lovedOneId: c.loved_one_id ?? null, updatedAt: c.updated_at }))
  } catch {
    return []
  }
}

/** Load one thread to reopen + continue. Null if unavailable or not the caller's. */
export async function fetchConversation(id: string): Promise<ConversationThread | null> {
  const userId = await uid()
  if (!userId) return null
  try {
    const [{ data: conv }, { data: msgs }] = await Promise.all([
      supabase.from('conversations').select('id, subject_label, loved_one_id').eq('id', id).maybeSingle(),
      supabase.from('conversation_messages').select('id, role, content, kind, understanding, ambulance_number, created_at').eq('conversation_id', id).order('created_at', { ascending: true }),
    ])
    if (!conv) return null
    return {
      id: conv.id,
      subjectLabel: conv.subject_label ?? null,
      lovedOneId: conv.loved_one_id ?? null,
      messages: (msgs ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        kind: (m.kind ?? 'answer') as TurnKind,
        understanding: (m.understanding ?? null) as Understanding | null,
        ambulanceNumber: m.ambulance_number ?? null,
        createdAt: m.created_at,
      })),
    }
  } catch {
    return null
  }
}
