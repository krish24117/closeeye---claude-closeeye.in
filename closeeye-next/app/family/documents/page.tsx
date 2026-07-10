import { redirect } from 'next/navigation'

// The Documents vault is not part of the launch MVP — it was showing placeholder
// records and uploads didn't persist. Hidden from nav and neutralised here until
// it's backed by real, secure Storage (roadmap feature per the Product Bible).
export default function DocumentsPage() {
  redirect('/family')
}
