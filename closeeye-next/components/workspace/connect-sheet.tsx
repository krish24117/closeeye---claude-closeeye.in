'use client'

/**
 * The Connect sheet — the orb's fast lane (A+C hybrid, founder-approved 2026-07-21; presence
 * polish 2026-07-21).
 *
 * ONE clear intent model: you ASK (the hero field + real, family-drawn suggestions), or you ADD
 * (a single "＋ Add" for a photo/document). "Start a conversation" is retired — every question
 * seeds the real engine at /space/connect and simply becomes a continuable thread.
 *
 * Presence: the sheet now opens AS Connect, not as a search box — a small Close Eye orb (echoing
 * the dock orb, gently breathing) and a warm, personal line naming the people it knows. So tapping
 * the orb feels like reaching your family's companion. Suggestions and the Continue card are ONLY
 * shown from real family + history data — we never render an invented person or question.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, Plus, Sparkles, Clock, ChevronRight } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchAskHistory, type AskHistoryItem } from '@/lib/db/ask'
import { titleCase } from '@/lib/family/relationship-words'

/** Mid-sentence subject for a suggestion: "your mother" stays whole; a real name gives its first word. */
function subj(fullName?: string | null, relationship?: string | null): string {
  const f = (fullName || '').trim()
  if (/^your\s/i.test(f)) return f.toLowerCase()
  return f.split(/\s+/)[0] || (relationship || 'them')
}
/** Display name for the warm header: "Your Mother" → "Mother"; a real name → its first word. */
function dispName(fullName?: string | null, relationship?: string | null): string {
  const f = (fullName || '').trim()
  if (/^your\s/i.test(f)) return titleCase(f.replace(/^your\s+/i, ''))
  return f.split(/\s+/)[0] || (relationship ? titleCase(relationship) : 'them')
}
const TEMPLATES = [
  (n: string) => `How has ${n} been recently?`,
  (n: string) => `What medicines is ${n} taking?`,
  (n: string) => `Who’s nearby if ${n} needs someone?`,
]

export function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const { user } = useAuth()
  const { lovedOnes } = useFamilyData()
  const [q, setQ] = React.useState('')
  const [last, setLast] = React.useState<AskHistoryItem | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 80)
      if (user) fetchAskHistory(user.id, 1).then((r) => setLast(r[0] ?? null)).catch(() => {})
      return () => window.clearTimeout(t)
    }
    setQ(''); setLast(null)
  }, [open, user])

  function go(href: string) { onClose(); router.push(href) }
  function ask(text?: string) {
    const t = (text ?? q).trim()
    go(t ? `/space/connect?q=${encodeURIComponent(t)}` : '/space/connect')
  }

  // Suggestions — real questions about the actual people (kills the blank box). 1 person → three
  // varied; more → one per person. Empty until the family adds someone; never invented.
  const suggestions: string[] =
    lovedOnes.length === 1
      ? TEMPLATES.map((t) => t(subj(lovedOnes[0]!.full_name, lovedOnes[0]!.relationship)))
      : lovedOnes.slice(0, 3).map((p, i) => TEMPLATES[i % TEMPLATES.length]!(subj(p.full_name, p.relationship)))

  // Warm, personal header line — names the people Connect actually knows, never invented.
  const names = lovedOnes.map((l) => dispName(l.full_name, l.relationship))
  const suffix = names.length === 1 ? ` about ${names[0]}`
    : names.length === 2 ? ` about ${names[0]} and ${names[1]}`
    : ''
  const title = `What’s on your mind${suffix}?`

  const lastName = last?.lovedOneId ? (lovedOnes.find((l) => l.id === last.lovedOneId)?.full_name || '').trim().split(/\s+/)[0] : ''
  // ＋ Add goes straight to capture when there's one person; otherwise pick who first.
  const addHref = lovedOnes.length === 1 ? `/space/people/${lovedOnes[0]!.id}/memories/add` : '/space/people'

  return (
    <Overlay open={open} onClose={onClose}>
      <div className="p-5 pb-7">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-edge" aria-hidden />

        {/* Presence — the orb you tapped, now here, and a warm line naming who it knows */}
        <div className="mb-5 flex flex-col items-center text-center">
          <motion.div
            initial={reduce ? false : { scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="grid h-12 w-12 place-items-center rounded-full bg-surface-inverse shadow-md"
          >
            <motion.span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full bg-brand"
              animate={reduce ? {} : { scale: [1, 1.28, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
          <h2 className="mt-3 text-h4 text-content">{title}</h2>
        </div>

        {/* Continue — resume the last thread (only with real history) */}
        {last && (
          <button type="button" onClick={() => go('/space/connect')} className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-edge bg-surface p-3.5 text-start transition-colors hover:border-brand/40">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-accent text-brand"><Clock className="h-4 w-4" strokeWidth={1.75} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-semibold text-content">Continue{lastName ? ` about ${lastName}` : ' your conversation'}</span>
              <span className="block truncate text-caption text-content-muted">“{last.question}”</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={1.75} />
          </button>
        )}

        {/* Ask — the hero. Seeds the real engine at /space/connect. */}
        <div className="wsp-askfield">
          <label htmlFor="orb-ask" className="sr-only">Ask about your family</label>
          <input
            ref={inputRef}
            id="orb-ask"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask() } }}
            placeholder="Ask anything…"
            enterKeyHint="send"
            autoComplete="off"
          />
          <button type="button" onClick={() => ask()} aria-label="Ask" disabled={!q.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-30">
            <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Suggestions — real, tappable questions about the family */}
        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="flex items-center gap-2.5 rounded-xl bg-surface-accent/60 px-3.5 py-2.5 text-start text-body-sm text-content transition-colors hover:bg-surface-accent">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} /><span className="min-w-0">{s}</span>
              </button>
            ))}
          </div>
        )}

        {/* ＋ Add — one calm door for a memory or a document */}
        <button type="button" onClick={() => go(addHref)} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-edge bg-surface p-3.5 text-start transition-colors hover:border-brand/40">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-accent text-brand"><Plus className="h-4 w-4" strokeWidth={2} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-semibold text-content">Add a photo or document</span>
            <span className="block text-caption text-content-muted">A memory, a report or a prescription</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={1.75} />
        </button>
      </div>
    </Overlay>
  )
}
