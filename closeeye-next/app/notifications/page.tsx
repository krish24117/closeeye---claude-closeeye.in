import { redirect } from 'next/navigation'

// This standalone route showed seeded/demo notifications and is not linked from the
// app. Neutralised until family notifications are wired to the real notifications
// table; the in-app bell shows the real feed. See the family shell.
export default function NotificationsPage() {
  redirect('/family')
}
