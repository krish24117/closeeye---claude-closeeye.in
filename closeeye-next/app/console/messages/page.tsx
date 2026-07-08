'use client'

import * as React from 'react'
import { Search, Mic, Camera } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

type Tab = 'families' | 'guardians' | 'companions' | 'team'
type Status = 'all' | 'unread' | 'needs-reply' | 'resolved'
interface Thread { id: string; tab: Tab; name: string; initials: string; last: string; time: string; status: Exclude<Status, 'all'>; kind?: 'voice' | 'photo' }

const THREADS: Thread[] = [
  { id: 't1', tab: 'families', name: 'Ananya Rao', initials: 'AR', last: 'Thank you so much — he looks so happy 🥹', time: '9:20 PM', status: 'resolved' },
  { id: 't2', tab: 'families', name: 'Imran Sheikh', initials: 'IS', last: 'Please call before the cardiology appointment', time: '11:02 AM', status: 'needs-reply' },
  { id: 't3', tab: 'families', name: 'Sunita Mehta’s son', initials: 'SM', last: 'Could you add a BP reading today?', time: '8:40 AM', status: 'unread' },
  { id: 't4', tab: 'guardians', name: 'Arjun Kumar', initials: 'AK', last: 'Voice note · 0:18', time: '9:41 AM', status: 'resolved', kind: 'voice' },
  { id: 't5', tab: 'guardians', name: 'Sana Sheikh', initials: 'SS', last: 'Running 15 min behind — traffic on the ORR', time: '11:48 AM', status: 'unread' },
  { id: 't6', tab: 'companions', name: 'Anita Rao', initials: 'AR', last: 'Radha loved the reading session today 📖', time: '10:30 AM', status: 'needs-reply' },
  { id: 't7', tab: 'companions', name: 'Vikram Shetty', initials: 'VS', last: 'Photo · with Fatima at the hospital', time: 'Yesterday', status: 'resolved', kind: 'photo' },
  { id: 't8', tab: 'team', name: 'Operations', initials: 'OP', last: 'Weekly roster confirmed for next week', time: 'Yesterday', status: 'resolved' },
  { id: 't9', tab: 'team', name: 'Regional — South', initials: 'RS', last: 'Great numbers this week, Priya 👏', time: 'Mon', status: 'resolved' },
]

const TABS: { key: Tab; label: string }[] = [
  { key: 'families', label: 'Families' },
  { key: 'guardians', label: 'Guardians' },
  { key: 'companions', label: 'Companions' },
  { key: 'team', label: 'Team' },
]
const STATUSES: { key: Status; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'needs-reply', label: 'Needs reply' },
  { key: 'resolved', label: 'Resolved' },
]
const STATUS_DOT: Record<Exclude<Status, 'all'>, string> = { unread: 'bg-success', 'needs-reply': 'bg-warning', resolved: 'bg-line' }
const TEMPLATES = ['On my way to help 💚', 'I’ll check and update you shortly', 'Thank you for letting me know', 'The visit went beautifully today']

export default function MessagesPage() {
  const toast = useToast()
  const [tab, setTab] = React.useState<Tab>('families')
  const [status, setStatus] = React.useState<Status>('all')
  const [q, setQ] = React.useState('')
  const query = q.trim().toLowerCase()
  const threads = THREADS.filter((t) => t.tab === tab)
    .filter((t) => (status === 'all' ? true : t.status === status))
    .filter((t) => (query ? `${t.name} ${t.last}`.toLowerCase().includes(query) : true))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2">Messages</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">One inbox for families, guardians, companions and your team.</p>
      </div>

      <div className="inline-flex w-full max-w-xl rounded-full border border-line bg-card p-1">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn('flex-1 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors', tab === t.key ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[12rem] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
        </div>
        <div className="flex items-center gap-1.5">
          {STATUSES.map((s) => (
            <button key={s.key} type="button" onClick={() => setStatus(s.key)} className={cn('rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors', status === s.key ? 'border-green bg-green text-ivory' : 'border-line text-muted hover:border-ink/25 hover:text-ink')}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button key={t} type="button" onClick={() => toast('Quick reply ready to send.')} className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-medium text-muted transition-colors hover:border-green/40 hover:text-green">{t}</button>
        ))}
      </div>

      <ul className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        {threads.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => toast(`Opening your conversation with ${t.name}.`)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-accent-soft/30">
              <Avatar initials={t.initials} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-semibold text-ink">{t.name}</span>
                <span className="flex items-center gap-1.5 truncate text-caption text-muted">
                  {t.kind === 'voice' && <Mic className="h-3.5 w-3.5 text-green" strokeWidth={1.75} />}
                  {t.kind === 'photo' && <Camera className="h-3.5 w-3.5 text-green" strokeWidth={1.75} />}
                  {t.last}
                </span>
              </span>
              <span className="shrink-0 text-caption text-muted">{t.time}</span>
              <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[t.status])} aria-label={t.status} />
            </button>
          </li>
        ))}
        {threads.length === 0 && <li className="px-4 py-8 text-center text-body-sm text-muted">No messages match.</li>}
      </ul>
    </div>
  )
}
