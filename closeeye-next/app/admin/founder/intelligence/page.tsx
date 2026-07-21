'use client'

/**
 * INTELLIGENCE — Cloza's home. The executive copilot is not implemented yet (Phase ④); this surface
 * PREPARES the workspace for it: the interaction model (a place to ask), and the capabilities Cloza
 * will bring. It should read, unmistakably, as where intelligence lives. The Today briefing already
 * runs on the same live data Cloza will use — so this is a promise the product is visibly keeping.
 */
import { Sparkles, Sunrise, MessageSquare, Lightbulb, Globe2, FileText } from 'lucide-react'
import { PageTitle, SectionLabel, serif } from '@/components/admin/founder-workspace'

const CAPABILITIES = [
  { icon: Sunrise, title: 'Daily briefings', desc: 'Your morning brief, written automatically from the day’s live data.' },
  { icon: MessageSquare, title: 'Natural-language questions', desc: '“Why are Hyderabad bookings down?” — answered from Close Eye’s own data.' },
  { icon: Lightbulb, title: 'Strategic recommendations', desc: 'Where to focus next, grounded in what’s actually happening.' },
  { icon: Globe2, title: 'Expansion insights', desc: 'Which city or country is ready — and which Guardians are overloaded.' },
  { icon: FileText, title: 'Operational summaries', desc: 'The week in one paragraph — families, care and revenue together.' },
]

export default function FounderIntelligencePage() {
  return (
    <div className="flex flex-col gap-10">
      <PageTitle title="Intelligence" subtitle="Cloza — your executive copilot. Ask about the business in plain language and get briefings, answers and recommendations grounded in Close Eye’s own data." />

      {/* Cloza hero — the interaction model, prepared (not yet live). */}
      <section className="rounded-2xl bg-surface-inverse p-6 text-content-inverse shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-content-inverse/10">
            <span className="h-4 w-4 animate-pulse rounded-full" style={{ background: 'hsl(103 58% 54%)', boxShadow: '0 0 14px 3px hsl(103 62% 54% / 0.6)' }} />
          </span>
          <div>
            <p style={serif} className="text-h4 text-content-inverse">Cloza</p>
            <p className="text-caption text-content-inverse/60">Executive copilot · arriving next phase</p>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2.5 rounded-full border border-content-inverse/15 bg-content-inverse/5 px-4 py-3">
          <Sparkles className="h-4 w-4 shrink-0 text-accent-soft" strokeWidth={1.9} />
          <span className="text-body-sm text-content-inverse/50">Ask Cloza about the business…</span>
        </div>
        <p className="mt-4 text-caption text-content-inverse/50">This is where intelligence will live. Today’s briefing already runs on the same live data Cloza will use.</p>
      </section>

      <section>
        <SectionLabel>What Cloza will do</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.title} className="flex items-start gap-3 rounded-lg border border-line bg-card p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-5 w-5" strokeWidth={1.8} /></span>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-ink">{c.title}</p>
                  <p className="mt-0.5 text-caption leading-relaxed text-muted">{c.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
