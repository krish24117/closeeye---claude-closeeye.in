'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Send } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import {
  fetchGuardianThread,
  markGuardianThreadRead,
  sendGuardianMessage,
  subscribeToGuardianThread,
  type GuardianMessage,
} from '@/lib/db/guardian-messages'
import { cn } from '@/lib/utils'

type Status = 'loading' | 'ready' | 'error'

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** The guardian's seat: their own messages sit right (green); the care team's left. */
function Bubble({ m }: { m: GuardianMessage }) {
  const mine = m.sender === 'guardian'
  return (
    <div className={cn('flex max-w-[82%] flex-col gap-1', mine ? 'items-end self-end' : 'items-start self-start')}>
      {!mine && <span className="px-1 text-caption font-semibold text-green">Presence Manager</span>}
      <div
        className={cn(
          'rounded-lg px-3.5 py-2.5 text-body-sm',
          mine ? 'rounded-br-sm bg-green text-ivory' : 'rounded-bl-sm bg-accent-soft/60 text-ink',
        )}
      >
        {m.body && <span className="whitespace-pre-wrap break-words">{m.body}</span>}
      </div>
      <span className="px-1 text-[0.7rem] text-muted">{timeLabel(m.created_at)}</span>
    </div>
  )
}

/** The guardian's single conversation with their Presence Manager / care team. */
export function GuardianMessageThread({ companionId }: { companionId: string }) {
  const toast = useToast()
  const [messages, setMessages] = useState<GuardianMessage[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const addMessage = useCallback((m: GuardianMessage) => {
    setMessages((prev) =>
      prev.some((x) => x.id === m.id) ? prev : [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    )
  }, [])

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const rows = await fetchGuardianThread(companionId)
      setMessages(rows)
      setStatus('ready')
      void markGuardianThreadRead(companionId).catch(() => {})
    } catch {
      setStatus('error')
    }
  }, [companionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const unsub = subscribeToGuardianThread(companionId, (m) => {
      addMessage(m)
      if (m.sender !== 'guardian') void markGuardianThreadRead(companionId).catch(() => {})
    })
    return unsub
  }, [companionId, addMessage])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const created = await sendGuardianMessage(companionId, body)
      addMessage(created)
      setDraft('')
    } catch {
      toast('Your message didn’t send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[24rem] flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft"><LogoMark className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">Your care team</p>
          <p className="truncate text-caption text-muted">Presence Manager &amp; Operations</p>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === 'loading' ? (
          <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
        ) : status === 'error' ? (
          <div className="grid h-full place-items-center px-5"><ErrorState onRetry={() => void load()} message="We couldn’t load your messages. Please try again." /></div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center px-5">
            <EmptyState icon={MessageCircle} title="No messages yet" hint="Message your Presence Manager about a visit, a schedule change, or anything you need." />
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-5 py-6">
            {messages.map((m, i) => {
              const prev = messages[i - 1]
              const showDay = !prev || dayLabel(prev.created_at) !== dayLabel(m.created_at)
              return (
                <Fragment key={m.id}>
                  {showDay && (
                    <div className="flex justify-center py-1">
                      <span className="rounded-full bg-ink/[0.05] px-3 py-1 text-caption font-medium text-muted">{dayLabel(m.created_at)}</span>
                    </div>
                  )}
                  {m.sender === 'system' ? (
                    <div className="mx-auto max-w-[90%] px-2 text-center text-caption leading-relaxed text-muted">{m.body}</div>
                  ) : (
                    <Bubble m={m} />
                  )}
                </Fragment>
              )
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message your Presence Manager…"
            aria-label="Message"
            className="h-11 flex-1 rounded-full border border-line bg-ivory px-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!draft.trim() || sending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-ivory transition-opacity disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : <Send className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </div>
      </form>
    </div>
  )
}
