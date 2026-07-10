import { FileText } from 'lucide-react'

export default function ContentPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Content</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Website copy, FAQs, email &amp; SMS templates and legal pages.</p>
      </div>

      <div className="flex items-start gap-4 rounded-lg border border-dashed border-line bg-card/60 p-6">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink/[0.04] text-muted"><FileText className="h-5 w-5" strokeWidth={1.75} /></span>
        <div>
          <p className="text-body font-semibold text-ink">A content workspace is coming soon</p>
          <p className="mt-1 text-body-sm leading-relaxed text-muted">
            Today the website copy, FAQs, notification templates and legal pages live in the codebase — there is no content/CMS table to edit against yet.
            When one is added, they&apos;ll be manageable here without a deploy.
          </p>
        </div>
      </div>
    </div>
  )
}
