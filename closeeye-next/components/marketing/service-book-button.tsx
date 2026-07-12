'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'

/**
 * Auth-aware "Book" CTA for the marketing services page. A guest is sent to the public
 * booking wizard (fill details → request → secure payment link); a signed-in family
 * user goes straight into the in-app booking. Pre-selects the service via ?service=
 * (ids match between SERVICE_DETAILS and BOOKING_SERVICES).
 */
export function ServiceBookButton({
  serviceId,
  serviceName,
  size = 'md',
  onDark = false,
  className,
}: {
  serviceId?: string
  serviceName?: string
  size?: 'sm' | 'md' | 'lg'
  onDark?: boolean
  className?: string
}) {
  const { session } = useAuth()
  const base = session ? '/family/book' : '/book'
  const href = serviceId ? `${base}?service=${serviceId}` : base
  const label = serviceName ? `Book ${serviceName}` : 'Book a visit'

  return (
    <Button asChild size={size} onDark={onDark} className={className}>
      <Link href={href}>
        {label} <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
      </Link>
    </Button>
  )
}
