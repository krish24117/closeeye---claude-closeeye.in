import type { Metadata } from 'next'
import { ConsoleShell } from '@/components/console/console-shell'
import { StaffGuard } from '@/components/auth/staff-guard'

export const metadata: Metadata = {
  title: 'Presence Console · Close Eye',
  robots: { index: false, follow: false },
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGuard level="console">
      <ConsoleShell>{children}</ConsoleShell>
    </StaffGuard>
  )
}
