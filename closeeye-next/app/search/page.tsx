'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Search as SearchIcon, Sparkles, Clock, X, ArrowRight, SearchX,
  Users, ShieldCheck, CreditCard, CalendarCheck, FileText, Stethoscope, Pill, LifeBuoy, Activity,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { search, AI_SUGGESTIONS, type EntityType } from '@/lib/global-search'

const ICON: Record<EntityType, LucideIcon> = {
  Family: Users, Guardian: ShieldCheck, Companion: Users, Invoice: CreditCard, Visit: CalendarCheck,
  Report: FileText, Doctor: Stethoscope, Medicine: Pill, Membership: CreditCard, 'Care ticket': LifeBuoy, Operations: Activity,
}
const RECENT_KEY = 'ce_recent_searches'

function plural(type: EntityType, n: number): string {
  if (n === 1) return type
  if (type === 'Family') return 'Families'
  if (type === 'Operations') return 'Operations'
  return `${type}s`
}

export default function GlobalSearchPage() {
  const [q, setQ] = React.useState('')
  const [recent, setRecent] = React.useState<string[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    try { const r = localStorage.getItem(RECENT_KEY); if (r) setRecent(JSON.parse(r)) } catch {}
    inputRef.current?.focus()
  }, [])

  function remember(term: string) {
    const t = term.trim()
    if (!t) return
    const nextR = [t, ...recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6)
    setRecent(nextR)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(nextR)) } catch {}
  }
  function clearRecent() { setRecent([]); try { localStorage.removeItem(RECENT_KEY) } catch {} }
  function run(term: string) { setQ(term); inputRef.current?.focus() }

  const groups = search(q)
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="sticky top-0 z-20 border-b border-line bg-ivory/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-2.5 px-4">
          <Link href="/" aria-label="Home" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink hover:bg-ink/[0.04]"><ArrowLeft className="h-5 w-5" strokeWidth={1.75} /></Link>
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && remember(q)}
              placeholder="Search families, guardians, invoices, visits…"
              className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-9 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
            />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Clear" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"><X className="h-4 w-4" strokeWidth={2} /></button>}
          </div>
        </div>
      </header>

      <main className="ce-fade-in mx-auto max-w-2xl px-4 py-5">
        {!q ? (
          <div className="flex flex-col gap-6">
            {recent.length > 0 && (
              <section>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted"><Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> Recent</p>
                  <button type="button" onClick={clearRecent} className="text-caption font-semibold text-green hover:underline">Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((r) => <button key={r} type="button" onClick={() => run(r)} className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-medium text-ink transition-colors hover:border-green/40">{r}</button>)}
                </div>
              </section>
            )}
            <section>
              <p className="mb-2.5 inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-green"><Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} /> Try asking</p>
              <div className="flex flex-wrap gap-2">
                {AI_SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => run(s)} className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-medium text-muted transition-colors hover:border-green/40 hover:text-green">{s}</button>)}
              </div>
            </section>
            <p className="text-caption text-muted">Search across families, guardians, companions, invoices, visits, reports, memberships, care tickets, doctors, medicines and operations.</p>
          </div>
        ) : total > 0 ? (
          <div className="flex flex-col gap-6">
            {groups.map((g) => {
              const Icon = ICON[g.type]
              return (
                <section key={g.type}>
                  <p className="mb-2.5 inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted"><Icon className="h-3.5 w-3.5 text-green" strokeWidth={1.75} /> {plural(g.type, g.items.length)} · {g.items.length}</p>
                  <ul className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
                    {g.items.map((it) => (
                      <li key={it.id}>
                        <Link href={it.href} onClick={() => remember(q)} className="flex items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-accent-soft/30">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-semibold text-ink">{it.title}</span><span className="block truncate text-caption text-muted">{it.sub}</span></span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={SearchX} title={`No results for “${q}”`} hint="Try a name, an invoice number, a city, or one of the suggestions." className="mt-4" />
        )}
      </main>
    </div>
  )
}
