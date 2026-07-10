import { redirect } from 'next/navigation'

// The real, data-backed account surface is /family/profile. This route used to be
// a second, mock-populated settings screen (fake contacts / card / toasts); it now
// forwards to the real one so there is a single source of truth for the account.
export default function SettingsPage() {
  redirect('/family/profile')
}
