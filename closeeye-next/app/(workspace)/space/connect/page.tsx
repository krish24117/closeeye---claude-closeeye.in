'use client'

/**
 * Connect (Owner: Connect, /space/connect). The product's conversational intelligence inside the
 * Workspace — NOT a generic "Ask": talking to Close Eye IS Connect. Reuses the rich conversation
 * (AskCloseEyeConversation — LLM via ask-health, region-aware emergency escalation, history via
 * member_queries). Works here because AppShell mounts FamilyDataProvider for /space/*.
 *
 * Suggested questions seed a fresh conversation (remount with initialQuestion → auto-sends).
 */
import * as React from 'react'
import { AskCloseEyeConversation } from '@/components/family/ask-closeeye-conversation'

const SUGGESTIONS = [
  'How is my family doing?',
  'What should I be keeping an eye on?',
  'Help me arrange a visit',
]

export default function AskPage() {
  const [seed, setSeed] = React.useState<string | undefined>(undefined)
  const [runKey, setRunKey] = React.useState(0)

  function ask(q: string) {
    setSeed(q)
    setRunKey((k) => k + 1) // remount the conversation so initialQuestion fires
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-ink">Connect</h1>
        <p className="mt-1 text-body-sm text-muted">Your family’s intelligence — ask about anyone you love.</p>
      </div>

      {!seed && (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-semibold uppercase tracking-widest text-muted">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line bg-card px-3.5 py-2 text-caption font-medium text-ink transition-colors hover:border-green/40 hover:text-green">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <AskCloseEyeConversation key={runKey} initialQuestion={seed} />
    </div>
  )
}
