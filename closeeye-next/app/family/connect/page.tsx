'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, MessageCircle, UserPlus } from 'lucide-react'
import { Greeting } from '@/components/family/greeting'
import { SectionTitle } from '@/components/family/section-title'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { initialsOf } from '@/components/family/loved-one-card'
import { AskCloseEyeCard } from '@/components/family/ask-closeeye-card'
import { useAuth } from '@/components/auth/auth-provider'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { fetchThreadSummaries, type ThreadSummary } from '@/lib/db/messages'
import { getLocalPhoto } from '@/lib/local-photos'
import type { LovedOne } from '@/lib/db/types'
import { cn } from '@/lib/utils'

/**
 * CloseEye Connect — the family's single place to communicate with CloseEye.
 * Ask CloseEye sits first; below it, the private per-member care conversations
 * (each family member keeps an independent timeline — reused as-is).
 */
export default function ConnectHome() {
  const { user } = useAuth()
  const { lovedOnes, loading } = useLovedOnes()
  const [summaries, setSummaries] = React.useState<Map<string, ThreadSummary> | null>(null)

  React.useEffect(() => {
    if (!user?.id) {
      setSummaries(new Map())
      return
    }
    fetchThreadSummaries(user.id)
      .then(setSummaries)
      .catch(() => setSummaries(new Map()))
  }, [user?.id])

  return (
    <div className="flex flex-col gap-8">
      <Greeting subtitle="Stay connected with your family and your CloseEye Care Team." />

      <AskCloseEyeCard />

      <section className="flex flex-col gap-4">
        <SectionTitle>Conversations</SectionTitle>
        {loading ? (
          <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
          </div>
        ) : lovedOnes.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            hint="Add a family member to open a private care conversation with your CloseEye team."
            action={
              <Button asChild>
                <Link href="/family/members">
                  <UserPlus className="h-5 w-5" strokeWidth={1.75} /> Add a family member
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            {lovedOnes.map((lo, i) => (
              <MemberRow key={lo.id} lo={lo} summary={summaries?.get(lo.id)} loading={summaries === null} border={i > 0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function preview(s: ThreadSummary | undefined): string {
  const m = s?.lastMessage
  if (!m) return 'No messages yet — say hello'
  const who = m.sender === 'family' ? 'You: ' : ''
  if (m.body) return who + m.body
  if (m.attachment_type === 'image') return who + 'Photo'
  if (m.attachment_type === 'pdf') return who + 'Document'
  return who + 'Message'
}

function rowTime(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function MemberRow({ lo, summary, loading, border }: { lo: LovedOne; summary?: ThreadSummary; loading: boolean; border: boolean }) {
  const [photo, setPhoto] = React.useState<string | null>(null)
  React.useEffect(() => setPhoto(getLocalPhoto(lo.id)), [lo.id])
  const unread = summary?.unread ?? 0

  return (
    <li className={cn(border && 'border-t border-line')}>
      <Link href={`/family/connect/${lo.id}`} className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-accent-soft/30">
        <Avatar initials={initialsOf(lo.full_name)} src={photo} alt={lo.full_name} size="md" tone="solid" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className={cn('truncate text-body-sm text-ink', unread > 0 ? 'font-bold' : 'font-semibold')}>{lo.full_name}</p>
            <span className="shrink-0 text-caption text-muted">{rowTime(summary?.lastMessage?.created_at)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <p className={cn('truncate text-caption', unread > 0 ? 'font-medium text-ink' : 'text-muted')}>
              {loading ? '…' : preview(summary)}
            </p>
            {unread > 0 && (
              <span className="grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded-full bg-green px-1.5 text-[0.7rem] font-bold text-ivory">
                {unread}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}
