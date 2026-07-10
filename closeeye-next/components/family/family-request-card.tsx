'use client'

import * as React from 'react'
import { MessageSquareHeart, Plus, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { addRequest, listRequests, removeRequest, type FamilyRequest } from '@/lib/family-requests'

/**
 * FamilyRequestCard — the family prepares gentle asks before the next visit. They
 * flow to the Guardian (Module 4) and the Presence Manager can review. Reusable;
 * client-only (shared request store).
 */
export function FamilyRequestCard({ memberName }: { memberName: string }) {
  const toast = useToast()
  const first = memberName.split(' ')[0]
  const [requests, setRequests] = React.useState<FamilyRequest[]>([])
  const [text, setText] = React.useState('')

  React.useEffect(() => {
    setRequests(listRequests(memberName))
  }, [memberName])

  const SUGGESTIONS = [
    `Remind ${first} about tomorrow’s appointment`,
    `Help ${first} video call me`,
    `Check whether ${first} finished lunch`,
    `Ask whether ${first} needs groceries`,
  ]

  function add(value: string) {
    const t = value.trim()
    if (!t) return
    addRequest(memberName, t)
    setRequests(listRequests(memberName))
    setText('')
    toast('Sent to the Guardian for the next visit.')
  }

  function remove(id: string) {
    removeRequest(id)
    setRequests(listRequests(memberName))
  }

  const unused = SUGGESTIONS.filter((s) => !requests.some((r) => r.text === s))

  return (
    <section className="rounded-lg border border-line/70 bg-card p-6 shadow-sm" aria-label="Requests for the next visit">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
          <MessageSquareHeart className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <div>
          <h2 className="text-h4">Ask for the next visit</h2>
          <p className="text-caption text-muted">Your Guardian sees these before they arrive.</p>
        </div>
      </div>

      {requests.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center gap-2.5 rounded-md border border-line bg-ivory px-3.5 py-2.5">
              <Check className="h-4 w-4 shrink-0 text-green" strokeWidth={2} />
              <span className="min-w-0 flex-1 text-body-sm text-ink">{r.text}</span>
              <span className="shrink-0 text-caption text-muted">{r.status === 'seen' ? 'Seen' : 'Sent'}</span>
              <button type="button" onClick={() => remove(r.id)} aria-label="Remove request" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {unused.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-card px-3 py-1.5 text-caption font-medium text-muted transition-colors hover:border-green/40 hover:text-green"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          add(text)
        }}
        className="mt-4 flex gap-2.5"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add your own request…"
          className="min-w-0 flex-1 rounded-sm border border-line bg-ivory px-3.5 py-2.5 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
        />
        <Button type="submit" size="sm" disabled={!text.trim()}>Add</Button>
      </form>
    </section>
  )
}
