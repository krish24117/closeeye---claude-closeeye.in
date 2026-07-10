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
}

const NOTIF_COLS = 'id, type, title, message, read, created_at'

/** The user's notifications, newest first. */
export async function fetchNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIF_COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data as AppNotification[] | null) ?? []
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
