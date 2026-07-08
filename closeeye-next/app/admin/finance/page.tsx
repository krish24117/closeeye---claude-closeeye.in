import { FileText } from 'lucide-react'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { DownloadButton } from '@/components/family/download-button'
import { brandedDocument } from '@/lib/download'
import { FINANCE_SUMMARY, INVOICES, REFUNDS, PAYOUTS, fmtINR, type Invoice } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const INV_TONE: Record<Invoice['status'], string> = {
  paid: 'bg-success/12 text-success', pending: 'bg-warning/12 text-warning', failed: 'bg-error/10 text-error',
}

function financeDoc() {
  const row = (l: string, v: string) => `<div class="row"><span class="label">${l}</span><span>${v}</span></div>`
  return brandedDocument('Finance summary — this month', `
    <h1>Finance summary</h1><p class="meta">This month · Close Eye</p>
    <div class="card">${row('Gross revenue', fmtINR(FINANCE_SUMMARY.grossRevenue, false))}${row('Refunds issued', fmtINR(FINANCE_SUMMARY.refundsIssued, false))}${row('Net revenue', fmtINR(FINANCE_SUMMARY.netRevenue, false))}${row('GST (18%)', fmtINR(FINANCE_SUMMARY.gst, false))}${row('Payouts due', fmtINR(FINANCE_SUMMARY.payoutsDue, false))}${row('Collection rate', FINANCE_SUMMARY.collectionRate)}</div>`)
}

export default function FinancePage() {
  const summary = [
    { label: 'Gross revenue', value: fmtINR(FINANCE_SUMMARY.grossRevenue) },
    { label: 'Refunds issued', value: fmtINR(FINANCE_SUMMARY.refundsIssued) },
    { label: 'Net revenue', value: fmtINR(FINANCE_SUMMARY.netRevenue) },
    { label: 'GST (18%)', value: fmtINR(FINANCE_SUMMARY.gst) },
    { label: 'Payouts due', value: fmtINR(FINANCE_SUMMARY.payoutsDue) },
    { label: 'Collection rate', value: FINANCE_SUMMARY.collectionRate },
  ]
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Finance</h1>
          <p className="mt-1.5 text-body leading-relaxed text-muted">Revenue, invoices, refunds, payouts and taxes — this month.</p>
        </div>
        <DownloadButton variant="secondary" label="Export summary" filename="close-eye-finance.html" content={financeDoc()} />
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {summary.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <p className="text-h3 leading-none text-ink">{s.value}</p>
            <p className="mt-1.5 text-caption text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <RevenueChart />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoices */}
        <section className="lg:col-span-2 overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-h4">Recent invoices</h2>
            <span className="text-caption text-muted">Razorpay</span>
          </div>
          <ul className="divide-y divide-line">
            {INVOICES.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-20 shrink-0 text-caption font-semibold text-muted">{inv.id}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-medium text-ink">{inv.family}</span><span className="block text-caption text-muted">{inv.plan} · {inv.date}</span></span>
                <span className="shrink-0 text-body-sm font-semibold text-ink">{fmtINR(inv.amount, false)}</span>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', INV_TONE[inv.status])}>{inv.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          {/* Refunds */}
          <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            <h2 className="border-b border-line px-5 py-4 text-h4">Refunds</h2>
            <ul className="divide-y divide-line">
              {REFUNDS.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-medium text-ink">{r.family}</span><span className="block text-caption text-muted">{r.reason}</span></span>
                  <span className="shrink-0 text-body-sm font-semibold text-ink">{fmtINR(r.amount, false)}</span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', r.status === 'pending' ? 'bg-warning/12 text-warning' : 'bg-success/12 text-success')}>{r.status}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Payouts */}
          <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            <h2 className="border-b border-line px-5 py-4 text-h4">Care team payouts</h2>
            <ul className="divide-y divide-line">
              {PAYOUTS.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-medium text-ink">{p.who}</span><span className="block text-caption text-muted">{p.role}</span></span>
                  <span className="shrink-0 text-body-sm font-semibold text-ink">{fmtINR(p.amount, false)}</span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', p.status === 'scheduled' ? 'bg-accent-soft text-green' : 'bg-success/12 text-success')}>{p.status}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Taxes & exports */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
        <div>
          <h2 className="flex items-center gap-2 text-h4"><FileText className="h-5 w-5 text-green" strokeWidth={1.5} /> Taxes &amp; exports</h2>
          <p className="mt-1 text-caption text-muted">GST filed monthly · GSTIN 36ABCDE1234F1Z5 · exports ready for your accountant.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <DownloadButton variant="secondary" label="Invoices (CSV)" filename="close-eye-invoices.html" content={brandedDocument('Invoices export', '<h1>Invoices export</h1><p class="meta">Generated for your accountant</p>')} />
          <DownloadButton variant="secondary" label="GST report" filename="close-eye-gst.html" content={brandedDocument('GST report', '<h1>GST report</h1><p class="meta">18% · this month</p>')} />
        </div>
      </section>
    </div>
  )
}
