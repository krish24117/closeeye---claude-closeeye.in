import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import type { AIRecommendation } from '@/lib/console-data'
import { cn } from '@/lib/utils'

/**
 * AIRecommendationCard — the AI Operations Assistant, in human language. Proactive,
 * calm, never raw AI. Reusable.
 */
export function AIRecommendationCard({ rec }: { rec: AIRecommendation }) {
  const tint =
    rec.tone === 'warning' ? 'border-warning/30 bg-warning/[0.06]' : rec.tone === 'positive' ? 'border-success/25 bg-success/[0.06]' : 'border-line bg-card'
  const iconTone = rec.tone === 'warning' ? 'text-warning' : rec.tone === 'positive' ? 'text-success' : 'text-green'
  return (
    <div className={cn('flex gap-3 rounded-md border p-4', tint)}>
      <Sparkles className={cn('mt-0.5 h-4 w-4 shrink-0', iconTone)} strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm leading-relaxed text-ink">{rec.text}</p>
        {rec.action && (
          <Link href={rec.action.href} className="mt-1.5 inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">
            {rec.action.label} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
      </div>
    </div>
  )
}
