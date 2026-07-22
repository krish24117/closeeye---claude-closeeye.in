'use client'

/**
 * Recommended Next Steps — the universal section that turns an answer into coordinated action.
 * Engine-driven (lib/collaboration recommendNextSteps): the same four groups in every domain, only
 * the steps differ. It renders ONLY steps that are genuinely wired (share · invite · assign) so there
 * are no dead buttons, opens the existing bottom-sheet for each, and persists through lib/db/collaboration
 * — every action writes a timeline event. Reuses Overlay, Button, tokens; nothing new to learn.
 */
import * as React from 'react'
import Link from 'next/link'
import {
  Share2, UserPlus, ClipboardList, ChevronRight, Loader2, Check, CalendarPlus, MessageCircle, HeartHandshake, Users,
} from 'lucide-react'
import { Overlay } from '@/components/family/overlay'
import { Button } from '@/components/ui/button'
import { recommendNextSteps } from '@/lib/collaboration/engine'
import { PRIVACY_FIRST_POLICY } from '@/lib/understanding/policy'
import { shareObject, sendInvitation, assignTask, upsertTrustedIdentity } from '@/lib/db/collaboration'
import type { CollaborationRole, NextStep, NextStepSection, ObjectRef, TrustedIdentity } from '@/lib/collaboration/types'

const SUPPORTED = new Set<NextStep['kind']>(['share', 'invite', 'assign'])
type SheetState = { step: NextStep } | null

function roleLabel(role?: string) {
  return (role ?? '').replace(/_/g, ' ')
}

export function RecommendedNextSteps({
  object, network, receiveItems, bookHref, messageHref, onChanged,
}: {
  object: ObjectRef
  network: TrustedIdentity[]
  receiveItems?: string[]
  bookHref?: string
  messageHref?: string
  onChanged?: () => void
}) {
  const sections = React.useMemo(
    () => recommendNextSteps({ domain: object.domain, space: object.space }, PRIVACY_FIRST_POLICY).sections,
    [object.domain, object.space],
  )
  const [share, setShare] = React.useState<SheetState>(null)
  const [invite, setInvite] = React.useState<SheetState>(null)
  const [assign, setAssign] = React.useState<SheetState>(null)
  // Local copy so an inline "add someone" (during Share/Assign) appears immediately, no navigation.
  const [people, setPeople] = React.useState(network)
  React.useEffect(() => setPeople(network), [network])
  const addPerson = (p: TrustedIdentity) => setPeople((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))

  // Keep only the groups whose steps we can actually perform.
  const visible: NextStepSection[] = sections
    .map((s) => ({ ...s, steps: s.steps.filter((st) => SUPPORTED.has(st.kind)) }))
    .filter((s) => s.steps.length > 0)

  const open = (step: NextStep) => {
    if (step.kind === 'share') setShare({ step })
    else if (step.kind === 'invite') setInvite({ step })
    else if (step.kind === 'assign') setAssign({ step })
  }

  return (
    <div className="rounded-lg border border-line/70 bg-card p-4 shadow-sm">
      <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-green">
        <HeartHandshake className="h-3.5 w-3.5" strokeWidth={1.9} /> Recommended next steps
      </p>

      {visible.map((section) => (
        <div key={section.group} className="mt-3">
          <p className="mb-1.5 px-0.5 text-caption font-semibold uppercase tracking-wider text-muted">{section.title}</p>
          <div className="flex flex-col gap-1.5">
            {section.steps.map((step, i) => (
              <button
                key={`${section.group}-${i}`}
                type="button"
                onClick={() => open(step)}
                className="flex items-center gap-3 rounded-md border border-line/70 bg-surface-raised px-3 py-2.5 text-start transition-colors hover:border-green/50"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-green">
                  <StepIcon kind={step.kind} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-semibold text-ink">{step.label}</span>
                  <span className="block truncate text-caption text-muted">{step.rationale}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* The existing, always-real actions + a standing door into the Trusted Network (discoverability). */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/space/network" className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface-raised px-3.5 py-2 text-caption font-medium text-ink transition-colors hover:border-green hover:text-green">
          <Users className="h-3.5 w-3.5 text-green" strokeWidth={1.9} /> Your Trusted Network
        </Link>
        {bookHref && (
          <Link href={bookHref} className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface-raised px-3.5 py-2 text-caption font-medium text-ink transition-colors hover:border-green hover:text-green">
            <CalendarPlus className="h-3.5 w-3.5 text-green" strokeWidth={1.9} /> Book a visit
          </Link>
        )}
        {messageHref && (
          <Link href={messageHref} className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface-raised px-3.5 py-2 text-caption font-medium text-ink transition-colors hover:border-green hover:text-green">
            <MessageCircle className="h-3.5 w-3.5 text-green" strokeWidth={1.9} /> Message your Presence Manager
          </Link>
        )}
      </div>

      {share && <ShareSheet object={object} network={people} onAddPerson={addPerson} onClose={() => setShare(null)} onDone={onChanged} />}
      {invite && <InviteSheet object={object} step={invite.step} receiveItems={receiveItems} onClose={() => setInvite(null)} onDone={onChanged} />}
      {assign && <AssignSheet object={object} step={assign.step} network={people} onAddPerson={addPerson} onClose={() => setAssign(null)} onDone={onChanged} />}
    </div>
  )
}

function StepIcon({ kind }: { kind: NextStep['kind'] }) {
  if (kind === 'share') return <Share2 className="h-4 w-4" strokeWidth={1.9} />
  if (kind === 'assign') return <ClipboardList className="h-4 w-4" strokeWidth={1.9} />
  return <UserPlus className="h-4 w-4" strokeWidth={1.9} />
}

/* ── sheet chrome ────────────────────────────────────────────────────────────────────────────── */
function SheetShell({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <Overlay open onClose={onClose}>
      <div className="flex flex-col gap-4 px-6 py-6">
        <div>
          <h2 className="text-h4 text-ink">{title}</h2>
          <p className="mt-1 text-body-sm text-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </Overlay>
  )
}

function PersonRow({ person, selected, onClick }: { person: TrustedIdentity; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-start transition-colors ${selected ? 'border-green bg-accent-soft/60' : 'border-line/70 bg-surface-raised hover:border-green/50'}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-body-sm font-semibold text-green">
        {person.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-semibold text-ink">{person.name}</span>
        <span className="block truncate text-caption capitalize text-muted">{person.relationship || roleLabel(person.role)}</span>
      </span>
      {selected && <Check className="h-4 w-4 shrink-0 text-green" strokeWidth={2.4} />}
    </button>
  )
}

function Busy() {
  return <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
}

/** Add a person right here, mid-task — never a bounce to another screen (UAT refinement 2). */
function AddPersonInline({ defaultRole, label, onAdded }: { defaultRole: CollaborationRole; label: string; onAdded: (p: TrustedIdentity) => void }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  async function save() {
    if (!name.trim()) return
    setBusy(true)
    const r = await upsertTrustedIdentity({ name, role: defaultRole, verificationStatus: 'pending' })
    setBusy(false)
    if (r.id) { onAdded({ id: r.id, name: name.trim(), role: defaultRole, permissions: [], verificationStatus: 'pending', availability: 'unknown' }); setName(''); setOpen(false) }
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-2.5 text-body-sm font-semibold text-green transition-colors hover:border-green/60">
        <UserPlus className="h-4 w-4" strokeWidth={2} /> {label}
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void save() }} placeholder="Their name" className={inputCls} />
      <Button size="sm" className="shrink-0" disabled={!name.trim() || busy} onClick={() => void save()}>{busy ? <Busy /> : 'Add'}</Button>
    </div>
  )
}

/* ── Share ───────────────────────────────────────────────────────────────────────────────────── */
function ShareSheet({ object, network, onAddPerson, onClose, onDone }: { object: ObjectRef; network: TrustedIdentity[]; onAddPerson: (p: TrustedIdentity) => void; onClose: () => void; onDone?: () => void }) {
  const family = network.filter((p) => p.role === 'family_member' || p.role === 'owner')
  const [pick, setPick] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const chosen = family.find((p) => p.id === pick)

  async function submit() {
    if (!chosen) return
    setBusy(true); setErr(null)
    const r = await shareObject({ object, withName: chosen.name })
    setBusy(false)
    if (r.error) { setErr('Could not share — please try again.'); return }
    onDone?.(); onClose()
  }

  return (
    <SheetShell title={`Share ${object.label}`} subtitle="With someone who helps care for them — it stays private to your family." onClose={onClose}>
      <div className="flex flex-col gap-2">
        {family.map((p) => <PersonRow key={p.id} person={p} selected={pick === p.id} onClick={() => setPick(p.id)} />)}
        <AddPersonInline defaultRole="family_member" label="Add a family member" onAdded={(p) => { onAddPerson(p); setPick(p.id) }} />
      </div>
      <p className="text-caption text-muted">Saved privately to your family space{chosen ? ` — ${chosen.name} isn’t notified automatically yet` : ''}.</p>
      {err && <p className="text-caption text-error">{err}</p>}
      <Button size="md" className="w-full" disabled={!chosen || busy} onClick={() => void submit()}>
        {busy ? <Busy /> : 'Share'}
      </Button>
    </SheetShell>
  )
}

/* ── Invite (with a purpose + what they'll receive) ──────────────────────────────────────────── */
function InviteSheet({ object, step, receiveItems, onClose, onDone }: { object: ObjectRef; step: NextStep; receiveItems?: string[]; onClose: () => void; onDone?: () => void }) {
  const [name, setName] = React.useState('')
  const [contact, setContact] = React.useState('')
  const [purpose, setPurpose] = React.useState(step.rationale)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const role = step.role ?? 'guest'
  const items = receiveItems && receiveItems.length ? receiveItems : [object.label]

  async function submit() {
    if (!name.trim() || !purpose.trim()) return
    setBusy(true); setErr(null)
    // Add them to the network so they appear afterwards, then invite with the purpose.
    const created = await upsertTrustedIdentity({ name, role, contact: contact || undefined, verificationStatus: 'pending' })
    const r = await sendInvitation({ object, role, purpose, inviteeIdentityId: created.id ?? undefined, inviteeContact: contact || undefined })
    setBusy(false)
    if (r.error) { setErr(r.error); return }
    onDone?.(); onClose()
  }

  return (
    <SheetShell title={step.label} subtitle="Every invitation explains why — it should solve a problem, never just add a person." onClose={onClose}>
      <Field label="Who"><input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Name of the ${roleLabel(role)}`} className={inputCls} /></Field>
      <Field label="Email or phone"><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="So we can reach them" className={inputCls} /></Field>
      <Field label="Purpose"><textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} className={`${inputCls} resize-none`} /></Field>
      <div className="rounded-md border border-line/70 bg-surface-raised p-3">
        <p className="mb-1.5 text-caption font-semibold uppercase tracking-wider text-muted capitalize">{name.trim() || 'They'} will receive</p>
        <ul className="flex flex-col gap-1">
          {items.map((it) => (
            <li key={it} className="flex items-center gap-2 text-body-sm text-ink">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-accent-soft text-green"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span> {it}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-caption text-muted">Saved to your family space. For now, share the details with {name.trim() || 'them'} yourself — automatic delivery is coming soon.</p>
      {err && <p className="text-caption text-error">{err}</p>}
      <Button size="md" className="w-full" disabled={!name.trim() || !purpose.trim() || busy} onClick={() => void submit()}>
        {busy ? <Busy /> : 'Create invitation'}
      </Button>
    </SheetShell>
  )
}

/* ── Assign (delegate to any trusted identity, in the family's own terms) ─────────────────────── */
const TIMES: { key: string; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'tomorrow', label: 'Tomorrow', days: 1 },
  { key: 'week', label: 'This week', days: 7 },
]
function AssignSheet({ object, step, network, onAddPerson, onClose, onDone }: { object: ObjectRef; step: NextStep; network: TrustedIdentity[]; onAddPerson: (p: TrustedIdentity) => void; onClose: () => void; onDone?: () => void }) {
  const [task, setTask] = React.useState(step.label.replace(/^Assign[:\s]*/i, '') || 'Follow up')
  const [pick, setPick] = React.useState<string | null>(network[0]?.id ?? null)
  const [when, setWhen] = React.useState('tomorrow')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const chosen = network.find((p) => p.id === pick)

  function dueAtFor(key: string): string {
    const days = TIMES.find((t) => t.key === key)?.days ?? 1
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(18, 0, 0, 0)
    return d.toISOString()
  }

  async function submit() {
    if (!chosen || !task.trim()) return
    setBusy(true); setErr(null)
    const r = await assignTask({ object, task, assigneeIdentityId: chosen.id, assigneeName: chosen.name, dueAt: dueAtFor(when) })
    setBusy(false)
    if (r.error) { setErr('Could not assign — please try again.'); return }
    onDone?.(); onClose()
  }

  return (
    <SheetShell title="Assign a task" subtitle="Delegate a responsibility — it joins the timeline." onClose={onClose}>
      <Field label="Task"><input value={task} onChange={(e) => setTask(e.target.value)} className={inputCls} /></Field>
      <Field label="To">
        <div className="flex flex-col gap-2">
          {network.map((p) => <PersonRow key={p.id} person={p} selected={pick === p.id} onClick={() => setPick(p.id)} />)}
          <AddPersonInline defaultRole="family_member" label="Add someone" onAdded={(p) => { onAddPerson(p); setPick(p.id) }} />
        </div>
      </Field>
      <Field label="Estimated completion">
        <div className="flex gap-2">
          {TIMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setWhen(t.key)}
              className={`flex-1 rounded-md border py-2.5 text-body-sm font-semibold transition-colors ${when === t.key ? 'border-green bg-accent-soft/60 text-green' : 'border-line/70 bg-surface-raised text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>
      <p className="text-caption text-muted">Tracked on your family timeline{chosen ? ` — let ${chosen.name} know so they can pick it up` : ''}.</p>
      {err && <p className="text-caption text-error">{err}</p>}
      <Button size="md" className="w-full" disabled={!chosen || !task.trim() || busy} onClick={() => void submit()}>
        {busy ? <Busy /> : `Assign${chosen ? ` to ${chosen.name}` : ''}`}
      </Button>
    </SheetShell>
  )
}

/* ── small shared bits ───────────────────────────────────────────────────────────────────────── */
const inputCls = 'w-full rounded-sm border border-line/70 bg-ivory px-3.5 py-2.5 text-body text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-green/25'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption font-semibold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  )
}
