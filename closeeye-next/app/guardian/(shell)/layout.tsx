import { GuardianShell } from '@/components/guardian/guardian-shell'
import { GuardianGuard } from '@/components/auth/guardian-guard'

export default function GuardianShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuardianGuard>
      <GuardianShell>{children}</GuardianShell>
    </GuardianGuard>
  )
}
