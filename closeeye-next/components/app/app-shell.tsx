'use client'

import { usePathname } from 'next/navigation'
import { AuthGate } from '@/components/auth/auth-gate'
import { FamilyDataProvider } from '@/components/family/family-data-provider'
import { ToastProvider } from '@/components/ui/toast'

/**
 * Route-aware provider shell.
 *
 * /connect and /space are self-contained journeys (Close Eye Connect) that never
 * use the family dashboard data provider or the app router-gate. Skipping them on
 * those routes keeps cold, signed-out visitors from hydrating the entire family
 * app — a meaningful mobile performance win on the launch surface. Every other
 * route gets the full tree, exactly as before.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const p = usePathname() || ''
  // /connect stays fully lite (cold signed-out marketing journey — no family data).
  const connect = p === '/connect' || p.startsWith('/connect/')
  // The Workspace (/space/*) gets family data (Ask, People, Care read it) but NOT AuthGate —
  // the Workspace shell owns its own auth guard (Nav Law 6, one auth flow).
  const workspace = p === '/space' || p.startsWith('/space/')

  if (connect) return <ToastProvider>{children}</ToastProvider>

  if (workspace) {
    return (
      <FamilyDataProvider>
        <ToastProvider>{children}</ToastProvider>
      </FamilyDataProvider>
    )
  }

  return (
    <FamilyDataProvider>
      <AuthGate />
      <ToastProvider>{children}</ToastProvider>
    </FamilyDataProvider>
  )
}
