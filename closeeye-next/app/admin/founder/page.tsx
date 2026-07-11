'use client'

import * as React from 'react'
import { Loader2, Lock, MessageCircle, Phone, Mail, Users, Search, X, Check, Download, Copy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/family/avatar'
import { initialsOf } from '@/components/family/loved-one-card'
import { useFamilyData } from '@/components/family/family-data-provider'
import { fetchFounderMetrics, type FounderMetrics } from '@/lib/db/founder-dashboard'
import { fetchFounderRegistrants, fetchFounderActions, logFounderAction, setFollowedUp, setFounderNotes, type FounderRegistrant, type FounderActionType } from '@/lib/db/founder-ops'
import {
  registrantStatus, STATUS_LABEL, matchesFilter, matchesSearch, toCSV, phoneList, whatsappList,
  founderActivityToday, reachedIds, actionsFor, ACTION_LABEL,
  type Filter, type RegStatus, type FounderAction,
} from '@/lib/founder-ops-view'
import { FOUNDER_LAUNCH_LABEL, daysUntilLaunch, launchMode } from '@/lib/launch'
import { planById } from '@/lib/plans'
import { isSuperAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'

const FOUNDER_GOAL = 100
const section = 'mb-3 text-caption font-semibold uppercase tracking-widest text-muted'
const pct = (n: number | null) => (n === null ? '—' : `${n}%`)

const STATUS_STYLE: Record<RegStatus, string> = {
  new: 'bg-accent-soft text-green',
  follow_up: 'bg-warning/12 text-warning',
  waiting: 'bg-ink/[0.06] text-muted',
  activated: 'bg-success/12 text-success',
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This week' },
  { key: 'follow_up', label: 'Needs follow-up' },
  { key: 'connect', label: 'Connect' },
  { key: 'care', label: 'Care' },
  { key: 'hyderabad', label: 'Hyderabad' },
  { key: 'activated', label: 'Activated' },
]

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`
const mailHref = (e: string) => `mailto:${e}`
function waHref(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '')
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent('Hi, this is Krishna from Close Eye 🙏')}`
}
function download(filename: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8;` }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function Tile({ label, value, hint, tone = 'ink' }: { label: string; value: string; hint?: string; tone?: 'ink' | 'green' | 'warning' }) {
  const color = tone === 'green' ? 'text-green' : tone === 'warning' ? 'text-warning' : 'text-ink'
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
      <p className={cn('text-h3 leading-none', color)}>{value}</p>
      <p className="mt-2 text-caption font-medium text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-caption text-muted/70">{hint}</p>}
    </div>
  )
}

function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value))
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5 shadow-sm">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1]!.value : null
        const step = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-body-sm">
              <span className="font-medium text-ink">{s.label}</span>
              <span className="flex items-center gap-2.5">{step !== null && <span className="text-caption text-muted">{step}%</span>}<span className="font-bold tabular-nums text-ink">{s.value}</span></span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-accent-soft"><div className="h-full rounded-full bg-green" style={{ width: `${Math.max(2, (s.value / max) * 100)}%` }} /></div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Family drawer ───────────────────────────────────────────────────────── */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line px-5 py-4">
      <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 text-body-sm">
      <span className="text-muted">{label}</span>
      <span className="max-w-[60%] break-words text-right font-medium text-ink">{value?.trim() ? value : '—'}</span>
    </div>
  )
}
function DrawerAction({ icon: Icon, label, href, external, tone, onClick }: { icon: LucideIcon; label: string; href?: string; external?: boolean; tone?: 'green'; onClick?: () => void }) {
  const cls = cn('flex flex-col items-center gap-1 rounded-lg border border-line bg-card py-2.5 text-caption font-semibold transition-colors', href ? cn('hover:border-green/40', tone === 'green' ? 'text-green' : 'text-ink') : 'cursor-not-allowed text-muted/40')
  if (!href) return <span className={cls}><Icon className="h-4 w-4" strokeWidth={1.75} /> {label}</span>
  return <a href={href} onClick={onClick} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cls}><Icon className="h-4 w-4" strokeWidth={1.75} /> {label}</a>
}

function FamilyDrawer({ r, actions, nowIso, onClose, onToggleFollowedUp, onSaveNote, onAction }: {
  r: FounderRegistrant
  actions: FounderAction[]
  nowIso: string
  onClose: () => void
  onToggleFollowedUp: (r: FounderRegistrant) => Promise<void>
  onSaveNote: (r: FounderRegistrant, notes: string) => Promise<void>
  onAction: (registrantId: string, type: FounderActionType) => void
}) {
  const [note, setNote] = React.useState(r.notes ?? '')
  const [savingNote, setSavingNote] = React.useState(false)
  const [busyFollow, setBusyFollow] = React.useState(false)
  React.useEffect(() => { setNote(r.notes ?? '') }, [r.id, r.notes])

  const status = registrantStatus(r, nowIso)
  const plan = planById(r.planId)
  const timeline: { label: string; at: string | null; done: boolean }[] = [
    { label: 'Registered', at: r.registeredAt, done: !!r.registeredAt },
    ...(r.planId ? [{ label: `Chose ${plan ? `Close Eye ${plan.short}` : 'a plan'}`, at: r.registeredAt, done: true }] : []),
    ...actions.map((a) => ({ label: ACTION_LABEL[a.actionType] ?? a.actionType, at: a.createdAt, done: true })),
    ...(r.followedUp ? [{ label: 'Marked followed up', at: r.followedUpAt, done: true }] : []),
    ...(r.subStatus === 'active' ? [{ label: 'Activated', at: null, done: true }] : []),
  ].sort((a, b) => (a.at && b.at ? (a.at < b.at ? -1 : 1) : a.at ? -1 : 1))

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-line bg-ivory shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-ivory/95 px-5 py-4 backdrop-blur">
          <Avatar initials={initialsOf(r.fullName ?? 'Family')} size="md" tone="solid" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-h4 text-ink">{r.fullName ?? 'Family'}</p>
            <span className={cn('mt-0.5 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-ink/[0.05]"><X className="h-5 w-5" strokeWidth={1.75} /></button>
        </div>

        <div className="grid grid-cols-4 gap-2 border-b border-line px-5 py-4">
          <DrawerAction icon={Phone} label="Call" href={r.phone ? telHref(r.phone) : undefined} onClick={() => onAction(r.id, 'call')} />
          <DrawerAction icon={MessageCircle} label="WhatsApp" href={r.phone ? waHref(r.phone) : undefined} external tone="green" onClick={() => onAction(r.id, 'whatsapp')} />
          <DrawerAction icon={Mail} label="Email" href={r.email ? mailHref(r.email) : undefined} external onClick={() => onAction(r.id, 'email')} />
          <button type="button" onClick={() => { setBusyFollow(true); void onToggleFollowedUp(r).finally(() => setBusyFollow(false)) }} disabled={busyFollow} className={cn('flex flex-col items-center gap-1 rounded-lg border py-2.5 text-caption font-semibold transition-colors disabled:opacity-60', r.followedUp ? 'border-success/40 bg-success/5 text-success' : 'border-line bg-card text-ink hover:border-green/40')}>
            {busyFollow ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Check className="h-4 w-4" strokeWidth={2} />} {r.followedUp ? 'Followed' : 'Mark done'}
          </button>
        </div>

        <Group title="Customer">
          <Row label="Phone" value={r.phone} />
          <Row label="Email" value={r.email} />
          <Row label="City" value={r.serviceArea} />
          <Row label="Registering for" value={r.relationship} />
          <Row label="Referral" value={r.ref || 'direct'} />
        </Group>

        <Group title="Membership">
          <Row label="Plan" value={plan ? `Close Eye ${plan.short} · ${plan.price}/mo` : 'Not chosen'} />
          <Row label="Status" value={STATUS_LABEL[status]} />
        </Group>

        <Group title="Timeline">
          <ol className="flex flex-col gap-3">
            {timeline.map((t, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', t.done ? 'bg-green text-ivory' : 'border border-line bg-card')}>{t.done && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                <div><p className={cn('text-body-sm', t.done ? 'text-ink' : 'text-muted')}>{t.label}</p>{t.at && <p className="text-caption text-muted">{fmtDateTime(t.at)}</p>}</div>
              </li>
            ))}
          </ol>
        </Group>

        <Group title="Founder notes">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="e.g. Lives in the US. Parents in Kondapur. Call after 8PM IST. Interested in Care." className="w-full rounded-sm border border-line bg-card px-3 py-2 text-body-sm text-ink placeholder:text-muted/50 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
          <Button size="sm" className="mt-2 self-start" disabled={savingNote || note === (r.notes ?? '')} onClick={() => { setSavingNote(true); void onSaveNote(r, note).finally(() => setSavingNote(false)) }}>
            {savingNote ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Saving…</> : 'Save note'}
          </Button>
        </Group>
      </aside>
    </>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function FounderDashboardPage() {
  const { profile, loading } = useFamilyData()
  const isAdmin = isSuperAdmin(profile)
  const [d, setD] = React.useState<FounderMetrics | null>(null)
  const [rows, setRows] = React.useState<FounderRegistrant[] | null>(null)
  const [actions, setActions] = React.useState<FounderAction[]>([])
  const [nowIso, setNowIso] = React.useState<string | null>(null)
  const [days, setDays] = React.useState<number | null>(null)
  const [live, setLive] = React.useState(false)
  const [filter, setFilter] = React.useState<Filter>('all')
  const [query, setQuery] = React.useState('')
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [flash, setFlash] = React.useState('')

  React.useEffect(() => { setNowIso(new Date().toISOString()); setDays(daysUntilLaunch()); setLive(launchMode() === 'live') }, [])
  React.useEffect(() => {
    if (!isAdmin) return
    fetchFounderMetrics().then(setD).catch(() => setD(null))
    fetchFounderRegistrants().then(setRows).catch(() => setRows([]))
    fetchFounderActions().then(setActions).catch(() => setActions([]))
  }, [isAdmin])

  function logAction(registrantId: string, type: FounderActionType) {
    setActions((cur) => [{ registrantId, actionType: type, createdAt: new Date().toISOString() }, ...cur])
    logFounderAction(registrantId, type)
  }

  function showFlash(msg: string) { setFlash(msg); setTimeout(() => setFlash(''), 2000) }

  async function toggleFollowedUp(r: FounderRegistrant) {
    const next = !r.followedUp
    const at = next ? new Date().toISOString() : null
    setRows((cur) => cur?.map((x) => (x.id === r.id ? { ...x, followedUp: next, followedUpAt: at } : x)) ?? null)
    await setFollowedUp(r.id, next)
  }
  async function saveNote(r: FounderRegistrant, notes: string) {
    setRows((cur) => cur?.map((x) => (x.id === r.id ? { ...x, notes: notes.trim() || null } : x)) ?? null)
    await setFounderNotes(r.id, notes)
    showFlash('Note saved')
  }

  if (loading) return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
  if (!isAdmin) return <div className="flex flex-col gap-6"><h1 className="text-h2">Founder Activation</h1><EmptyState icon={Lock} title="Restricted" hint="Only administrators can open the Founder workspace." /></div>
  if (d === null || nowIso === null) return <div className="flex flex-col gap-8"><h1 className="text-h2">Founder Activation</h1><div className="grid place-items-center rounded-lg border border-line bg-card py-20 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div></div>

  const goalPct = Math.min(100, Math.round((d.totalRegistrations / FOUNDER_GOAL) * 100))
  const activated = Math.max(0, d.totalRegistrations - d.activationQueue)
  const all = rows ?? []
  const todayCount = all.filter((r) => matchesFilter(r, 'today', nowIso)).length
  const needsFollowUp = all.filter((r) => matchesFilter(r, 'follow_up', nowIso)).length
  const filtered = all.filter((r) => matchesFilter(r, filter, nowIso) && matchesSearch(r, query))
  const selected = selectedId ? all.find((r) => r.id === selectedId) ?? null : null
  const activity = founderActivityToday(actions, nowIso)
  const reached = new Set<string>([...reachedIds(actions), ...all.filter((r) => r.followedUp).map((r) => r.id)])
  const reachedPct = all.length ? Math.round((reached.size / all.length) * 100) : null
  const funnel = [
    { label: 'Landing views', value: d.landingViews },
    { label: 'WhatsApp clicks', value: d.whatsappClicks },
    { label: 'Registrations', value: d.totalRegistrations },
    { label: 'Connect', value: d.connectSelected },
    { label: 'Care', value: d.careSelected },
    { label: 'Activated', value: activated },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Founder Activation</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Who registered — and who to reach out to next — for the first Hyderabad families.</p>
      </div>

      {/* 1 · Launch progress */}
      <section className="rounded-lg border border-line bg-card p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><p className="text-caption font-semibold uppercase tracking-widest text-muted">Goal</p><p className="mt-1 text-h3 leading-none text-ink">{FOUNDER_GOAL}<span className="ml-1 text-body-sm font-normal text-muted">families</span></p></div>
          <div><p className="text-caption font-semibold uppercase tracking-widest text-muted">Registered</p><p className="mt-1 text-h3 leading-none text-green">{d.totalRegistrations}</p></div>
          <div><p className="text-caption font-semibold uppercase tracking-widest text-muted">Remaining</p><p className="mt-1 text-h3 leading-none text-ink">{Math.max(0, FOUNDER_GOAL - d.totalRegistrations)}</p></div>
          <div><p className="text-caption font-semibold uppercase tracking-widest text-muted">{live ? 'Launched' : 'Launch'}</p><p className="mt-1 text-h4 leading-tight text-ink">{FOUNDER_LAUNCH_LABEL}</p>{!live && days !== null && <p className="text-caption font-semibold text-green">{days} {days === 1 ? 'day' : 'days'} to go</p>}</div>
        </div>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-accent-soft"><div className="h-full rounded-full bg-green transition-all" style={{ width: `${goalPct}%` }} /></div>
        <p className="mt-2 text-caption text-muted">{goalPct}% of goal</p>
      </section>

      {/* 2 · Today */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green/30 bg-accent-soft/25 px-5 py-4 shadow-sm">
        <p className="text-body text-ink"><span className="font-bold">{todayCount}</span> registered today · <span className="font-bold">{needsFollowUp}</span> waiting for your first call</p>
        {needsFollowUp > 0 && <Button size="sm" variant="secondary" onClick={() => setFilter('follow_up')}>Show who to call →</Button>}
      </section>

      {/* 2b · Your activity today */}
      <section>
        <p className={section}>Your activity today</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Calls today" value={String(activity.calls)} tone="green" />
          <Tile label="WhatsApps today" value={String(activity.whatsapps)} tone="green" />
          <Tile label="Follow-ups pending" value={String(needsFollowUp)} tone={needsFollowUp > 0 ? 'warning' : 'ink'} />
          <Tile label="Reached" value={reachedPct === null ? '—' : `${reachedPct}%`} hint="Contacted ≥ once" />
        </div>
      </section>

      {/* 3 · Registered families */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className={cn(section, 'mb-0')}>Registered families · {filtered.length}{filtered.length !== all.length ? ` of ${all.length}` : ''}</p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => download('founder-registrants.csv', toCSV(filtered, nowIso))} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-ink hover:border-green/40"><Download className="h-3.5 w-3.5" strokeWidth={2} /> CSV</button>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(phoneList(filtered)); showFlash('Phone numbers copied') }} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-ink hover:border-green/40"><Copy className="h-3.5 w-3.5" strokeWidth={2} /> Phones</button>
            <button type="button" onClick={() => download('whatsapp-list.txt', whatsappList(filtered), 'text/plain')} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-caption font-semibold text-green hover:border-green/40"><MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> WA list</button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-card p-1">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn('rounded-full px-3 py-1.5 text-caption font-semibold transition-colors', filter === f.key ? 'bg-green text-ivory' : 'text-muted hover:text-ink')}>{f.label}</button>
            ))}
          </div>
          <div className="relative min-w-[12rem] max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, mobile, email, referral, city…" className="w-full rounded-full border border-line bg-card py-2 pl-9 pr-4 text-body-sm text-ink placeholder:text-muted/70 focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20" />
          </div>
        </div>

        {rows === null ? (
          <div className="grid place-items-center rounded-lg border border-line bg-card py-16 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-green" strokeWidth={2} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title={all.length === 0 ? 'No registrations yet' : 'Nothing matches'} hint={all.length === 0 ? 'Families appear here as they register.' : 'Try a different filter or search.'} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-line text-caption font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Mobile</th>
                    <th className="px-4 py-3 font-semibold">City</th>
                    <th className="px-4 py-3 font-semibold">For</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Registered</th>
                    <th className="px-4 py-3 font-semibold">Last follow-up</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((r) => {
                    const plan = planById(r.planId)
                    const st = registrantStatus(r, nowIso)
                    return (
                      <tr key={r.id} onClick={() => setSelectedId(r.id)} className="cursor-pointer align-middle transition-colors hover:bg-accent-soft/25">
                        <td className="px-4 py-3"><span className="flex items-center gap-2.5"><Avatar initials={initialsOf(r.fullName ?? 'Family')} size="sm" tone="solid" /><span className="font-semibold text-ink">{r.fullName ?? '—'}</span></span></td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink">{r.phone ?? '—'}</td>
                        <td className="px-4 py-3 text-muted">{r.serviceArea ?? '—'}</td>
                        <td className="px-4 py-3 text-muted">{r.relationship ?? '—'}</td>
                        <td className="px-4 py-3">{plan ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase text-green">{plan.short}</span> : <span className="text-muted">—</span>}</td>
                        <td className="px-4 py-3"><span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase', STATUS_STYLE[st])}>{STATUS_LABEL[st]}</span></td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDateTime(r.registeredAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{r.followedUpAt ? fmtDateTime(r.followedUpAt) : '—'}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <span className="flex items-center justify-end gap-1">
                            {r.phone && <a href={waHref(r.phone)} onClick={() => logAction(r.id, 'whatsapp')} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="grid h-8 w-8 place-items-center rounded-full text-green hover:bg-accent-soft"><MessageCircle className="h-4 w-4" strokeWidth={1.75} /></a>}
                            {r.phone && <a href={telHref(r.phone)} onClick={() => logAction(r.id, 'call')} title="Call" className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-ink/[0.05]"><Phone className="h-4 w-4" strokeWidth={1.75} /></a>}
                            {r.email && <a href={mailHref(r.email)} onClick={() => logAction(r.id, 'email')} title="Email" className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-ink/[0.05]"><Mail className="h-4 w-4" strokeWidth={1.75} /></a>}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 4 · Registration funnel */}
      <section>
        <p className={section}>Registration funnel</p>
        <Funnel stages={funnel} />
      </section>

      {/* 5 · Plan distribution + funnel context */}
      <section>
        <p className={section}>Plan distribution</p>
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
            {d.careSharePct === null ? (
              <p className="text-body-sm text-muted">No plans chosen yet.</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-caption font-medium text-muted"><span className="text-green">Care · {d.careSelected} ({d.careSharePct}%)</span><span>Connect · {d.connectSelected} ({100 - d.careSharePct}%)</span></div>
                <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-accent-soft"><div className="h-full bg-green" style={{ width: `${d.careSharePct}%` }} /></div>
              </>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Tile label="Today" value={String(d.registrationsToday)} tone="green" />
            <Tile label="Waitlist" value={String(d.waitlist)} />
            <Tile label="Conversion" value={pct(d.conversionPct)} />
          </div>
        </div>
      </section>

      <p className="text-caption text-muted">Click any family to open their profile, timeline and notes. Reminders, per-family event tracking and daily task list come next.</p>

      {selected && <FamilyDrawer r={selected} actions={actionsFor(actions, selected.id)} nowIso={nowIso} onClose={() => setSelectedId(null)} onToggleFollowedUp={toggleFollowedUp} onSaveNote={saveNote} onAction={logAction} />}
      {flash && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-body-sm font-medium text-ivory shadow-lg">{flash}</div>}
    </div>
  )
}
