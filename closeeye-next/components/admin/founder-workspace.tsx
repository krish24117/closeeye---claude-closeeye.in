'use client'

/**
 * Editorial primitives for the Founder Workspace — deliberately NOT the enterprise KPI-card look of
 * the rest of Admin. Big serif figures, generous space, hairlines over borders, a calm briefing.
 * It should read like a morning executive brief, not a console. Reused across all four tabs.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, ArrowUpRight, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import type { AdminAlert } from '@/lib/db/admin'
import { cn } from '@/lib/utils'

export const serif = { fontFamily: 'var(--font-newsreader), Georgia, "Times New Roman", serif' } as const

const TABS = [
  { href: '/admin/founder', label: 'Today' },
  { href: '/admin/founder/growth', label: 'Growth' },
  { href: '/admin/founder/operations', label: 'Operations' },
  { href: '/admin/founder/intelligence', label: 'Intelligence' },
]

export function FounderTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-6 border-b border-line">
      {TABS.map((t) => {
        const active = t.href === '/admin/founder' ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined}
            className={cn('relative -mb-px pb-3 pt-1 text-body-sm font-semibold transition-colors', active ? 'text-ink' : 'text-muted hover:text-ink')}>
            {t.label}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-green" />}
          </Link>
        )
      })}
    </div>
  )
}

/** Serif dateline + greeting — the top of the morning brief. */
export function FounderGreeting({ name }: { name: string }) {
  const now = new Date()
  const date = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const hr = now.getHours()
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'
  return (
    <div>
      <p className="text-caption font-semibold uppercase tracking-widest text-muted">{date}</p>
      <h1 style={serif} className="mt-1.5 text-h1 text-ink">{greet}{name ? `, ${name}` : ''}.</h1>
    </div>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 style={serif} className="text-h1 text-ink">{title}</h1>
      {subtitle && <p className="mt-2 max-w-xl text-body text-muted">{subtitle}</p>}
    </div>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-5 text-caption font-semibold uppercase tracking-widest text-muted">{children}</p>
}

/** One editorial figure — a big serif number (or an honest "Coming soon"), minimal chrome. */
export function Figure({ label, value, hint, soon }: { label: string; value?: string | number; hint?: string; soon?: string }) {
  const isSoon = value == null && !!soon
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-caption font-semibold uppercase tracking-wide text-muted">{label}</p>
      {isSoon ? (
        <>
          <p style={serif} className="text-h2 leading-none text-muted/40">—</p>
          <p className="text-caption text-muted">Coming soon · {soon}</p>
        </>
      ) : (
        <>
          <p style={serif} className="text-h1 leading-none text-ink">{value ?? '—'}</p>
          {hint && <p className="text-caption text-muted">{hint}</p>}
        </>
      )}
    </div>
  )
}

export function FigureRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
}

/** The Daily Founder Briefing — rule-based today, Cloza-written later. Same card either way. */
export function Brief({ lines, footnote }: { lines: string[]; footnote?: string }) {
  return (
    <section className="rounded-2xl bg-surface-inverse p-6 text-content-inverse shadow-sm sm:p-8">
      <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-accent-soft">
        <Sparkles className="h-4 w-4" strokeWidth={1.9} /> Daily Founder Briefing
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {lines.map((l, i) => (
          <p key={i} style={serif} className="text-lead leading-relaxed text-content-inverse">{l}</p>
        ))}
      </div>
      {footnote && <p className="mt-5 border-t border-content-inverse/10 pt-4 text-caption text-content-inverse/50">{footnote}</p>}
    </section>
  )
}

/** Critical alerts as a calm, scannable list — never a wall of red. Reassures when there are none. */
export function CriticalAlerts({ alerts }: { alerts: AdminAlert[] }) {
  return (
    <section>
      <SectionLabel>Critical alerts</SectionLabel>
      {alerts.length === 0 ? (
        <p className="flex items-center gap-2.5 text-body-sm text-muted">
          <CheckCircle2 className="h-4 w-4 text-green" strokeWidth={2} /> Nothing needs your attention right now.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-card">
          {alerts.map((a) => {
            const Icon = a.tone === 'warning' ? AlertTriangle : Info
            return (
              <Link key={a.id} href={a.href} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-ink/[0.02]">
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', a.tone === 'warning' ? 'text-warning' : 'text-muted')} strokeWidth={2} />
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-semibold text-ink">{a.title}</span>
                  <span className="block text-caption text-muted">{a.detail}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** A single reassuring system-status line, derived from open alerts. */
export function SystemStatus({ alertCount }: { alertCount: number }) {
  const ok = alertCount === 0
  return (
    <section>
      <SectionLabel>System status</SectionLabel>
      <div className="flex items-center gap-2.5">
        <span className={cn('h-2.5 w-2.5 rounded-full', ok ? 'bg-green' : 'bg-warning')} />
        <p className="text-body-sm text-ink">{ok ? 'All systems operational.' : `${alertCount} ${alertCount === 1 ? 'item' : 'items'} need attention.`}</p>
      </div>
    </section>
  )
}

/** A quiet deep-link into an existing console — the workspace summarizes, the console operates. */
export function DeepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
      {label} <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.9} />
    </Link>
  )
}
