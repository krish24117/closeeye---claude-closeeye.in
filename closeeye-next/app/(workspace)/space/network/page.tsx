'use client'

/**
 * Trusted Network — where all collaboration begins. Not a contacts list: the family's trusted
 * ecosystem, grouped Family · Trusted Presence · Professionals · Business. Each person is a Trusted
 * Identity (role + scoped per-domain permissions + verification + availability). Invite, remove and
 * re-permission from one place. Reads/writes go through lib/db/collaboration; roles are data, so new
 * professional roles need no code change.
 */
import * as React from 'react'
import { UserPlus, Check, Trash2, ShieldCheck, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Overlay } from '@/components/family/overlay'
import { fetchTrustedNetworkSeeded, upsertTrustedIdentity, removeTrustedIdentity, setTrustedPermissions } from '@/lib/db/collaboration'
import type { CollaborationRole, TrustedIdentity, TrustedNetwork } from '@/lib/collaboration/types'
import type { Domain } from '@/lib/understanding/types'

const ADD_ROLES: { role: CollaborationRole; label: string }[] = [
  { role: 'family_member', label: 'Family member' },
  { role: 'doctor', label: 'Doctor' },
  { role: 'lawyer', label: 'Lawyer' },
  { role: 'chartered_accountant', label: 'Chartered Accountant' },
  { role: 'financial_advisor', label: 'Financial Advisor' },
  { role: 'presence_manager', label: 'Presence Manager' },
  { role: 'guardian', label: 'Guardian' },
  { role: 'business_partner', label: 'Business partner' },
]
const DOMAINS: { domain: Domain; label: string }[] = [
  { domain: 'health', label: 'Health' }, { domain: 'legal', label: 'Legal' }, { domain: 'property', label: 'Property' },
  { domain: 'finance', label: 'Finance' }, { domain: 'identity', label: 'Identity' }, { domain: 'trusted_presence', label: 'Presence' },
  { domain: 'general', label: 'Everyday' },
]

export default function TrustedNetworkPage() {
  const [net, setNet] = React.useState<TrustedNetwork>({ groups: [] })
  const [loading, setLoading] = React.useState(true)
  const [addOpen, setAddOpen] = React.useState(false)
  const [manage, setManage] = React.useState<TrustedIdentity | null>(null)

  const refresh = React.useCallback(async () => {
    const n = await fetchTrustedNetworkSeeded()
    setNet(n)
    setLoading(false)
  }, [])
  React.useEffect(() => { void refresh() }, [refresh])

  const empty = !loading && net.groups.length === 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h3 text-ink">Trusted Network</h1>
          <p className="mt-1 text-body-sm text-muted">The people you trust to help — family, Presence, professionals and business.</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="shrink-0">
          <UserPlus className="me-1.5 h-4 w-4" strokeWidth={1.9} /> Invite
        </Button>
      </div>

      {loading && <div className="flex justify-center py-12 text-muted"><Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} /></div>}

      {empty && (
        <div className="rounded-lg border border-line/70 bg-card p-8 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-green"><Users className="h-6 w-6" strokeWidth={1.75} /></span>
          <p className="text-body font-semibold text-ink">No one here yet</p>
          <p className="mx-auto mt-1 max-w-xs text-body-sm text-muted">Add the people who help you care — a sister, a doctor, your family&apos;s Presence Manager. They become who you can share with, invite and delegate to.</p>
          <Button size="md" className="mt-4" onClick={() => setAddOpen(true)}><UserPlus className="me-1.5 h-4 w-4" strokeWidth={1.9} /> Invite someone</Button>
        </div>
      )}

      {net.groups.map((group) => (
        <section key={group.group}>
          <p className="mb-2 px-0.5 text-caption font-semibold uppercase tracking-widest text-muted">{group.title}</p>
          <div className="overflow-hidden rounded-lg border border-line/70 bg-card shadow-sm">
            {group.members.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setManage(p)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-accent-soft/40 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-body-sm font-semibold text-green">{p.name.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-body-sm font-semibold text-ink">{p.name}</span>
                    {p.verificationStatus === 'verified' && <VerifiedBadge />}
                    {p.verificationStatus === 'pending' && <PendingBadge />}
                  </span>
                  <span className="mt-0.5 block truncate text-caption capitalize text-muted">
                    {p.relationship || p.role.replace(/_/g, ' ')}{p.organization ? ` · ${p.organization}` : ''}
                  </span>
                </span>
                <AvailabilityDot value={p.availability} />
              </button>
            ))}
          </div>
        </section>
      ))}

      {addOpen && <PersonSheet onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); void refresh() }} />}
      {manage && <ManageSheet person={manage} onClose={() => setManage(null)} onDone={() => { setManage(null); void refresh() }} />}
    </div>
  )
}

function VerifiedBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-green"><ShieldCheck className="h-3 w-3" strokeWidth={2.2} /> Verified</span>
}
function PendingBadge() {
  return <span className="inline-flex items-center rounded-full border border-line px-2 py-0.5 text-caption font-semibold text-muted">Pending</span>
}
function AvailabilityDot({ value }: { value: TrustedIdentity['availability'] }) {
  const on = value === 'available'
  return <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${on ? 'bg-green' : 'bg-line'}`} aria-label={value} />
}

const inputCls = 'w-full rounded-sm border border-line/70 bg-ivory px-3.5 py-2.5 text-body text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-green/25'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5"><span className="text-caption font-semibold uppercase tracking-wider text-muted">{label}</span>{children}</label>
}

/* ── Add a person (+ scoped permissions) ─────────────────────────────────────────────────────── */
function PersonSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState<CollaborationRole>('family_member')
  const [relationship, setRelationship] = React.useState('')
  const [organization, setOrganization] = React.useState('')
  const [contact, setContact] = React.useState('')
  const [domains, setDomains] = React.useState<Set<Domain>>(new Set(['health']))
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  function toggle(d: Domain) {
    setDomains((prev) => { const next = new Set(prev); next.has(d) ? next.delete(d) : next.add(d); return next })
  }

  async function submit() {
    if (!name.trim()) return
    setBusy(true); setErr(null)
    const created = await upsertTrustedIdentity({ name, role, relationship: relationship || undefined, organization: organization || undefined, contact: contact || undefined })
    if (created.error || !created.id) { setBusy(false); setErr('Could not add — please try again.'); return }
    await setTrustedPermissions(created.id, [...domains].map((domain) => ({ domain, view: true, comment: true, complete: false })))
    setBusy(false); onDone()
  }

  return (
    <Overlay open onClose={onClose} chrome>
      <div className="flex flex-col gap-4 px-6 py-6">
        <div><h2 className="text-h4 text-ink">Add to your network</h2><p className="mt-1 text-body-sm text-muted">Someone you trust to help with part of life.</p></div>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" className={inputCls} /></Field>
        <Field label="Role">
          <div className="flex flex-wrap gap-2">
            {ADD_ROLES.map((r) => (
              <button key={r.role} type="button" onClick={() => setRole(r.role)}
                className={`rounded-full border px-3 py-1.5 text-caption font-medium transition-colors ${role === r.role ? 'border-green bg-accent-soft/60 text-green' : 'border-line/70 bg-surface-raised text-ink'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Relationship (optional)"><input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. sister, family doctor" className={inputCls} /></Field>
        <Field label="Organization (optional)"><input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. a clinic or firm" className={inputCls} /></Field>
        <Field label="Email or phone (optional)"><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="So we can reach them" className={inputCls} /></Field>
        <Field label="Can help with">
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <button key={d.domain} type="button" onClick={() => toggle(d.domain)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors ${domains.has(d.domain) ? 'border-green bg-accent-soft/60 text-green' : 'border-line/70 bg-surface-raised text-ink'}`}>
                {domains.has(d.domain) && <Check className="h-3 w-3" strokeWidth={3} />} {d.label}
              </button>
            ))}
          </div>
        </Field>
        {err && <p className="text-caption text-error">{err}</p>}
        <Button size="md" className="w-full" disabled={!name.trim() || busy} onClick={() => void submit()}>{busy ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : 'Add to network'}</Button>
      </div>
    </Overlay>
  )
}

/* ── Manage / remove ─────────────────────────────────────────────────────────────────────────── */
function ManageSheet({ person, onClose, onDone }: { person: TrustedIdentity; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = React.useState(false)
  async function remove() {
    setBusy(true)
    await removeTrustedIdentity(person.id)
    setBusy(false); onDone()
  }
  const perms = person.permissions.filter((p) => p.view)
  return (
    <Overlay open onClose={onClose} chrome>
      <div className="flex flex-col gap-4 px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-h4 font-semibold text-green">{person.name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <h2 className="truncate text-h4 text-ink">{person.name}</h2>
            <p className="truncate text-body-sm capitalize text-muted">{person.relationship || person.role.replace(/_/g, ' ')}{person.organization ? ` · ${person.organization}` : ''}</p>
          </div>
        </div>
        <div className="rounded-md border border-line/70 bg-surface-raised p-3">
          <p className="mb-1.5 text-caption font-semibold uppercase tracking-wider text-muted">Can help with</p>
          {perms.length ? (
            <div className="flex flex-wrap gap-1.5">
              {perms.map((p) => <span key={p.domain} className="rounded-full bg-accent-soft px-2.5 py-1 text-caption font-medium capitalize text-green">{p.domain.replace(/_/g, ' ')}</span>)}
            </div>
          ) : <p className="text-body-sm text-muted">No domains granted yet.</p>}
        </div>
        <button type="button" onClick={() => void remove()} disabled={busy}
          className="flex items-center justify-center gap-2 rounded-sm border border-error/40 bg-error/5 py-3 text-body-sm font-semibold text-error transition-colors hover:bg-error/10">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <><Trash2 className="h-4 w-4" strokeWidth={1.9} /> Remove from network</>}
        </button>
      </div>
    </Overlay>
  )
}
