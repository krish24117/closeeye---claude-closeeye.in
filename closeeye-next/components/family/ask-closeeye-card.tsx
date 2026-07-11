'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldAlert, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { useLovedOnes } from '@/components/family/family-data-provider'
import { fetchAskHistory, type AskHistoryItem } from '@/lib/db/ask'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/gu
function plain(text: string, maxLen = 140): string {
  const s = text
    .replace(EMOJI_RE, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .trim()
  return s.length > maxLen ? `${s.slice(0, maxLen).trimEnd()}…` : s
}

interface Prompt {
  label: string
  href: string
  urgent?: boolean
}

/**
 * CloseEye Connect — the family's ongoing, living conversation with CloseEye.
 * Deliberately NOT a search box: it opens mid-relationship (the last exchange,
 * or a warm opener — never an empty field), offers context-aware follow-ups
 * (family / Presence Manager / visit / urgent), and keeps the input quiet at the
 * bottom. Reuses the existing design system + the live ask-health engine.
 */
export function AskCloseEyeCard({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'compact'
  className?: string
}) {
  const router = useRouter()
  const { user } = useAuth()
  const { lovedOnes } = useLovedOnes()
  const [last, setLast] = React.useState<AskHistoryItem | null>(null)
  const [loaded, setLoaded] = React.useState(false)
  const [text, setText] = React.useState('')

  React.useEffect(() => {
    if (!user?.id) {
      setLoaded(true)
      return
    }
    fetchAskHistory(user.id, 1)
      .then((h) => setLast(h[0] ?? null))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [user?.id])

  const primary = lovedOnes[0]
  const first = primary ? primary.full_name.trim().split(/\s+/)[0] : null
  const primaryId = primary?.id
  const askHref = (q: string) => `/family/connect/ask?q=${encodeURIComponent(q)}`
  const go = (q: string) => {
    const t = q.trim()
    router.push(t ? askHref(t) : '/family/connect/ask')
  }

  const prompts: Prompt[] = first
    ? [
        { label: `Tell me more about ${first}'s day`, href: askHref(`Tell me more about ${first}'s day`) },
        { label: `What made ${first} smile today?`, href: askHref(`What made ${first} smile today?`) },
        { label: 'Compare this week with last week', href: askHref(`How is ${first} doing this week compared with last week?`) },
        { label: 'Talk to my Presence Manager', href: primaryId ? `/family/connect/${primaryId}` : '/family/connect' },
        { label: 'Book another Presence', href: '/family/book' },
        { label: 'I need urgent help', href: primaryId ? `/family/connect/${primaryId}` : '/family/connect', urgent: true },
      ]
    : [
        { label: 'How does a Presence Visit work?', href: askHref('How does a Presence Visit work?') },
        { label: 'What can CloseEye help with?', href: askHref('What can CloseEye help with?') },
        { label: 'Talk to my Presence Manager', href: '/family/connect' },
        { label: 'Book a Presence', href: '/family/book' },
      ]
  const shown = variant === 'compact' ? prompts.slice(0, 4) : prompts

  return (
    <section className={cn('rounded-lg border border-green/20 bg-accent-soft/40 p-5 shadow-sm', className)}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green text-ivory">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-h4 text-ink">{SITE.name} Connect</h2>
          <p className="text-caption text-muted">Your ongoing conversation with {SITE.name}.</p>
        </div>
      </div>

      {/* Living conversation — the last exchange, or a warm opener. Never empty.
          Only replay a past exchange while a loved one is still in the family: once
          they're removed, the stored question may name them, so fall back to the
          (name-free) opener instead of resurfacing a deleted member. */}
      <div className="mt-4 flex flex-col gap-2.5">
        {loaded && last?.question && primary ? (
          <>
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-[16px_16px_4px_16px] bg-ink px-3.5 py-2 text-caption leading-relaxed text-ivory">
                {last.question}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green text-ivory">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <div className="max-w-[85%] rounded-[4px_16px_16px_16px] border border-line/70 bg-card px-3.5 py-2 text-caption leading-relaxed text-ink">
                {last.answer ? plain(last.answer) : 'Our care team will follow up shortly.'}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green text-ivory">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
            <div className="max-w-[90%] rounded-[4px_16px_16px_16px] border border-line/70 bg-card px-3.5 py-2 text-body-sm leading-relaxed text-ink">
              {first
                ? `I'm keeping an eye on ${first}. Ask me anything about their day — or just say hello.`
                : `I'm here for your family. Ask me anything about their care, or how ${SITE.name} works.`}
            </div>
          </div>
        )}
      </div>

      {/* Context-aware follow-ups — continue the conversation, don't start one. */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {shown.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => router.push(p.href)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-caption font-medium transition-colors',
              p.urgent
                ? 'border-error/40 bg-card text-error hover:bg-error/5'
                : 'border-line bg-card text-ink hover:border-green hover:text-green',
            )}
          >
            {p.urgent && <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} />}
            {p.label}
          </button>
        ))}
      </div>

      {/* Quiet input — present, never dominant. */}
      <div className="mt-3.5 flex items-center gap-2 rounded-full border border-line/70 bg-card px-3 py-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              go(text)
            }
          }}
          placeholder={first ? `Say something about ${first}…` : 'Say something to CloseEye…'}
          aria-label="Message CloseEye"
          className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-body-sm text-ink placeholder:text-muted/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => go(text)}
          aria-label="Open conversation"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-ivory transition-colors hover:bg-green-hover"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </section>
  )
}
