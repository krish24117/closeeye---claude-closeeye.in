'use client'

/**
 * The Connect sheet — the orb's fast lane (Dock redesign, 2026-07-19). Tapping the orb opens
 * this; it is a launcher, not a second engine. The ask field seeds the real understanding engine
 * at /space/connect (?q=…), so there is one conversation surface, never a fork. The three actions
 * route to where each capability actually lives (People owns memories & documents; Connect owns
 * conversation) — surfacing, not owning.
 *
 * Increment A: text only. Voice (the mic + long-press) is Increment C. "Recently asked" is
 * intentionally absent until there is a real history source to read (Increment B) — we never
 * render invented prior questions.
 */
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Camera, FileUp, MessagesSquare } from 'lucide-react'
import { Overlay } from '@/components/family/overlay'

export function ConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Focus the field when the sheet opens; clear it when it closes so it reopens empty-and-inviting.
  React.useEffect(() => {
    if (open) { const t = window.setTimeout(() => inputRef.current?.focus(), 80); return () => window.clearTimeout(t) }
    setQ('')
  }, [open])

  function go(href: string) { onClose(); router.push(href) }
  function ask() {
    const text = q.trim()
    go(text ? `/space/connect?q=${encodeURIComponent(text)}` : '/space/connect')
  }

  return (
    <Overlay open={open} onClose={onClose}>
      <div className="p-5 pb-7">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-edge" aria-hidden />

        <h2 className="sr-only">Connect</h2>

        {/* Ask — the primary action. Seeds the real engine at /space/connect. */}
        <div className="wsp-askfield">
          <label htmlFor="orb-ask" className="sr-only">Ask about your family</label>
          <input
            ref={inputRef}
            id="orb-ask"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ask() } }}
            placeholder="Ask about your family…"
            enterKeyHint="send"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={ask}
            aria-label="Ask"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-inverse text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-40"
            disabled={!q.trim()}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Actions — each routes to where the capability lives. */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <SheetAction icon={Camera} title="Add a memory" hint="Something worth remembering" onClick={() => go('/space/people')} />
          <SheetAction icon={FileUp} title="Upload a document" hint="Reports, prescriptions" onClick={() => go('/space/people')} />
          <SheetAction icon={MessagesSquare} title="Start a conversation" hint="Talk something through — I’ll keep the thread" wide onClick={() => go('/space/connect')} />
        </div>
      </div>
    </Overlay>
  )
}

function SheetAction({ icon: Icon, title, hint, wide, onClick }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  hint: string
  wide?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-2xl border border-edge bg-surface p-3.5 text-start transition-colors hover:border-brand/40 ${wide ? 'col-span-2' : ''}`}
    >
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-accent text-brand">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-body-sm font-semibold text-content">{title}</span>
        <span className="block text-caption text-content-muted">{hint}</span>
      </span>
    </button>
  )
}
