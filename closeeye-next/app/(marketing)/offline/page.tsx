import type { Metadata } from 'next'
import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <Logo />
      <span className="mt-10 grid h-14 w-14 place-items-center rounded-lg bg-accent-soft text-green">
        <WifiOff className="h-6 w-6" strokeWidth={1.5} />
      </span>
      <h1 className="mt-6 text-h3">You&apos;re offline</h1>
      <p className="mt-3 max-w-md text-body text-muted">
        Close Eye needs a connection for this. Your family&apos;s care never pauses —
        reconnect and we&apos;ll pick right back up.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Try again</Link>
      </Button>
    </Container>
  )
}
