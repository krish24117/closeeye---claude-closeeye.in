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
  const lite = p === '/connect' || p.startsWith('/connect/') || p === '/space' || p.startsWith('/space/')

  if (lite) return <ToastProvider>{children}</ToastProvider>

  return (
    <FamilyDataProvider>
      <AuthGate />
      <ToastProvider>{children}</ToastProvider>
    </FamilyDataProvider>
  )
}
