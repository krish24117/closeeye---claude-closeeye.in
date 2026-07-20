'use client'

import * as React from 'react'
import Link from 'next/link'
import { ShieldCheck, Loader2 } from 'lucide-react'

/**
 * The consent moment — shown once, immediately before Close Eye first processes a family's
 * information (Launch Readiness Phase 3, DPDP). By founder decision this reads as a TRUST PROMISE,
 * not legal acceptance: it reinforces the product promise at the first moment we ask for trust.
 * Recording the consent is the caller's job (recordConsent) — this is the respectful UI for it.
 */
export function ConsentPrompt({ onAgree }: { onAgree: () => void | Promise<void> }) {
  const [busy, setBusy] = React.useState(false)
  async function agree() {
    if (busy) return
    setBusy(true)
    try { await onAgree() } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-line/70 bg-card p-6 shadow-sm">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-green">
        <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-h4 text-ink">Before I answer questions about your family</h2>
      <p className="mt-3 text-body-sm leading-relaxed text-muted">
        Close Eye stores only the information you choose to share, so it can remember what matters and
        give you grounded answers over time.
      </p>
      <p className="mt-3 text-body-sm leading-relaxed text-muted">
        Your family’s information is <span className="font-semibold text-ink">private to you</span>, is
        <span className="font-semibold text-ink"> never sold</span>, and you can withdraw your consent or
        delete your data at any time.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={agree}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-body-sm font-semibold text-ivory transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> One moment…</> : 'I understand and agree'}
        </button>
        <Link href="/privacy" className="text-center text-caption font-semibold text-green hover:text-green/80">
          Learn more
        </Link>
      </div>
    </div>
  )
}
