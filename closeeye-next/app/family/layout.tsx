import type { Metadata } from 'next'
import { FamilyShell } from '@/components/family/family-shell'

export const metadata: Metadata = {
  title: 'Family Space',
  description: 'Your family’s digital home — updates, visits, and peace of mind.',
  robots: { index: false, follow: false }, // private, authenticated area
}

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return <FamilyShell>{children}</FamilyShell>
}
