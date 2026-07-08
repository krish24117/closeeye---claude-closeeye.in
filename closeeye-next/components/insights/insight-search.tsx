'use client'

import * as React from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { search, SEARCH_EXAMPLES, type SearchAnswer } from '@/lib/cloza-engine'

/** Ask in plain words — "show families needing follow-up". Interprets existing data. */
export function InsightSearch() {
  const [q, setQ] = React.useState('')
  const [answer, setAnswer] = React.useState<SearchAnswer | null>(null)

  function run(query: string) {
    setQ(query)
    setAnswer(query.trim() ? search(query) : null)
  }

  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <form onSubmit={(e) => { e.preventDefault(); run(q) }} className="relative">
        <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-green" strokeWidth={1.75} />
        <input
          value={q}
          onChange={(e) => run(e.target.value)}
          placeholder="Ask anything — e.g. show families needing follow-up"
          className="w-full rounded-full border border-line bg-ivory py-3 pl-11 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20"
        />
      </form>

      {!answer && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SEARCH_EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => run(ex)} className="rounded-full border border-line bg-card px-3 py-1.5 text-caption font-medium text-muted transition-colors hover:border-green/40 hover:text-green">{ex}</button>
          ))}
        </div>
      )}

      {answer && (
        <div className="mt-4">
          <p className="text-body-sm font-medium text-ink">{answer.summary}</p>
          {answer.results.length > 0 && (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-md border border-line">
              {answer.results.map((res, i) => {
                const inner = (
                  <>
                    <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-semibold text-ink">{res.title}</span><span className="block truncate text-caption text-muted">{res.sub}</span></span>
                    {res.href && <ArrowRight className="h-4 w-4 shrink-0 text-green" strokeWidth={1.75} />}
                  </>
                )
                return (
                  <li key={i}>
                    {res.href ? (
                      <Link href={res.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent-soft/30">{inner}</Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
