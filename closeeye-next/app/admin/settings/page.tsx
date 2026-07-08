import { KeyRound, Plug, Phone, ShieldCheck, Building2 } from 'lucide-react'
import { SettingsToggle } from '@/components/family/settings-toggle'
import { TEAM_ROLES, INTEGRATIONS, ADMIN } from '@/lib/admin-data'

export default function AdminSettingsPage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-h2">Settings</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Business, security, roles, integrations and emergency contacts.</p>
      </div>

      {/* Business */}
      <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-h4"><Building2 className="h-5 w-5 text-green" strokeWidth={1.5} /> Business</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-caption text-muted">Legal name</dt><dd className="text-body-sm font-medium text-ink">Close Eye Care Pvt. Ltd.</dd></div>
          <div><dt className="text-caption text-muted">GSTIN</dt><dd className="text-body-sm font-medium text-ink">36ABCDE1234F1Z5</dd></div>
          <div><dt className="text-caption text-muted">Primary city</dt><dd className="text-body-sm font-medium text-ink">Hyderabad</dd></div>
          <div><dt className="text-caption text-muted">Owner</dt><dd className="text-body-sm font-medium text-ink">{ADMIN.name}</dd></div>
        </dl>
      </section>

      {/* Security */}
      <section className="rounded-lg border border-line bg-card px-6 shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-line py-4 text-h4"><ShieldCheck className="h-5 w-5 text-green" strokeWidth={1.5} /> Security</h2>
        <div className="divide-y divide-line">
          <SettingsToggle label="Two-factor authentication" hint="Required for all admin accounts" defaultOn />
          <SettingsToggle label="Login alerts" hint="Notify on new-device sign-ins" defaultOn />
          <SettingsToggle label="Session auto-lock" hint="Lock after 15 minutes idle" />
        </div>
      </section>

      {/* Roles */}
      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <h2 className="border-b border-line px-6 py-4 text-h4">Roles &amp; access</h2>
        <ul className="divide-y divide-line">
          {TEAM_ROLES.map((r) => (
            <li key={r.name} className="flex items-center gap-3 px-6 py-3.5">
              <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold text-ink">{r.name}</span><span className="block text-caption text-muted">{r.role}</span></span>
              <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-semibold text-green">{r.access}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Integrations */}
      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <h2 className="flex items-center gap-2 border-b border-line px-6 py-4 text-h4"><Plug className="h-5 w-5 text-green" strokeWidth={1.5} /> Integrations</h2>
        <ul className="divide-y divide-line">
          {INTEGRATIONS.map((i) => (
            <li key={i.name} className="flex items-center gap-3 px-6 py-3.5">
              <span className="min-w-0 flex-1"><span className="block text-body-sm font-semibold text-ink">{i.name}</span><span className="block text-caption text-muted">{i.purpose}</span></span>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-0.5 text-caption font-semibold text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Connected</span>
            </li>
          ))}
        </ul>
      </section>

      {/* API keys + emergency */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-h4"><KeyRound className="h-5 w-5 text-green" strokeWidth={1.5} /> API keys</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between rounded-md border border-line bg-ivory px-3.5 py-2.5"><span className="text-caption text-muted">Live key</span><code className="text-body-sm text-ink">ce_live_••••••4f2a</code></div>
            <div className="flex items-center justify-between rounded-md border border-line bg-ivory px-3.5 py-2.5"><span className="text-caption text-muted">Webhook secret</span><code className="text-body-sm text-ink">whsec_••••••9b1c</code></div>
          </div>
        </section>
        <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-h4"><Phone className="h-5 w-5 text-green" strokeWidth={1.5} /> Emergency contacts</h2>
          <ul className="mt-4 flex flex-col gap-2 text-body-sm">
            <li className="flex items-center justify-between"><span className="text-ink">Operations lead</span><a href="tel:+919000221261" className="font-semibold text-green hover:underline">+91 90002 21261</a></li>
            <li className="flex items-center justify-between"><span className="text-ink">Ambulance</span><a href="tel:108" className="font-semibold text-green hover:underline">108</a></li>
            <li className="flex items-center justify-between"><span className="text-ink">On-call founder</span><a href="tel:+919000551142" className="font-semibold text-green hover:underline">+91 90005 51142</a></li>
          </ul>
        </section>
      </div>
    </div>
  )
}
