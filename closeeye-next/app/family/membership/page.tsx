import { Check, Gift, BadgeCheck } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { DownloadButton } from '@/components/family/download-button'
import { MEMBERSHIP, PRESENCE_MANAGER } from '@/lib/family-data'
import { brandedDocument } from '@/lib/download'
import { whatsappLink } from '@/lib/site'

function buildInvoice(inv: (typeof MEMBERSHIP.invoices)[number]): string {
  return brandedDocument(`Invoice ${inv.id}`, `
    <h1>Invoice ${inv.id}</h1>
    <p class="meta">${MEMBERSHIP.plan} membership · ${inv.dateLabel}</p>
    <div class="card">
      <div class="row"><span class="label">Plan</span><span>${MEMBERSHIP.plan} — up to ${MEMBERSHIP.visitsIncluded} visits / month</span></div>
      <div class="row"><span class="label">Billing date</span><span>${inv.dateLabel}</span></div>
      <div class="row"><span class="label">Status</span><span><strong>${inv.status}</strong></span></div>
      <div class="row"><span class="label">Amount</span><span><strong>${inv.amount}</strong></span></div>
    </div>
    <p>Thank you for trusting Close Eye with your family's care.</p>
  `)
}

export default function MembershipPage() {
  const pct = Math.round((MEMBERSHIP.visitsUsed / MEMBERSHIP.visitsIncluded) * 100)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Membership" subtitle="Your Close Eye plan, benefits and history." />

      {/* Status */}
      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-ink px-6 py-6 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-accent">
              <BadgeCheck className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-h4 text-white">{MEMBERSHIP.plan}</p>
              <p className="text-caption text-white/60">Member since {MEMBERSHIP.memberSince}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-1 text-caption font-semibold text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {MEMBERSHIP.status}
          </span>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
          <div>
            <p className="text-caption text-muted">Visits this month</p>
            <p className="mt-1 text-body font-semibold text-ink">
              {MEMBERSHIP.visitsUsed} of {MEMBERSHIP.visitsIncluded} used
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent-soft">
              <div className="h-full rounded-full bg-green" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3">
            <div>
              <p className="text-caption text-muted">Renewal</p>
              <p className="mt-1 text-body font-semibold text-ink">{MEMBERSHIP.renewalLabel}</p>
            </div>
            <Button asChild size="sm" className="self-start">
              <a href={whatsappLink(`Hi ${PRESENCE_MANAGER.name.split(' ')[0]} — I'd like to review or change our Close Eye plan.`)}>Manage plan</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section>
        <h2 className="text-h4">What&apos;s included</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {MEMBERSHIP.benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-md border border-line bg-card p-4 shadow-sm">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/12 text-success">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-body-sm text-ink">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Invoices */}
      <section>
        <h2 className="text-h4">Invoices</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          {MEMBERSHIP.invoices.map((inv, i) => (
            <div key={inv.id} className={`flex items-center justify-between gap-4 px-5 py-4 ${i > 0 ? 'border-t border-line' : ''}`}>
              <div>
                <p className="text-body-sm font-medium text-ink">{inv.id}</p>
                <p className="text-caption text-muted">{inv.dateLabel}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-body-sm font-semibold text-ink">{inv.amount}</span>
                <span className="rounded-full bg-success/12 px-2.5 py-0.5 text-caption font-medium text-success">{inv.status}</span>
                <DownloadButton iconOnly label={`Download invoice ${inv.id}`} filename={`close-eye-${inv.id}.html`} content={buildInvoice(inv)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Referral placeholder */}
      <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-line bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
            <Gift className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div>
            <p className="text-body font-semibold text-ink">Refer a family you love</p>
            <p className="text-body-sm text-muted">Referral rewards are coming soon — we&apos;ll let you know.</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" disabled>Coming soon</Button>
      </section>
    </div>
  )
}
