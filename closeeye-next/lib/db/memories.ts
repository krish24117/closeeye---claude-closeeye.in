/**
 * Family Memories — the "Remembers" pillar's data layer. Photos, videos and documents grouped
 * into MOMENTS ("Siyah's birthday"), stored in a PRIVATE Supabase Storage bucket (one folder per
 * user) with owner-only RLS (migration 20260745000000). Reads return short-lived signed URLs so a
 * private file can render without making the bucket public.
 */
import { supabase } from '@/lib/supabase'

export type MemoryKind = 'photo' | 'video' | 'document'
export interface MemoryItemView { id: string; kind: MemoryKind; url: string | null; caption: string | null; path: string }
export interface MemoryView {
  id: string
  title: string
  occurredAt: string
  items: MemoryItemView[]
  cover: MemoryItemView | null
  count: number
}
export interface NewMemoryFile { file: File; kind: MemoryKind; caption?: string }

const BUCKET = 'memories'
const SIGN_TTL = 60 * 60 // 1 hour — long enough for a browsing session

/** photo · video · document, from a File's MIME type. */
export function kindOf(file: File): MemoryKind {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type.startsWith('video/')) return 'video'
  return 'document'
}
const extOf = (name: string) => { const i = name.lastIndexOf('.'); return i >= 0 ? name.slice(i).toLowerCase() : '' }

interface ItemRow { id: string; kind: MemoryKind; storage_path: string; caption: string | null; created_at: string }
interface MemRow { id: string; title: string; occurred_at: string; loved_one_id?: string; memory_items: ItemRow[] | null }

async function signItems(items: ItemRow[]): Promise<MemoryItemView[]> {
  const sorted = [...items].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
  return Promise.all(sorted.map(async (it) => {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(it.storage_path, SIGN_TTL)
    return { id: it.id, kind: it.kind, url: data?.signedUrl ?? null, caption: it.caption, path: it.storage_path }
  }))
}
const toView = async (m: MemRow): Promise<MemoryView> => {
  const items = await signItems(m.memory_items ?? [])
  return { id: m.id, title: m.title, occurredAt: m.occurred_at, items, cover: items.find((i) => i.kind !== 'document') ?? items[0] ?? null, count: items.length }
}

/** Create a moment for a loved one and upload its media. Best-effort per file — one failed upload
 *  skips that file rather than aborting the whole moment. */
export async function createMemory(input: { lovedOneId: string; title: string; occurredAt?: string; files: NewMemoryFile[] }): Promise<{ id: string | null; error: string | null }> {
  try {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth.user
    if (!user) return { id: null, error: 'not-signed-in' }
    const title = input.title.trim()
    if (!title) return { id: null, error: 'no-title' }
    if (!input.files.length) return { id: null, error: 'no-files' }

    const { data: mem, error: memErr } = await supabase
      .from('memories')
      .insert({ family_user_id: user.id, loved_one_id: input.lovedOneId, title, occurred_at: input.occurredAt || new Date().toISOString() })
      .select('id')
      .single()
    if (memErr || !mem) return { id: null, error: 'could-not-create' }

    let uploaded = 0
    for (const f of input.files) {
      const path = `${user.id}/${input.lovedOneId}/${mem.id}/${crypto.randomUUID()}${extOf(f.file.name)}`
      const up = await supabase.storage.from(BUCKET).upload(path, f.file, { upsert: false, contentType: f.file.type || undefined })
      if (up.error) continue
      const { error: itErr } = await supabase.from('memory_items').insert({ memory_id: mem.id, family_user_id: user.id, kind: f.kind, storage_path: path, caption: f.caption?.trim() || null })
      if (!itErr) uploaded++
    }
    if (uploaded === 0) { await supabase.from('memories').delete().eq('id', mem.id); return { id: null, error: 'upload-failed' } }
    return { id: mem.id, error: null }
  } catch { return { id: null, error: 'network' } }
}

/** All moments for one loved one, newest first, media grouped + signed. */
export async function fetchMemories(lovedOneId: string): Promise<MemoryView[]> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return []
  const { data, error } = await supabase
    .from('memories')
    .select('id, title, occurred_at, memory_items(id, kind, storage_path, caption, created_at)')
    .eq('loved_one_id', lovedOneId)
    .order('occurred_at', { ascending: false })
    .limit(60)
  if (error || !data) return []
  return Promise.all((data as unknown as MemRow[]).map(toView))
}

/** The most recent moments across the whole family — for the home "Recently remembered" strip. */
export async function fetchRecentMemories(limit = 8): Promise<(MemoryView & { lovedOneId: string })[]> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return []
  const { data, error } = await supabase
    .from('memories')
    .select('id, title, occurred_at, loved_one_id, memory_items(id, kind, storage_path, caption, created_at)')
    .order('occurred_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return Promise.all((data as unknown as MemRow[]).map(async (m) => ({ ...(await toView(m)), lovedOneId: m.loved_one_id ?? '' })))
}

/** Delete a whole moment — its media files from Storage, then the row (items cascade). */
export async function deleteMemory(id: string, storagePaths: string[]): Promise<{ error: string | null }> {
  try {
    if (storagePaths.length) await supabase.storage.from(BUCKET).remove(storagePaths)
    const { error } = await supabase.from('memories').delete().eq('id', id)
    return { error: error ? 'could-not-delete' : null }
  } catch { return { error: 'network' } }
}

/** Delete ONE item (a single photo, video or document) — its file, then its row. If it was the
 *  moment's last item, the now-empty moment is removed too, so no blank moments linger. */
export async function deleteMemoryItem(
  itemId: string,
  storagePath: string,
  memoryId?: string,
): Promise<{ error: string | null; momentEmptied: boolean }> {
  try {
    if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath])
    const { error } = await supabase.from('memory_items').delete().eq('id', itemId)
    if (error) return { error: 'could-not-delete', momentEmptied: false }
    if (memoryId) {
      const { count } = await supabase.from('memory_items').select('id', { count: 'exact', head: true }).eq('memory_id', memoryId)
      if ((count ?? 0) === 0) { await supabase.from('memories').delete().eq('id', memoryId); return { error: null, momentEmptied: true } }
    }
    return { error: null, momentEmptied: false }
  } catch { return { error: 'network', momentEmptied: false } }
}
