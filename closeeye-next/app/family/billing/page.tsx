'use client'

/**
 * Legacy /family/billing — now redirects to /space/billing (Phase 4). Kept thin (rendering the
 * shared BillingView) as a defensive fallback if a redirect is ever bypassed; deleted in Phase 5.
 */
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { BillingView } from '@/components/family/billing-view'

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/family/profile" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to profile
      </Link>
      <PageHeader title="Billing & payments" subtitle="Your plan, renewals and receipts." />
      <BillingView />
    </div>
  )
}
