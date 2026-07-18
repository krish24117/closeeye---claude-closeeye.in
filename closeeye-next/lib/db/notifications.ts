import { supabase } from '@/lib/supabase'

/**
 * In-app notifications for the signed-in user. Reuses the existing user_id-scoped
 * `notifications` table (created server-side by triggers / edge functions; the
 * "read own" + "mark read own" RLS policies cover any role, guardians included).
 * Column names match the live table: `message` (not body), `read` (not is_read).
 */

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string | null
  read: boolean
  created_at: string
  /** Where this notification opens — always inside the Workspace (Navigation Law 4). */
  target: string
}

const NOTIF_COLS = 'id, type, title, message, read, created_at'

/** A row as it comes from the DB (no target column — target is derived, not stored). */
type NotificationRow = Omit<AppNotification, 'target'>

/**
 * Navigation Law 4 — every notification opens INSIDE the Workspace. The destination is derived
 * from the notification type and is ALWAYS a `/space`-rooted URL; a notification is never sent
 * back into the retiring `/family` tree. Today the Workspace is a single home (`/space`); as
 * capabilities re-home under `/space/*` (Phase 4), refine the per-type mapping here — e.g. a
 * visit update → `/space/visits`. Deriving (not storing) keeps Phase 1 schema-free.
 */
export function notificationTarget(_type: string): string {
  return '/space'
}

/** The user's notifications, newest first. */
export async function fetchNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIF_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return ((data as NotificationRow[] | null) ?? []).map((n) => ({ ...n, target: notificationTarget(n.type) }))
}

/** Mark every unread notification for the user as read. Best-effort. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw new Error(error.message)
}
