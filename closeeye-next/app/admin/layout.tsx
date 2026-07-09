import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'
import { StaffGuard } from '@/components/auth/staff-guard'

export const metadata: Metadata = {
  title: 'Operations Admin · Close Eye',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGuard level="admin">
      <AdminShell>{children}</AdminShell>
    </StaffGuard>
  )
}
