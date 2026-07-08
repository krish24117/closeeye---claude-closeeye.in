'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Lock, UserRound, BadgeCheck, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { Button } from '@/components/ui/button'
import { SettingsToggle } from '@/components/family/settings-toggle'
import { Overlay } from '@/components/family/overlay'
import { ProfileIdentity } from '@/components/family/profile-identity'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { RequestDataButton } from '@/components/family/profile-actions'
import { useAuth } from '@/components/auth/auth-provider'
import { useFamilyData } from '@/components/family/family-data-provider'
import { planById } from '@/lib/plans'

function Card({ icon, title, action, children }: { icon: LucideIcon; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
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

function LinkRow({ href, label, hint, value }: { href: string; label: string; hint?: string; value?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 py-3.5 transition-colors hover:opacity-80">
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-caption text-muted">{hint}</span>}
      </span>
      {value && <span className="shrink-0 text-body-sm text-muted">{value}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
    </Link>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { identity, profile, subscription, lovedOnes } = useFamilyData()
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const meta = (user?.user_metadata ?? {}) as { language?: string; emergency_contact_name?: string; emergency_contact_phone?: string }
  const plan = planById(subscription?.plan_id)
  const membershipValue = subscription?.status === 'active' ? 'Active' : subscription ? 'Not active' : 'No plan'
  const emergency = meta.emergency_contact_name
    ? `${meta.emergency_contact_name}${meta.emergency_contact_phone ? ` · ${meta.emergency_contact_phone}` : ''}`
    : 'Not set'

  async function deleteAccount() {
    setDeleting(true)
    try {
      // Request-based deletion: sign the user out now; full erasure of the auth
      // record runs server-side (see deliverable — needs a delete-account fn).
      await signOut()
      router.replace('/welcome')
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Profile & settings" subtitle="Your details and how we stay in touch." />

      <ProfileIdentity />

      <Card
        icon={UserRound}
        title="Personal information"
        action={<Link href="/family/profile/edit" className="text-caption font-semibold text-green hover:underline">Edit</Link>}
      >
        <InfoRow label="Mobile" value={profile?.phone || 'Not set'} />
        <InfoRow label="Email" value={identity.email || '—'} />
        <InfoRow label="Language" value={meta.language || 'English'} />
        <InfoRow label="Emergency contact" value={emergency} />
      </Card>

      <Card icon={BadgeCheck} title="Plan & family">
        <LinkRow href="/family/membership" label="Membership" hint={plan ? plan.name : 'Choose a plan'} value={membershipValue} />
        <LinkRow href="/family/members" label="Family" hint={`${lovedOnes.length} ${lovedOnes.length === 1 ? 'member' : 'members'}`} />
      </Card>

      <Card icon={Bell} title="Notifications">
        <SettingsToggle label="WhatsApp updates" hint="Photos and notes after every visit" defaultOn />
        <SettingsToggle label="Same-day report summaries" defaultOn />
        <SettingsToggle label="Upcoming visit reminders" defaultOn />
        <SettingsToggle label="Monthly family digest" />
      </Card>

      <Card icon={Lock} title="Privacy">
        <SettingsToggle label="Only my family can see updates" defaultOn />
        <SettingsToggle label="Hide addresses from reports" />
        <div className="flex items-center justify-between py-3.5">
          <p className="text-body-sm text-ink">Download my data</p>
          <RequestDataButton />
        </div>
      </Card>

      <div className="flex flex-col gap-3 pt-1">
        <SignOutButton />
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center justify-center gap-2 rounded-sm py-2.5 text-body-sm font-semibold text-error transition-colors hover:bg-error/[0.06]"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Delete account
        </button>
      </div>

      <p className="pb-2 text-center text-caption text-muted">Close Eye · {plan ? plan.name : 'No membership'}</p>

      <Overlay open={confirmDelete} onClose={() => { if (!deleting) setConfirmDelete(false) }}>
        <div className="p-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-error/10 text-error"><Trash2 className="h-5 w-5" strokeWidth={1.75} /></span>
            <h3 className="text-h4 text-ink">Delete your account?</h3>
          </div>
          <p className="mt-3 text-body-sm leading-relaxed text-muted">
            This starts permanent deletion of your Close Eye account and family data. You’ll be signed out now, and full removal completes within 30 days. This can’t be undone.
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
