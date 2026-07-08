import type { Metadata } from 'next'
import { ConsoleShell } from '@/components/console/console-shell'

export const metadata: Metadata = {
  title: 'Presence Console · Close Eye',
  robots: { index: false, follow: false },
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <ConsoleShell>{children}</ConsoleShell>
}
