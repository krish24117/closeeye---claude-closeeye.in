'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Loader2, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { ErrorState } from '@/components/ui/states'
import { DownloadButton } from '@/components/family/download-button'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchMyBookingRequests } from '@/lib/db/family'
import { fetchMyMemberships } from '@/lib/db/onboarding'
import { planById } from '@/lib/plans'
import { formatMoney } from '@/lib/platform/currency'
import { DEFAULT_REGION_CODE, localeFor } from '@/lib/platform/regions'
import { brandedDocument } from '@/lib/download'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

interface Row {
  id: string
  title: string
  date: string | null
  amountPaise: number
  ref: string | null
}

const inr = (paise: number) => formatMoney(paise / 100, DEFAULT_REGION_CODE)
function fmt(iso: string | null, region: string = DEFAULT_REGION_CODE): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(localeFor(region), { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function receiptHtml(r: Row, who: string): string {
  return brandedDocument(`Receipt ${r.id.slice(0, 8).toUpperCase()}`, `
    <h1>Payment receipt</h1>
    <p class="meta">${SITE.name} · ${fmt(r.date)}</p>
    <div class="card">
      <div class="row"><span class="label">Paid by</span><span>${who}</span></div>
      <div class="row"><span class="label">For</span><span>${r.title}</span></div>
      ${r.ref ? `<div class="row"><span class="label">Payment ID</span><span>${r.ref}</span></div>` : ''}
      <div class="row"><span class="label">Amount</span><span><strong>${inr(r.amountPaise)}</strong></span></div>
      <div class="row"><span class="label">Status</span><span><strong>Paid</strong></span></div>
    </div>
    <p>Thank you for trusting ${SITE.name} with your family's care.</p>
  `)
}

export default function BillingPage() {
  const { user } = useAuth()
  const { subscription, identity, region } = useFamilyData()
  const [rows, setRows] = React.useState<Row[] | null>(null)
  const [error, setError] = React.useState(false)
  const plan = planById(subscription?.plan_id)

  const load = React.useCallback(() => {
    if (!user?.id) { setRows([]); setError(false); return }
    setError(false)
    Promise.all([fetchMyMemberships(user.id), fetchMyBookingRequests(user.id)])
      .then(([memberships, bookings]) => {
        const out: Row[] = [
          ...memberships.filter((m) => m.status === 'active').map((m) => ({ id: m.id, title: 'CloseEye membership', date: m.activated_at || m.created_at, amountPaise: m.amount_paise ?? 0, ref: m.razorpay_payment_id })),
          ...bookings.filter((b) => b.payment_status === 'paid' || b.status === 'paid').map((b) => ({ id: b.id, title: b.service_name || 'Visit', date: b.created_at, amountPaise: b.amount_paise ?? 0, ref: null })),
        ].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        setRows(out)
      })
      .catch(() => { setRows(null); setError(true) })
  }, [user?.id])

  React.useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <Link href="/family/profile" className="inline-flex items-center gap-1.5 text-caption font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to profile
      </Link>
      <PageHeader title="Billing & payments" subtitle="Your plan, renewals and receipts." />

      {/* Subscription summary */}
      {subscription && plan && (
        <section className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-ink px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-accent"><BadgeCheck className="h-5 w-5" strokeWidth={1.5} /></span>
              <div>
                <p className="text-caption text-white/60">Current plan</p>
                <p className="text-body font-semibold text-white">{plan.name}</p>
              </div>
            </div>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold', subscription.status === 'active' ? 'bg-success/20 text-accent' : 'bg-white/10 text-white/70')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', subscription.status === 'active' ? 'bg-success' : 'bg-white/50')} />
              {subscription.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 px-6 py-5 sm:grid-cols-3">
            {[
              { label: 'Next billing', value: fmt(subscription.next_billing_at, region) },
              { label: 'Total paid', value: inr(subscription.total_paid_paise ?? 0) },
              { label: 'Invoices', value: String(subscription.invoice_count ?? 0) },
            ].map((s) => (
              <div key={s.label}>
                <dt className="text-caption text-muted">{s.label}</dt>
                <dd className="mt-1 text-body font-semibold text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Receipts */}
      <section>
        <h2 className="text-h4">Payment history</h2>
        {error ? (
          <div className="mt-4">
            <ErrorState
              title="We couldn’t load your payments"
              message="Something interrupted the connection — nothing was lost. Please check your connection and try again."
              onRetry={load}
            />
          </div>
        ) : rows === null ? (
          <div className="mt-4 grid place-items-center rounded-lg border border-line/70 bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
        ) : rows.length === 0 ? (
          <section className="mt-4 flex flex-col items-center rounded-lg border border-line/70 bg-card px-6 py-12 text-center shadow-sm">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-green"><Receipt className="h-7 w-7" strokeWidth={1.5} /></span>
            <p className="mt-4 text-body font-semibold text-ink">No payments yet</p>
            <p className="mt-1 max-w-sm text-body-sm text-muted">Receipts for your membership and visits will appear here once a payment is made.</p>
          </section>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
            {rows.map((r, i) => (
              <div key={r.id} className={cn('flex items-center gap-4 px-5 py-4', i > 0 && 'border-t border-line')}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{r.title}</p>
                  <p className="text-caption text-muted">{fmt(r.date, region)}</p>
                </div>
                <span className="shrink-0 text-body-sm font-semibold text-ink">{inr(r.amountPaise)}</span>
                <DownloadButton iconOnly label="Download receipt" filename={`close-eye-receipt-${r.id.slice(0, 8)}.html`} content={receiptHtml(r, identity.fullName)} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
