import { redirect } from 'next/navigation'

// The Presence Console settings screen was mock (demo PM profile + fabricated
// guardian roster). Hidden from nav and neutralised until it's wired to real data.
export default function SettingsPage() {
  redirect('/console')
}
