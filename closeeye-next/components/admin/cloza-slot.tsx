/**
 * Cloza's reserved rail home. Now that Cloza is live for the Founder (the Intelligence tab), this
 * slot links into it — one consistent entry point across the workspace. As other roles gain their
 * Cloza providers, this same slot points them to their own view; the placement never moves.
 */
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function ClozaSlot() {
  return (
    <Link href="/admin/founder/intelligence" className="block rounded-md border border-green/30 bg-accent-soft/40 p-3 transition-colors hover:border-green/50 hover:bg-accent-soft/60">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-inverse">
          <Sparkles className="h-3.5 w-3.5 text-accent-soft" strokeWidth={2} />
        </span>
        <p className="text-caption font-semibold text-ink">Ask Cloza</p>
      </div>
      <p className="mt-1.5 text-caption leading-relaxed text-muted">Your executive copilot — briefings and answers from live data.</p>
    </Link>
  )
}
