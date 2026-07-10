'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronRight, CreditCard, LifeBuoy, Loader2, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { Button } from '@/components/ui/button'
import { SettingsToggle } from '@/components/family/settings-toggle'
import { Overlay } from '@/components/family/overlay'
import { ProfileIdentity } from '@/components/family/profile-identity'
import { MembershipCard } from '@/components/family/membership-card'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase'
import { SITE } from '@/lib/site'

// ── Reusable section primitives (existing design language) ───────────────────

/** A titled profile section card. Adding a future module (Insurance, Property
 *  Care, …) is just another <Card> in the list below — no layout redesign. */
function Card({ icon, title, action, children }: { icon: LucideIcon; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line/70 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FeatureIcon icon={icon} size="sm" />
          <h2 className="text-h4">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-3 divide-y divide-line">{children}</div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span className="shrink-0 text-body-sm text-muted">{label}</span>
      <span className="min-w-0 truncate text-body-sm font-medium text-ink">{value}</span>
    </div>
  )
}

/** Row that navigates — internal routes via Link, tel/mailto/external via <a>. */
function NavRow({ href, label, hint, value }: { href: string; label: string; hint?: string; value?: string }) {
  const external = !href.startsWith('/')
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-caption text-muted">{hint}</span>}
      </span>
      {value && <span className="shrink-0 text-body-sm text-muted">{value}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
    </>
  )
  const cls = 'flex items-center gap-3 py-3.5 transition-colors hover:opacity-80'
  return external ? (
    <a href={href} className={cls} target={href.startsWith('tel:') || href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>{body}</Link>
  )
}

function ComingSoonRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span className="text-body-sm font-medium text-ink">{label}</span>
      <span className="shrink-0 rounded-full bg-ink/[0.05] px-2.5 py-1 text-caption font-medium text-muted">Coming soon</span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { identity, profile, subscription, lovedOnes } = useFamilyData()
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const meta = (user?.user_metadata ?? {}) as { language?: string; country?: string; timezone?: string }
  const memberCount = lovedOnes.length
  const hasBilling =
    subscription?.status === 'active' || (subscription?.total_paid_paise ?? 0) > 0 || (subscription?.invoice_count ?? 0) > 0
  const upcomingPayment = subscription?.next_billing_at
    ? new Date(subscription.next_billing_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  async function deleteAccount() {
    if (deleting) return
    setDeleting(true)
    try {
      // Real deletion is server-side: cancels billing, removes the family's data,
      // and closes the account. We only sign out + leave once it actually succeeds
      // — never a fake confirmation.
      const { data, error } = await supabase.functions.invoke('delete-account')
      if (error || !data?.ok) {
        toast((data?.error as string) || 'We couldn’t close your account just now. Please try again, or contact your Presence Manager.', 'info')
        setDeleting(false)
        return
      }
      try { await signOut() } catch { /* account already closed server-side */ }
      router.replace('/welcome')
    } catch {
      toast('We couldn’t close your account just now. Please try again, or contact your Presence Manager.', 'info')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Profile" subtitle="Your account, membership and preferences." />

      {/* 1 · PERSONAL INFORMATION */}
      <ProfileIdentity />
      <Card
        icon={UserRound}
        title="Personal information"
        action={<Link href="/family/profile/edit" className="text-caption font-semibold text-green hover:underline">Edit profile</Link>}
      >
        <InfoRow label="Email" value={identity.email || '—'} />
        <InfoRow label="Mobile number" value={profile?.phone || 'Not set'} />
        <InfoRow label="Country" value={meta.country || 'India'} />
        <InfoRow label="Time zone" value={meta.timezone || 'IST · Asia/Kolkata'} />
        <InfoRow label="Preferred language" value={meta.language || 'English'} />
      </Card>

      {/* 2 · MEMBERSHIP — existing membership UI (active → plan/renewal/manage; else → activate) */}
      <MembershipCard />

      {/* 3 · FAMILY SUMMARY — summary only, never the family cards */}
      <Card icon={Users} title="Family">
        {memberCount > 0 ? (
          <NavRow
            href="/family/members"
            label="Family members"
            hint={`${memberCount} ${memberCount === 1 ? 'member' : 'members'} added`}
            value="View family"
          />
        ) : (
          <div className="flex flex-col items-start gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-body-sm text-muted">No family members added yet.</p>
            <Button asChild size="sm" className="shrink-0"><Link href="/family/add">Add family member</Link></Button>
          </div>
        )}
      </Card>

      {/* 4 · PAYMENT & BILLING */}
      <Card icon={CreditCard} title="Payment & billing">
        {hasBilling ? (
          <>
            <NavRow href="/family/billing" label="Payment history" hint="Invoices, receipts and renewals" />
            {upcomingPayment && <InfoRow label="Upcoming payment" value={upcomingPayment} />}
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-body-sm text-ink">No payment history yet.</p>
              <p className="text-caption text-muted">Activate a membership to begin.</p>
            </div>
            <Button asChild size="sm" className="shrink-0"><Link href="/family/membership">Activate membership</Link></Button>
          </div>
        )}
      </Card>

      {/* 5 · NOTIFICATIONS */}
      <Card icon={Bell} title="Notifications">
        <SettingsToggle label="WhatsApp updates" hint="Photos and notes after every visit" defaultOn />
        <SettingsToggle label="Email updates" defaultOn />
        <SettingsToggle label="Push notifications" defaultOn />
        <SettingsToggle label="Emergency alerts" hint="Always on for your family's safety" defaultOn />
        <SettingsToggle label="Marketing updates" />
      </Card>

      {/* 6 · SECURITY */}
      <Card icon={ShieldCheck} title="Security">
        <ComingSoonRow label="Change password" />
        <ComingSoonRow label="Manage login" />
        <ComingSoonRow label="Two-factor authentication" />
        <div className="flex flex-col gap-3 pt-4">
          <SignOutButton />
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center justify-center gap-2 rounded-sm py-2.5 text-body-sm font-semibold text-error transition-colors hover:bg-error/[0.06]"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Delete account
          </button>
        </div>
      </Card>

      {/* 7 · SUPPORT */}
      <Card icon={LifeBuoy} title="Support">
        <NavRow href="/family/connect" label="Contact Presence Manager" />
        <NavRow href="/help" label="Help Centre" />
        <NavRow href={SITE.phoneHref} label="Emergency support" value={SITE.phoneDisplay} />
        <NavRow href="/privacy" label="Privacy Policy" />
        <NavRow href="/terms" label="Terms & Conditions" />
        <NavRow href="/about" label={`About ${SITE.name}`} />
      </Card>

      <p className="pb-2 text-center text-caption text-muted">{SITE.name}</p>

      <Overlay open={confirmDelete} onClose={() => { if (!deleting) setConfirmDelete(false) }}>
        <div className="p-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-error/10 text-error"><Trash2 className="h-5 w-5" strokeWidth={1.75} /></span>
            <h3 className="text-h4 text-ink">Delete your account?</h3>
          </div>
          <p className="mt-3 text-body-sm leading-relaxed text-muted">
            This permanently closes your Close Eye account. Your membership billing stops immediately, your family’s data is removed, and you’ll be signed out. This can’t be undone.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <Button size="lg" onClick={deleteAccount} disabled={deleting} className="w-full bg-error text-white hover:bg-error/90">
              {deleting ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Deleting…</> : <><Trash2 className="h-5 w-5" strokeWidth={1.75} /> Delete account</>}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setConfirmDelete(false)} disabled={deleting} className="w-full">Keep my account</Button>
          </div>
        </div>
      </Overlay>
    </div>
  )
}
