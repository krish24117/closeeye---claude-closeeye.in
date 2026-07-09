'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, ShieldAlert, HeartPulse, Siren, Wrench, MessageCircle, Check } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { GuardianVisit } from '@/lib/guardian-data'
import { updateVisitFeedback } from '@/lib/db/guardian'
import { cn } from '@/lib/utils'
import { useVisit } from '../visit-state'

const ISSUES = [
  { id: 'safety', label: 'Safety concern', icon: ShieldAlert },
  { id: 'medical', label: 'Medical concern', icon: HeartPulse },
  { id: 'urgent', label: 'Urgent escalation', icon: Siren },
  { id: 'equipment', label: 'Equipment issue', icon: Wrench },
]

/** Screen 10 — a gentle post-visit check-in with the Guardian. All optional. */
export function PostStep({ visit }: { visit: GuardianVisit }) {
  const { rating, issues, reportId, dispatch } = useVisit()
  const toast = useToast()
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function finish() {
    setBusy(true)
    // Attach the (optional) rating + raised issues to the saved report.
    if (reportId && (rating > 0 || issues.length > 0)) {
      try {
        await updateVisitFeedback(reportId, { rating, issues })
      } catch {
        /* feedback is optional — never block the guardian from finishing */
      }
    }
    // Clear the offline draft; completion is tracked by the booking status now.
    try {
      localStorage.removeItem(`ce_guardian_visit_${visit.id}`)
    } catch {
      /* ignore */
    }
    toast('Everything has been saved. Thank you for caring today.')
    router.push('/guardian')
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="text-center">
        <h1 className="text-h2 text-ink">How did that feel?</h1>
        <p className="mt-2 text-body leading-relaxed text-muted">Your experience helps us support you better. Only if you’d like to.</p>
      </div>

      {/* Rating */}
      <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => dispatch({ type: 'rating', value: n })}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star className={cn('h-9 w-9 transition-colors', n <= rating ? 'fill-warning text-warning' : 'fill-transparent text-line')} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        {rating > 0 && <p className="text-body-sm text-muted">{rating >= 4 ? 'So glad it went well.' : 'Thank you — we’ll look into it with you.'}</p>}
      </div>

      {/* Issues */}
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-muted">Anything to raise? (optional)</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {ISSUES.map((i) => {
            const active = issues.includes(i.id)
            const Icon = i.icon
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => dispatch({ type: 'toggleIssue', id: i.id })}
                aria-pressed={active}
                className={cn(
                  'flex min-h-[3.25rem] items-center gap-2.5 rounded-md border px-4 text-body-sm font-semibold transition-colors',
                  active ? 'border-warning bg-warning/10 text-warning' : 'border-line bg-card text-ink hover:border-ink/25',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-warning' : 'text-green')} strokeWidth={1.75} /> {i.label}
              </button>
            )
          })}
        </div>
      </div>

      {issues.length > 0 && (
        <Button asChild variant="secondary" size="lg" className="w-full">
          <Link href="/guardian/messages">
            <MessageCircle className="h-5 w-5" strokeWidth={1.75} /> Message your Presence Manager about this
          </Link>
        </Button>
      )}

      <Button size="lg" className="w-full" onClick={finish} disabled={busy}>
        <Check className="h-5 w-5" strokeWidth={2} /> {busy ? 'Saving…' : 'Done for now'}
      </Button>
    </div>
  )
}
