'use client'

import * as React from 'react'
import { Sparkles, Send } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { useToast } from '@/components/ui/toast'
import { guardianById, type ConsoleFamily } from '@/lib/console-data'

/**
 * Connect on the Presence Manager's family workspace — the staff side of the
 * family app's living conversation. The PM replies to the family AS Close Eye,
 * with warm quick-replies. Illustrative on the mock console today; wires to the
 * live message thread (admin-message-thread) once the console runs on real data.
 */
const QUICK = ["Share today's story", 'Schedule a call', 'All is well', 'Loop in the doctor']

export function ConsoleConnect({ family }: { family: ConsoleFamily }) {
  const toast = useToast()
  const [text, setText] = React.useState('')

  const first = family.memberName.split(/\s+/)[0] ?? family.memberName
  const guardian = guardianById(family.guardianId)
  const gFirst = guardian?.name.split(/\s+/)[0] ?? 'Your Guardian'
  const famMsg = `Hi Priya — how was ${first} today?`
  const pmMsg = `${gFirst} spent time with ${first} this morning. ${family.reason}. I'm keeping a close eye and will update you after the next visit.`

  const send = (msg: string) => {
    if (!msg.trim()) return
    setText('')
    toast(`Sent to the ${family.familyName} — as Close Eye.`)
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green text-ivory"><Sparkles className="h-5 w-5" strokeWidth={1.75} /></span>
        <div className="min-w-0">
          <h2 className="text-h4">Connect</h2>
          <p className="text-caption text-muted">Your ongoing conversation with the {family.familyName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 p-5">
        <div className="flex items-end gap-2.5">
          <Avatar initials={family.memberInitials} size="sm" tone="soft" />
          <div className="max-w-[80%] rounded-[4px_18px_18px_18px] bg-accent-soft px-4 py-2.5 text-body-sm leading-relaxed text-ink">
            <span className="mb-0.5 block text-[0.6rem] font-bold uppercase tracking-wide text-green/70">{family.familyName} · family</span>
            {famMsg}
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-[18px_18px_4px_18px] bg-green px-4 py-2.5 text-body-sm leading-relaxed text-ivory">
            <span className="mb-0.5 block text-[0.6rem] font-bold uppercase tracking-wide text-ivory/70">You · Close Eye</span>
            {pmMsg} 💚
          </div>
        </div>
      </div>

      <div className="border-t border-line p-4">
        <div className="mb-2.5 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-line bg-ivory px-3 py-1.5 text-caption font-semibold text-green transition-colors hover:border-green/50">
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-line bg-ivory px-3 py-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(text) } }}
            placeholder="Reply as Close Eye…"
            aria-label="Reply to the family"
            className="min-w-0 flex-1 bg-transparent text-body-sm text-ink placeholder:text-muted/70 focus:outline-none"
          />
          <button type="button" onClick={() => send(text)} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-ink text-ivory transition-opacity hover:opacity-90">
            <Send className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  )
}
