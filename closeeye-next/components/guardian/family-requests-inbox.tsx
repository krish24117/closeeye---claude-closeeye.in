'use client'

import * as React from 'react'
import { MessageSquareHeart } from 'lucide-react'
import { listRequests, markRequestsSeen, type FamilyRequest } from '@/lib/family-requests'

/**
 * Family requests, seen by the Guardian on the visit brief. These are the gentle
 * asks the family prepared in Family Space (Module 3) — closing the loop back to
 * the Guardian. Client-only: reads the shared request store.
 */
export function FamilyRequestsInbox({ memberName }: { memberName: string }) {
  const [requests, setRequests] = React.useState<FamilyRequest[]>([])

  React.useEffect(() => {
    setRequests(listRequests(memberName))
    markRequestsSeen(memberName)
  }, [memberName])

  if (requests.length === 0) return null

  return (
    <section className="rounded-lg border border-accent/50 bg-accent-soft/40 p-5">
      <h2 className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-green">
        <MessageSquareHeart className="h-4 w-4" strokeWidth={1.75} /> The family asked
      </h2>
      <ul className="mt-2.5 flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex gap-2 text-body-sm leading-relaxed text-ink">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green" /> {r.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
