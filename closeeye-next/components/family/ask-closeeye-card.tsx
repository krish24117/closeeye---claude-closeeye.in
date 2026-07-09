'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Textarea } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/choice'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'My mother has fever',
  'Book a Guardian Visit',
  'Explain this blood report',
  'My father missed his BP medicine',
]

/**
 * Ask CloseEye entry card — the family's front door to AI wellbeing guidance.
 * `full` (Connect Home) shows suggestion chips; `compact` (Home dashboard) is a
 * tighter prompt. Both route into the conversation with the question queued.
 */
export function AskCloseEyeCard({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'compact'
  className?: string
}) {
  const router = useRouter()
  const [text, setText] = React.useState('')

  const go = React.useCallback(
    (q: string) => {
      const question = q.trim()
      router.push(`/family/connect/ask${question ? `?q=${encodeURIComponent(question)}` : ''}`)
    },
    [router],
  )

  return (
    <section className={cn('rounded-lg border border-green/20 bg-accent-soft/40 p-5 shadow-sm', className)}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green text-ivory">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-h4 text-ink">Ask CloseEye</h2>
          <p className="text-caption text-muted">How can we help your family today?</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              go(text)
            }
          }}
          placeholder="Ask anything about your family's health, care or wellbeing…"
          rows={variant === 'compact' ? 2 : 3}
          className="min-h-[3.25rem] bg-card"
          aria-label="Ask CloseEye"
        />

        {variant === 'full' && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Chip key={s} onClick={() => go(s)} className="px-3.5 py-2 text-caption">
                {s}
              </Chip>
            ))}
          </div>
        )}

        <Button
          size="md"
          className="w-full sm:w-auto sm:self-start"
          disabled={!text.trim()}
          onClick={() => go(text)}
        >
          Start Conversation <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>

      <p className="mt-3 text-caption text-muted">Guided by our care team · general guidance, not a diagnosis.</p>
    </section>
  )
}
