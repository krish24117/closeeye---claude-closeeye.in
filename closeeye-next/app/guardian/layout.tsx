import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guardian',
  description: 'Close Eye Guardian app — for Guardians on their visits.',
  robots: { index: false, follow: false },
}

export default function GuardianRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
