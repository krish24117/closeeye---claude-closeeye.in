'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ShieldCheck, Bell, Languages, Moon, Phone, CreditCard, FileDown, Trash2, Info, ChevronRight, X, Plus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LogoMark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/family/avatar'
import { SettingsToggle } from '@/components/family/settings-toggle'
import { Overlay } from '@/components/family/overlay'
import { SignOutButton } from '@/components/auth/sign-out-button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <h2 className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-body-sm font-semibold uppercase tracking-widest text-muted">
        <Icon className="h-4 w-4 text-green" strokeWidth={1.75} /> {title}
      </h2>
      <div className="divide-y divide-line">{children}</div>
    </section>
  )
}

function Row({ label, hint, value, onClick, href, danger }: { label: string; hint?: string; value?: string; onClick?: () => void; href?: string; danger?: boolean }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-body-sm font-medium', danger ? 'text-error' : 'text-ink')}>{label}</span>
        {hint && <span className="block text-caption text-muted">{hint}</span>}
      </span>
      {value && <span className="shrink-0 text-body-sm text-muted">{value}</span>}
      <ChevronRight className={cn('h-4 w-4 shrink-0', danger ? 'text-error' : 'text-muted')} strokeWidth={1.5} />
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent-soft/30'
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

export default function SettingsPage() {
  const toast = useToast()
  const [lang, setLang] = React.useState('English')
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="sticky top-0 z-20 border-b border-line bg-ivory/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link href="/family" aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-ink/[0.04]"><ArrowLeft className="h-5 w-5" strokeWidth={1.75} /></Link>
          <LogoMark className="h-7 w-7" />
          <span className="text-body-sm font-bold text-ink">Settings</span>
        </div>
      </header>

      <main className="ce-fade-in mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
        {/* Profile */}
        <section className="flex items-center gap-4 rounded-lg border border-line bg-card p-5 shadow-sm">
          <Avatar initials="AR" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-h4 text-ink">Ananya Rao</p>
            <p className="truncate text-caption text-muted">ananya@email.com · +1 416 555 0142</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => toast('Edit your profile.')}>Edit</Button>
        </section>

        {/* Account & security */}
        <Card icon={ShieldCheck} title="Account & security">
          <Row label="Personal details" hint="Name, email, phone" onClick={() => toast('Opening personal details.')} />
          <Row label="Change password" onClick={() => toast('We’ve sent a secure link to change your password.')} />
          <div className="px-5"><SettingsToggle label="Biometric sign-in" hint="Use Face ID or fingerprint" defaultOn /></div>
          <Row label="Devices & sessions" hint="See where you’re signed in" href="/auth" />
        </Card>

        {/* Notifications */}
        <Card icon={Bell} title="Notifications">
          <div className="px-5">
            <SettingsToggle label="Visit updates" hint="Check-ins, completions and delays" defaultOn />
            <SettingsToggle label="Reports & photos" hint="When a new report is ready" defaultOn />
            <SettingsToggle label="Payments & renewals" hint="Receipts and reminders" defaultOn />
            <SettingsToggle label="Offers" hint="Occasional news and referral credit" />
          </div>
        </Card>

        {/* Preferences */}
        <Card icon={Languages} title="Preferences">
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div><p className="text-body-sm font-medium text-ink">Language</p><p className="text-caption text-muted">The language across Close Eye</p></div>
            <select value={lang} onChange={(e) => { setLang(e.target.value); toast(`Language set to ${e.target.value}.`) }} className="rounded-sm border border-line bg-ivory px-3 py-2 text-body-sm font-medium text-ink focus:border-green focus:outline-none">
              {['English', 'हिन्दी', 'తెలుగు'].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-2"><Moon className="h-4 w-4 text-muted" strokeWidth={1.75} /><div><p className="text-body-sm font-medium text-ink">Dark mode</p><p className="text-caption text-muted">Easier on the eyes at night</p></div></div>
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-bold uppercase text-green">Coming soon</span>
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-line opacity-50"><span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-card shadow-sm" /></span>
            </span>
          </div>
        </Card>

        {/* Emergency contacts */}
        <Card icon={Phone} title="Emergency contacts">
          <Row label="Ananya Rao · Daughter" value="+1 416 555 0142" onClick={() => toast('Edit contact.')} />
          <Row label="Dr. Suresh · Physician" value="+91 90000 12345" onClick={() => toast('Edit contact.')} />
          <button type="button" onClick={() => toast('Add an emergency contact.')} className="flex w-full items-center gap-2 px-5 py-3.5 text-body-sm font-semibold text-green transition-colors hover:bg-accent-soft/30"><Plus className="h-4 w-4" strokeWidth={2} /> Add contact</button>
        </Card>

        {/* Membership & billing */}
        <Card icon={CreditCard} title="Membership & billing">
          <Row label="Membership" hint="Family Care · ₹8,000/mo" value="Renews 1 Mar 2027" href="/family/membership" />
          <Row label="Payment methods" hint="Visa ending 4242" onClick={() => toast('Manage payment methods.')} />
          <Row label="Invoices" hint="Download receipts" onClick={() => toast('Opening your invoices.')} />
        </Card>

        {/* Data & privacy */}
        <Card icon={FileDown} title="Data & privacy">
          <Row label="Export my data" hint="A copy of everything, emailed to you" onClick={() => toast('We’ll email your data export within 24 hours.')} />
          <Row label="Privacy policy" href="/privacy" />
          <Row label="Delete account" hint="Permanently remove your account" danger onClick={() => setConfirmDelete(true)} />
        </Card>

        {/* About */}
        <Card icon={Info} title="About">
          <Row label="About Close Eye" href="/about" />
          <Row label="Help Center" href="/help" />
          <Row label="Terms of Service" href="/terms" />
          <div className="flex items-center justify-between px-5 py-3.5"><span className="text-body-sm text-muted">Version</span><span className="text-body-sm text-muted">1.0.0 (build 100)</span></div>
        </Card>

        <SignOutButton />

        <p className="pb-4 text-center text-caption text-muted">Made with care in India · Close Eye</p>
      </main>

      {/* Delete confirm */}
      <Overlay open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-full bg-error/10 text-error"><Trash2 className="h-5 w-5" strokeWidth={1.5} /></span><h2 className="text-h4">Delete account</h2></div>
          <button onClick={() => setConfirmDelete(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft"><X className="h-5 w-5" strokeWidth={1.5} /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <p className="text-body-sm leading-relaxed text-muted">This permanently removes your account and your family’s data from Close Eye. Your loved ones’ upcoming visits will be cancelled. This can’t be undone.</p>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)}>Keep my account</Button>
            <Button size="sm" className="flex-1 bg-error hover:bg-error/90" onClick={() => { setConfirmDelete(false); toast('A confirmation link has been emailed to you.') }}>Delete</Button>
          </div>
        </div>
      </Overlay>
    </div>
  )
}
