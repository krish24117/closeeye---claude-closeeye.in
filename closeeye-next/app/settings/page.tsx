import { redirect } from 'next/navigation'

// The real, data-backed account surface is the workspace Profile at /space/settings.
// (This previously forwarded to /family/profile, which has no page — a 404. Fixed to the
// canonical settings screen so there is a single source of truth for the account.)
export default function SettingsPage() {
  redirect('/space/settings')
}
