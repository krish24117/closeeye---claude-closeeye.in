import Link from 'next/link'
import { LogOut, ShieldCheck, Bell, Lock, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/family/page-header'
import { Button } from '@/components/ui/button'
import { FeatureIcon } from '@/components/ui/feature-icon'
import { SettingsToggle } from '@/components/family/settings-toggle'
import { RequestDataButton, ManageSessionsButton } from '@/components/family/profile-actions'
import { ProfileIdentity } from '@/components/family/profile-identity'

function Card({ icon, title, children }: { icon: typeof Bell; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <FeatureIcon icon={icon} size="sm" />
        <h2 className="text-h4">{title}</h2>
      </div>
      <div className="mt-3 divide-y divide-line">{children}</div>
    </section>
  )
}

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Profile & settings" subtitle="Your details and how we stay in touch." />

      {/* Identity */}
      <ProfileIdentity />

      <Card icon={Bell} title="Communication preferences">
        <SettingsToggle label="WhatsApp updates" hint="Photos and notes after every visit" defaultOn />
        <SettingsToggle label="Same-day report summaries" defaultOn />
        <SettingsToggle label="Upcoming visit reminders" defaultOn />
        <SettingsToggle label="Monthly family digest" />
      </Card>

      <Card icon={UserRound} title="Family preferences">
        <SettingsToggle label="Preferred language: Telugu" hint="Guardians will greet in Telugu where possible" defaultOn />
        <SettingsToggle label="Prefer morning visits" defaultOn />
        <SettingsToggle label="Allow photos in updates" hint="You control what is shared" defaultOn />
      </Card>

      <Card icon={Lock} title="Privacy">
        <SettingsToggle label="Only my family can see updates" defaultOn />
        <SettingsToggle label="Hide addresses from reports" />
        <div className="flex items-center justify-between py-4">
          <p className="text-body-sm text-ink">Download my data</p>
          <RequestDataButton />
        </div>
      </Card>

      <Card icon={ShieldCheck} title="Security">
        <SettingsToggle label="Two-step verification" hint="An extra layer for your family's information" defaultOn />
        <div className="flex items-center justify-between py-4">
          <p className="text-body-sm text-ink">Active sessions</p>
          <ManageSessionsButton />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <Button asChild variant="secondary">
          <Link href="/">
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sign out
          </Link>
        </Button>
        <p className="text-caption text-muted">Close Eye · Family Care membership</p>
      </div>
    </div>
  )
}
