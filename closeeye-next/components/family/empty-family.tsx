'use client'

import Link from 'next/link'
import { UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/components/family/family-data-provider'

/** Shown on the dashboard when the account has no loved ones yet. */
export function EmptyFamily() {
  const { firstName } = useProfile()
  return (
    <section className="flex flex-col items-center rounded-lg border border-line bg-card px-6 py-12 text-center shadow-sm">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-green">
        <Users className="h-8 w-8" strokeWidth={1.5} />
      </span>
      <h2 className="mt-5 text-h3 text-ink">Let’s set up your family, {firstName}</h2>
      <p className="mt-2 max-w-sm text-body text-muted">
        Add the person you’re caring for to see their wellbeing, visits and updates right here.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/family/add">
          <UserPlus className="h-5 w-5" strokeWidth={2} /> Add your first family member
        </Link>
      </Button>
    </section>
  )
}
