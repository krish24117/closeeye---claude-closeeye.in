'use client'

import { useState } from 'react'
import { Send, Paperclip, Mic, Image as ImageIcon } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { PhotoTiles } from '@/components/family/photo-tiles'
import { VoiceNoteInline } from '@/components/family/voice-note'
import { whatsappLink } from '@/lib/site'
import { MESSAGES, PRESENCE_MANAGER, CURRENT_USER, type Message } from '@/lib/family-data'
import { cn } from '@/lib/utils'

export function MessagesThread() {
  const [messages, setMessages] = useState<Message[]>(MESSAGES)
  const [draft, setDraft] = useState('')

  function send(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setMessages((m) => [
      ...m,
      { id: `local-${m.length}`, from: 'family', author: CURRENT_USER.firstName, kind: 'text', text, timeLabel: 'Just now' },
    ])
    setDraft('')
  }

  function sendVoice() {
    setMessages((m) => [
      ...m,
      { id: `voice-${m.length}`, from: 'family', author: CURRENT_USER.firstName, kind: 'voice', text: 'Voice note', timeLabel: 'Just now' },
    ])
  }

  return (
    <div className="flex min-h-[60vh] flex-col overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <Avatar initials={PRESENCE_MANAGER.initials} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold text-ink">{PRESENCE_MANAGER.name}</p>
          <p className="text-caption text-muted">{PRESENCE_MANAGER.responseTime}</p>
        </div>
        <a
          href={whatsappLink('Hi Priya — a quick note about the family.')}
          className="text-caption font-semibold text-green hover:underline"
        >
          Continue on WhatsApp
        </a>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6">
        {messages.map((m) => {
          const mine = m.from === 'family'
          return (
            <div key={m.id} className={cn('flex max-w-[80%] flex-col gap-1', mine ? 'items-end self-end' : 'items-start self-start')}>
              <div
                className={cn(
                  'rounded-lg px-4 py-2.5 text-body-sm',
                  mine ? 'rounded-br-sm bg-green text-ivory' : 'rounded-bl-sm bg-accent-soft/60 text-ink',
                )}
              >
                {m.kind === 'voice' ? (
                  <VoiceNoteInline duration={24} mine={mine} />
                ) : m.kind === 'photo' ? (
                  <span className="flex flex-col gap-2">
                    {m.text}
                    <PhotoTiles count={3} className="w-40" />
                  </span>
                ) : (
                  m.text
                )}
              </div>
              <span className="px-1 text-[0.7rem] text-muted">{m.timeLabel}</span>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-line px-4 py-3">
        <button type="button" aria-label="Attach photo" className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink">
          <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Attach file" className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink">
          <Paperclip className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message your Presence Manager…"
          aria-label="Message"
          className="h-11 flex-1 rounded-full border border-line bg-ivory px-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25"
        />
        <button type="button" onClick={sendVoice} aria-label="Send a voice note" className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink">
          <Mic className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-ivory transition-opacity disabled:opacity-40"
        >
          <Send className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </form>
    </div>
  )
}
