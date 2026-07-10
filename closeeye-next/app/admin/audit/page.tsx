import { ScrollText } from 'lucide-react'

export default function AuditPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Audit log</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Every operational action — who did it and when.</p>
      </div>

      <div className="flex items-start gap-4 rounded-lg border border-dashed border-line bg-card/60 p-6">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink/[0.04] text-muted"><ScrollText className="h-5 w-5" strokeWidth={1.75} /></span>
        <div>
          <p className="text-body font-semibold text-ink">A unified audit trail is coming soon</p>
          <p className="mt-1 text-body-sm leading-relaxed text-muted">
            There is no company-wide audit table yet. The real signals already exist — booking status changes (with who &amp; when in
            <span className="font-medium text-ink"> booking_status_history</span>), system care updates and message activity — and a single, filterable log will read from them here.
          </p>
        </div>
      </div>
    </div>
  )
}
