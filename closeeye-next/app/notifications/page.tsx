import { redirect } from 'next/navigation'

// The real notifications feed now lives inside the Workspace at /space/notifications (reached
// from the shell bell). This top-level route stays only as a permanent redirect for old links.
export default function NotificationsRedirect() {
  redirect('/space/notifications')
}
