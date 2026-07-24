'use client'

/**
 * Profile — the Dock's "Profile" tab (canonical Settings Owner route, /space/settings).
 *
 * Redesigned (founder-approved, 2026-07-21) from a wall of marketing cards into a calm,
 * Apple-style control center: the identity is a tappable hero, everything else is scannable
 * grouped rows (label · value · chevron), and the reassuring copy lives INSIDE the detail each
 * row opens — not on the index. GLOBAL Connect only: NO India Care membership, NO closeeye.in
 * eldercare content. Honest: states only what's true (no fabricated people or dates).
 */
import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2, LogOut, Trash2, ChevronRight, Sparkles, ShieldCheck, Lock, FileText, Bell, UserRound,
  LifeBuoy, Mail, Pencil,
} from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'
import { supabase } from '@/lib/supabase'
import { Overlay } from '@/components/family/overlay'
import { hasActiveConsent, recordConsent } from '@/lib/db/consent'
import { useFamilyData } from '@/components/family/family-data-provider'
import { planById } from '@/lib/plans'
import { computeCompleteness, fetchHealthLiteMap, EMPTY_HEALTH, type HealthLite } from '@/lib/db/profile'
import { resetAnalytics } from '@/lib/analytics'

// Public support inbox.
const HELP_EMAIL = 'hello@closeeye.in'

const initialsFrom = (name?: string | null, email?: string | null) => {
  const raw = (name || email?.split('@')[0] || '').trim()
  const parts = raw ? raw.split(/\s+/) : []
  return (parts.slice(0, 2).map((s) => s[0]).join('') || '?').toUpperCase()
}

type Sheet = null | 'edit' | 'plan' | 'privacy' | 'consent' | 'notify' | 'help' | 'delete' | 'legal-privacy' | 'legal-terms'

/** One tappable settings row — icon tile · label · value+chevron. A Link when it navigates. */
function Row({ icon: Icon, label, value, dot, onClick, href }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string; value?: string; dot?: boolean; onClick?: () => void; href?: string
}) {
  const inner = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-accent text-brand"><Icon className="h-5 w-5" strokeWidth={1.8} /></span>
      <span className="flex-1 text-body-sm font-semibold text-content">{label}</span>
      <span className="flex items-center gap-1.5 text-caption text-content-muted">
        {dot && <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />}
        {value}
        <ChevronRight className="h-4 w-4 text-edge" strokeWidth={2} />
      </span>
    </>
  )
  const cls = 'flex w-full items-center gap-3 border-t border-edge/40 px-4 py-3.5 text-left transition-colors first:border-t-0 hover:bg-surface-accent/30'
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-7 px-1 text-caption font-semibold uppercase tracking-wider text-content-muted">{children}</p>
}
function Group({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-edge/70 bg-surface-raised shadow-sm">{children}</div>
}
function SheetShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-edge" aria-hidden />
      <h3 className="text-h4 text-content">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()

  const metaName = (user?.user_metadata?.full_name as string | undefined) || (user?.user_metadata?.name as string | undefined) || null
  const email = user?.email || ''
  const [displayName, setDisplayName] = React.useState<string | null>(metaName)
  React.useEffect(() => { setDisplayName(metaName) }, [metaName])
  const initials = initialsFrom(displayName, email)

  const [sheet, setSheet] = React.useState<Sheet>(null)

  // Real membership + the self family-profile bridge (Profile-tab update, 2026-07-24).
  const { subscription, lovedOnes } = useFamilyData()
  const planName = subscription?.plan_id ? planById(subscription.plan_id)?.name ?? null : null
  const planShort = planName ? planName.replace(/^Close Eye\s+/i, '') : null
  const planActive = subscription?.status === 'active'
  const me = lovedOnes.find((l) => (l.relationship ?? '').trim().toLowerCase() === 'self')
  const [myHealth, setMyHealth] = React.useState<HealthLite>(EMPTY_HEALTH)
  React.useEffect(() => {
    if (!me?.id) return
    let active = true
    void fetchHealthLiteMap([me.id]).then((m2) => { if (active) setMyHealth(m2[me.id] ?? EMPTY_HEALTH) })
    return () => { active = false }
  }, [me?.id])
  const myPct = me ? computeCompleteness(me, myHealth).pct : null
  const [err, setErr] = React.useState('')

  // Edit name
  const [editName, setEditName] = React.useState('')
  const [savingName, setSavingName] = React.useState(false)

  // Consent (DPDP): null = checking, true/false = current state.
  const [consented, setConsented] = React.useState<boolean | null>(null)
  const [withdrawing, setWithdrawing] = React.useState(false)
  React.useEffect(() => { void hasActiveConsent().then(setConsented) }, [])

  // Close account
  const [deleting, setDeleting] = React.useState(false)

  const busy = savingName || withdrawing || deleting
  const closeSheet = () => { if (!busy) { setSheet(null); setErr('') } }

  function openEdit() { setEditName(displayName ?? ''); setErr(''); setSheet('edit') }

  async function saveName() {
    if (!user || savingName) return
    const full_name = editName.trim()
    if (full_name.length < 2) { setErr('Please enter your name.'); return }
    setSavingName(true); setErr('')
    // Inline update (NOT saveProfileBasics — that nulls phone/whatsapp on a name-only save).
    const { error: pErr } = await supabase.from('profiles').update({ full_name }).eq('id', user.id)
    const { error: aErr } = await supabase.auth.updateUser({ data: { full_name } })
    setSavingName(false)
    if (pErr || aErr) { setErr('We couldn’t save your name just now. Please try again.'); return }
    setDisplayName(full_name)
    setSheet(null)
  }

  async function withdrawConsent() {
    if (withdrawing) return
    setWithdrawing(true); setErr('')
    try {
      await recordConsent({ granted: false }) // append-only; the server gate reads the latest
      resetAnalytics()
      setConsented(false)
    } catch {
      setErr('We couldn’t update your consent just now. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  async function signOut() {
    try { await supabase.auth.signOut() } catch {}
    router.replace('/')
  }

  async function closeAccount() {
    if (deleting) return
    setDeleting(true); setErr('')
    try {
      const { data, error } = await supabase.functions.invoke('delete-account')
      if (error || !data?.ok) { setErr((data?.error as string) || 'We couldn’t close your account just now. Please try again.'); setDeleting(false); return }
      try { await supabase.auth.signOut() } catch {}
      router.replace('/')
    } catch {
      setErr('We couldn’t close your account just now. Please try again.'); setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div>
        <p className="text-caption font-semibold uppercase tracking-widest text-content-muted">Profile</p>
        <h1 className="mt-1 text-h2 text-content">You and your access.</h1>
      </div>

      {/* Identity hero — tappable → edit */}
      <button type="button" onClick={openEdit} className="mt-6 flex w-full items-center gap-4 rounded-lg border border-edge/70 bg-surface-raised p-5 text-left shadow-sm transition-colors hover:bg-surface-accent/20">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface-accent text-h4 font-semibold text-brand">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-content">{displayName || 'Your account'}</p>
          {email && <p className="truncate text-body-sm text-content-muted">{email}</p>}
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-surface-accent px-2.5 py-0.5 text-caption font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden /> {planActive && planShort ? `${planShort} member` : 'Close Eye'}
          </span>
        </div>
        <Pencil className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={1.75} />
      </button>

      <SectionHead>Your profile</SectionHead>
      <Group>
        <Row icon={UserRound} label="Your family profile" value={me ? (myPct != null ? `${myPct}% complete` : 'Open') : 'Add yourself'} onClick={() => router.push(me ? `/space/people/${me.id}` : '/space/people/add?rel=Self')} />
      </Group>

      <SectionHead>Membership</SectionHead>
      <Group>
        <Row icon={Sparkles} label="Plan" value={planActive && planShort ? planShort : planShort ? `${planShort} · not active` : 'No plan yet'} onClick={() => setSheet('plan')} />
      </Group>

      <SectionHead>Privacy &amp; data</SectionHead>
      <Group>
        <Row icon={ShieldCheck} label="Who can see your family" value="Only you" onClick={() => setSheet('privacy')} />
        <Row icon={Lock} label="Data & consent" value={consented === false ? 'Paused' : 'Active'} dot={consented !== false} onClick={() => setSheet('consent')} />
        <Row icon={FileText} label="Privacy notice" onClick={() => setSheet('legal-privacy')} />
      </Group>

      <SectionHead>Notifications</SectionHead>
      <Group>
        <Row icon={Bell} label="What Close Eye tells you" onClick={() => setSheet('notify')} />
      </Group>

      <SectionHead>About</SectionHead>
      <Group>
        <Row icon={LifeBuoy} label="Help & contact" onClick={() => setSheet('help')} />
        <Row icon={FileText} label="Terms of service" onClick={() => setSheet('legal-terms')} />
      </Group>

      {/* Account actions */}
      <button type="button" onClick={signOut} className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg border border-edge/70 bg-surface-raised py-3.5 text-body-sm font-semibold text-content shadow-sm transition-colors hover:bg-surface-accent/40">
        <LogOut className="h-4 w-4" strokeWidth={1.75} /> Sign out
      </button>
      <button type="button" onClick={() => { setErr(''); setSheet('delete') }} className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg py-3 text-body-sm font-semibold text-error transition-colors hover:bg-error/[0.06]">
        <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Close account
      </button>

      <p className="mt-5 text-center text-caption text-content-muted">Close Eye · v1.0</p>

      {/* ── Detail sheets ── */}
      <Overlay open={sheet !== null} onClose={closeSheet}>
        {sheet === 'edit' && (
          <SheetShell title="Your profile">
            <p className="text-body-sm leading-relaxed text-content-muted">This is you — how Close Eye greets you.</p>
            <label htmlFor="pf-name" className="mb-1.5 mt-5 block text-caption font-semibold uppercase tracking-wide text-content-muted">Name</label>
            <input id="pf-name" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus placeholder="Your name"
              className="w-full rounded-lg border border-edge bg-surface px-4 py-3 text-body text-content placeholder:text-content-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
            <label htmlFor="pf-email" className="mb-1.5 mt-4 block text-caption font-semibold uppercase tracking-wide text-content-muted">Email</label>
            <input id="pf-email" value={email} disabled className="w-full rounded-lg border border-edge bg-surface-accent/30 px-4 py-3 text-body text-content-muted" />
            <p className="mt-2 text-caption text-content-muted">Your email is how you sign in. Contact us to change it.</p>
            {err && <p className="mt-3 text-caption text-error">{err}</p>}
            <div className="mt-5 flex flex-col gap-2.5">
              <button onClick={saveName} disabled={savingName} className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-surface-inverse text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-60">
                {savingName ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Saving…</> : 'Save'}
              </button>
              <button onClick={closeSheet} disabled={savingName} className="min-h-[2.75rem] w-full rounded-full text-body-sm font-semibold text-content-muted transition-colors hover:text-content disabled:opacity-50">Cancel</button>
            </div>
          </SheetShell>
        )}

        {sheet === 'plan' && (
          <SheetShell title={planActive && planShort ? `Close Eye ${planShort}` : 'Membership'}>
            <p className="text-body-sm leading-relaxed text-content-muted">
              {planActive && planShort
                ? 'Your family has an active plan — a trusted presence for the people you love, and proof for you.'
                : 'Choose how Close Eye is there for your family — occasional help, staying prepared, or a dedicated trusted presence.'}
            </p>
            <Link href="/space/billing/plan" onClick={closeSheet} className="mt-5 inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-surface-inverse text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90">
              {planActive ? 'Manage plan →' : 'Choose a plan →'}
            </Link>
            <button onClick={closeSheet} className="mt-2.5 min-h-[2.75rem] w-full rounded-full text-body-sm font-semibold text-content-muted transition-colors hover:text-content">Close</button>
          </SheetShell>
        )}

        {sheet === 'privacy' && (
          <SheetShell title="Only you">
            <p className="text-body-sm leading-relaxed text-content-muted">
              Everything you tell Close Eye stays private to your family. It’s never sold, and never shared without your say.
            </p>
            <Link href="/privacy" className="mt-5 inline-block text-body-sm font-semibold text-brand hover:text-brand/80">Read our privacy notice ›</Link>
            <button onClick={closeSheet} className="mt-6 min-h-[2.75rem] w-full rounded-full border border-edge bg-surface-raised text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50">Done</button>
          </SheetShell>
        )}

        {sheet === 'consent' && (
          <SheetShell title="Your data stays yours">
            <p className="text-body-sm leading-relaxed text-content-muted">
              Everything you tell Close Eye about your family is held so it can remember and give grounded answers — private to you, never sold, never shared.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-edge bg-surface px-4 py-3.5">
              <span className="text-body-sm font-semibold text-content">Consent</span>
              {consented === false
                ? <span className="text-body-sm font-semibold text-content-muted">Paused</span>
                : <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand"><span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden /> Active</span>}
            </div>
            {consented !== false ? (
              <button onClick={withdrawConsent} disabled={withdrawing || consented === null}
                className="mt-4 inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-full border border-edge bg-surface-raised text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50 disabled:opacity-60">
                {withdrawing ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Updating…</> : 'Withdraw my consent'}
              </button>
            ) : (
              <p className="mt-4 rounded-lg bg-surface-accent/50 px-4 py-3 text-body-sm leading-relaxed text-content">
                Consent paused. Close Eye won’t process new questions about your family until you agree again — just ask a question and you’ll be invited to.
              </p>
            )}
            <p className="mt-4 text-caption leading-relaxed text-content-muted">
              Withdrawing pauses new questions about your family until you agree again. To remove your data entirely, use <span className="font-semibold text-error">Close account</span>.
            </p>
            {err && <p className="mt-3 text-caption text-error">{err}</p>}
            <Link href="/privacy" className="mt-5 inline-block text-body-sm font-semibold text-brand hover:text-brand/80">Read our privacy notice ›</Link>
          </SheetShell>
        )}

        {sheet === 'notify' && (
          <SheetShell title="What Close Eye tells you">
            <p className="text-body-sm leading-relaxed text-content-muted">Close Eye reaches out only about things that matter. Never noise, never marketing.</p>
            <ul className="mt-4 flex flex-col divide-y divide-edge/40">
              {[
                { label: 'Visit updates', note: 'Booking confirmations and visit completions', always: false },
                { label: 'Family messages', note: 'Messages from your Presence Manager', always: false },
                { label: 'Billing', note: 'Receipts and renewal reminders', always: false },
                { label: 'Emergency alerts', note: 'Safety escalations — always on', always: true },
              ].map(({ label, note, always }) => (
                <li key={label} className="flex items-start justify-between gap-3 py-3">
                  <span>
                    <span className="block text-body-sm font-semibold text-content">{label}</span>
                    <span className="block text-caption text-content-muted">{note}</span>
                  </span>
                  {always
                    ? <span className="shrink-0 rounded-full bg-error/10 px-2.5 py-0.5 text-caption font-semibold text-error">Always on</span>
                    : <span className="shrink-0 rounded-full bg-surface-accent px-2.5 py-0.5 text-caption font-semibold text-brand">On</span>}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-caption text-content-muted">Fine-grained controls coming soon. For urgent changes contact us.</p>
            <button onClick={closeSheet} className="mt-5 min-h-[2.75rem] w-full rounded-full border border-edge bg-surface-raised text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50">Done</button>
          </SheetShell>
        )}

        {sheet === 'help' && (
          <SheetShell title="We’re here">
            <p className="text-body-sm leading-relaxed text-content-muted">
              Email us any time and a real person replies — usually within a day.
            </p>
            <a href={`mailto:${HELP_EMAIL}`} className="mt-5 inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-surface-inverse text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90">
              <Mail className="h-4 w-4" strokeWidth={2} /> {HELP_EMAIL}
            </a>
            <button onClick={closeSheet} className="mt-2.5 min-h-[2.75rem] w-full rounded-full text-body-sm font-semibold text-content-muted transition-colors hover:text-content">Close</button>
          </SheetShell>
        )}

        {sheet === 'legal-privacy' && (
          <SheetShell title="Privacy Notice">
            <div className="flex flex-col gap-4">
              {[
                { h: 'What we hold', p: 'Only what you choose to share: who your loved ones are, any wellbeing or health details you add, the questions you ask, and photos or documents saved as memories. Plus your name and email.' },
                { h: 'How we use it', p: 'To remember what matters about your family and give grounded answers over time. Questions are sent to Anthropic (our AI provider) to compose answers — they process it to respond and don\'t keep it. We never sell your data.' },
                { h: 'Who can see it', p: 'Only you. Your family\'s information is private to your account.' },
                { h: 'Where it\'s kept', p: 'Stored securely with our infrastructure provider (Supabase), encrypted, and isolated so only your account can reach your family\'s data.' },
                { h: 'Your rights', p: 'See, correct, or delete your data at any time. Withdraw consent from Profile → Data & consent. Close your account to erase everything.' },
                { h: 'Questions or complaints', p: 'Email hello@closeeye.in — a real person replies. Last updated: 20 July 2026.' },
              ].map(({ h, p }) => (
                <div key={h}>
                  <p className="text-body-sm font-semibold text-content">{h}</p>
                  <p className="mt-0.5 text-body-sm leading-relaxed text-content-muted">{p}</p>
                </div>
              ))}
            </div>
            <button onClick={closeSheet} className="mt-6 min-h-[2.75rem] w-full rounded-full border border-edge bg-surface-raised text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50">Done</button>
          </SheetShell>
        )}

        {sheet === 'legal-terms' && (
          <SheetShell title="Terms of Service">
            <p className="text-body-sm leading-relaxed text-content-muted">The plain-language version of what you can expect from us, and what we ask of you.</p>
            <div className="mt-4 flex flex-col gap-4">
              {[
                { h: 'Our promise', p: 'Close Eye provides trusted human presence — wellbeing visits, companionship, coordination — for your loved ones. We\'re a care and support service, not a medical provider.' },
                { h: 'Your account', p: 'You\'re responsible for keeping your login secure and your family\'s details accurate. Let us know if anything changes so we can care for your family well.' },
                { h: 'Membership & visits', p: 'Visits are delivered under your chosen membership. Availability depends on your city and zone; we\'ll always tell you honestly what we can and can\'t do.' },
                { h: 'Fair use', p: 'Emergencies always go to 108 or your physician first. Close Eye supports alongside, not instead of, emergency services.' },
                { h: 'Changes', p: 'We may update these terms as the service grows. We\'ll tell you about anything important in advance, in language you can actually read.' },
              ].map(({ h, p }) => (
                <div key={h}>
                  <p className="text-body-sm font-semibold text-content">{h}</p>
                  <p className="mt-0.5 text-body-sm leading-relaxed text-content-muted">{p}</p>
                </div>
              ))}
            </div>
            <button onClick={closeSheet} className="mt-6 min-h-[2.75rem] w-full rounded-full border border-edge bg-surface-raised text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50">Done</button>
          </SheetShell>
        )}

        {sheet === 'delete' && (
          <SheetShell title="Close your account?">
            <p className="text-body-sm leading-relaxed text-content-muted">
              This permanently closes your Close Eye account and removes your family’s data. You’ll be signed out. This can’t be undone.
            </p>
            {err && <p className="mt-3 rounded-sm border border-error/20 bg-error/[0.04] px-3.5 py-2.5 text-caption text-error">{err}</p>}
            <div className="mt-5 flex flex-col gap-2.5">
              <button onClick={closeSheet} disabled={deleting} className="min-h-[3rem] w-full rounded-full border border-edge bg-surface-raised text-body-sm font-semibold text-content transition-colors hover:bg-surface-accent/50 disabled:opacity-50">Keep my account</button>
              <button onClick={closeAccount} disabled={deleting} className="inline-flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-full bg-error text-body-sm font-semibold text-content-inverse transition-opacity hover:opacity-90 disabled:opacity-60">
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Closing…</> : <><Trash2 className="h-4 w-4" strokeWidth={1.75} /> Close account</>}
              </button>
            </div>
          </SheetShell>
        )}
      </Overlay>
    </div>
  )
}
