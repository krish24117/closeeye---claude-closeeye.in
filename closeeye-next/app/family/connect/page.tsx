'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, Loader2, MessageCircle, UserPlus } from 'lucide-react'
import { DEFAULT_REGION_CODE, localeFor } from '@/lib/platform/regions'
import { Greeting } from '@/components/family/greeting'
import { SectionTitle } from '@/components/family/section-title'
import { Avatar } from '@/components/family/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { initialsOf } from '@/components/family/loved-one-card'
import { AskCloseEyeCard } from '@/components/family/ask-closeeye-card'
import { useAuth } from '@/components/auth/auth-provider'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { fetchSystemUpdates, fetchThreadSummaries, type ThreadSummary } from '@/lib/db/messages'
import { getLocalPhoto } from '@/lib/local-photos'
import type { LovedOne, Message } from '@/lib/db/types'
import { cn } from '@/lib/utils'

/**
 * CloseEye Connect — the family's single place to communicate with CloseEye.
 * Ask CloseEye sits first; below it, the private per-member care conversations
 * (each family member keeps an independent timeline — reused as-is).
 */
export default function ConnectHome() {
  const { user } = useAuth()
  const { lovedOnes, loading, error, refresh } = useLovedOnes()
  const [summaries, setSummaries] = React.useState<Map<string, ThreadSummary> | null>(null)
  const [updates, setUpdates] = React.useState<Message[]>([])

  React.useEffect(() => {
    if (!user?.id) {
      setSummaries(new Map())
      setUpdates([])
      return
    }
    fetchThreadSummaries(user.id)
      .then(setSummaries)
      .catch(() => setSummaries(new Map()))
    fetchSystemUpdates(user.id)
      .then(setUpdates)
      .catch(() => {})
  }, [user?.id])

  return (
    <div className="flex flex-col gap-8">
      <Greeting subtitle="Everything about the people you love, in one calm place." />

      <AskCloseEyeCard />

      {updates.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle>Care updates</SectionTitle>
          <ul className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
            {updates.map((u, i) => (
              <li key={u.id} className={cn(i > 0 && 'border-t border-line')}>
                <Link
                  href={u.related_booking_id ? `/family/visits/${u.related_booking_id}` : `/family/connect/${u.loved_one_id}`}
                  className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-accent-soft/30"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
                    <Bell className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm leading-relaxed text-ink">{u.body}</p>
                    <p className="mt-0.5 text-caption text-muted">{rowTime(u.created_at, lovedOnes[0]?.region_code || DEFAULT_REGION_CODE)}{u.related_booking_id ? ' · View the Presence Story →' : ''}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <SectionTitle>Conversations</SectionTitle>
        {error ? (
          <ErrorState
            title="We couldn’t load your conversations"
            message="Something interrupted the connection — nothing was lost. Please check your connection and try again."
            onRetry={() => void refresh()}
          />
        ) : loading ? (
          <div className="grid place-items-center rounded-lg border border-line/70 bg-card py-16 shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} />
          </div>
        ) : lovedOnes.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No one added yet"
            hint="Add someone you love, and Close Eye starts holding everything that matters about them — ready the moment you ask."
            action={
              <Button asChild>
                <Link href="/family/members">
                  <UserPlus className="h-5 w-5" strokeWidth={1.75} /> Add a family member
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-md">
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
  if (m.attachment_type === 'audio') return who + 'Voice note'
  return who + 'Message'
}

function rowTime(iso: string | undefined, region: string = DEFAULT_REGION_CODE): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString(localeFor(region), { hour: 'numeric', minute: '2-digit', hour12: true })
    : d.toLocaleDateString(localeFor(region), { day: 'numeric', month: 'short' })
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
            <span className="shrink-0 text-caption text-muted">{rowTime(summary?.lastMessage?.created_at, lo.region_code || DEFAULT_REGION_CODE)}</span>
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
