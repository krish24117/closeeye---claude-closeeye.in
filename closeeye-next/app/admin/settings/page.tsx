import { redirect } from 'next/navigation'

// The Admin settings screen presented fabricated business config (fake GSTIN, fake
// API keys, integrations always "Connected"). Hidden from nav and neutralised until
// it's wired to real settings storage.
export default function AdminSettingsPage() {
  redirect('/admin')
}
