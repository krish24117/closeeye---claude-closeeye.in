/**
 * Billing (Owner: Billing, /space/billing). Membership summary + payment history + receipts —
 * the real page now (parity reached), rendering the shared BillingView. /family/billing redirects
 * here (Phase 4). Managing the plan / payment still lives at /family/membership until that
 * capability re-homes.
 */
import { BillingView } from '@/components/family/billing-view'

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 text-ink">Billing &amp; payments</h1>
      <BillingView />
    </div>
  )
}
