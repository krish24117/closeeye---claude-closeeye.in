'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Lock, MessageCircle, Search } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { EmptyState } from '@/components/ui/states'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchGuardianThreadsAsAdmin, type GuardianThread, type GuardianMessage } from '@/lib/db/guardian-messages'
import { canUseConsole } from '@/lib/roles'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'awaiting'

function preview(m: GuardianMessage): string {
  const mine = m.sender === 'closeeye' ? 'You: ' : ''
  if (m.body) return mine + m.body
  if (m.attachment_type === 'image') return mine + 'Photo'
  if (m.attachment_type === 'pdf') return mine + 'Document'
  if (m.attachment_type === 'audio') return mine + 'Voice note'
  return mine + 'Message'
}

function rowTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function ConsoleGuardianMessagesPage() {
  const { profile, loading } = useFamilyData()
  const isStaff = canUseConsole(profile)
  const [threads, setThreads] = React.useState<GuardianThread[] | null>(null)
  const [filter, setFilter] = React.useState<Filter>('all')
  const [q, setQ] = React.useState('')

  React.useEffect(() => {
    if (!isStaff) return
    fetchGuardianThreadsAsAdmin()
      .then(setThreads)
      .catch(() => setThreads([]))
  }, [isStaff])

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  }

  if (!isStaff) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-h2">Guardian messages</h1>
        <EmptyState icon={Lock} title="Restricted" hint="This inbox is only available to Close Eye team members." />
      </div>
    )
  }

  const query = q.trim().toLowerCase()
  const list = (threads ?? [])
    .filter((t) => (filter === 'awaiting' ? t.awaitingReply : true))
    .filter((t) => (query ? `${t.guardianName} ${t.guardianCity ?? ''} ${t.lastMessage.body ?? ''}`.toLowerCase().includes(query) : true))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Guardian messages</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Stay in touch with the Guardians serving your families.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[12rem] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Guardians…"
            className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {([['all', 'All'], ['awaiting', 'Awaiting reply']] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors',
                filter === key ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {threads === null ? (
        <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={threads.length === 0 ? 'No conversations yet' : 'Nothing here'}
          hint={
            threads.length === 0
              ? 'A Guardian conversation appears here as soon as one of them writes in.'
              : 'No conversations match your search or filter.'
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
          {list.map((t) => (
            <li key={t.companionId}>
              <Link
                href={`/pm/guardian-messages/${t.companionId}`}
                className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-accent-soft/30"
              >
                <Avatar initials={initialsOf(t.guardianName)} size="sm" tone="solid" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-semibold text-ink">
                    {t.guardianName}
                    {t.guardianCity && <span className="font-normal text-muted"> · {t.guardianCity}</span>}
                  </span>
                  <span className={cn('block truncate text-caption', t.awaitingReply ? 'font-medium text-ink' : 'text-muted')}>
                    {preview(t.lastMessage)}
                  </span>
                </span>
                <span className="shrink-0 text-caption text-muted">{rowTime(t.lastMessage.created_at)}</span>
                <span
                  className={cn('h-2 w-2 shrink-0 rounded-full', t.awaitingReply ? 'bg-warning' : 'bg-success')}
                  aria-label={t.awaitingReply ? 'awaiting reply' : 'replied'}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
