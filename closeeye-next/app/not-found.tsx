import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <Logo />
      <span className="eyebrow is-centered mt-10">Error 404</span>
      <h1 className="mt-3 text-h2">This page wandered off</h1>
      <p className="mt-3 max-w-md text-body text-muted">
        The page you&apos;re looking for isn&apos;t here — but the people you love
        still are.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back home</Link>
      </Button>
    </Container>
  )
}
