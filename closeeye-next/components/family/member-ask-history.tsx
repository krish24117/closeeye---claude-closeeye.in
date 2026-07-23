'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { SectionTitle } from '@/components/family/section-title'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchAskHistoryForMember, type AskHistoryItem } from '@/lib/db/ask'
import { cn } from '@/lib/utils'

/** Strip the light markdown Ask answers use, for a short preview line. */
function preview(md: string | null, max = 150): string {
  if (!md) return ''
  const plain = md
    .replace(/[*_`#>]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? plain.slice(0, max).trimEnd() + '…' : plain
}

function askedWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * The Ask Close Eye Q&A the family has asked about THIS member, surfaced inside
 * their conversation so the AI history and the private care thread live in one
 * place — Connect's "one conversation" pillar. Renders nothing when there's no
 * history for this member, so it never adds noise to a fresh conversation.
 */
export function MemberAskHistory({ lovedOneId, firstName }: { lovedOneId: string; firstName: string }) {
  const { user } = useAuth()
  const [items, setItems] = React.useState<AskHistoryItem[] | null>(null)

  React.useEffect(() => {
    if (!user?.id) return
    fetchAskHistoryForMember(user.id, lovedOneId)
      .then(setItems)
      .catch(() => setItems([]))
  }, [user?.id, lovedOneId])

  if (!items || items.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Questions you’ve asked about {firstName}</SectionTitle>
        <Link href="/space/connect" className="shrink-0 text-caption font-semibold text-green hover:underline">
          Ask again →
        </Link>
      </div>
      <ul className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-sm">
        {items.map((q, i) => (
          <li key={q.id} className={cn(i > 0 && 'border-t border-line')}>
            <Link
              href="/space/connect"
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent-soft/30"
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold text-ink">{q.question}</p>
                {q.answer ? (
                  <p className="mt-0.5 line-clamp-2 text-caption leading-relaxed text-muted">{preview(q.answer)}</p>
                ) : (
                  <p className="mt-0.5 text-caption italic text-muted">Our care team is preparing a reply.</p>
                )}
                <p className="mt-1 text-caption text-muted/80">{askedWhen(q.createdAt)}</p>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
