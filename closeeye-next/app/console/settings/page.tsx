import { Avatar } from '@/components/family/avatar'
import { StatusBadge } from '@/components/family/badges'
import { SettingsToggle } from '@/components/family/settings-toggle'
import { PM, GUARDIANS } from '@/lib/console-data'

export default function SettingsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-h2">Settings</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">Your profile, notifications and team.</p>
      </div>

      {/* Profile */}
      <section className="flex items-center gap-4 rounded-lg border border-line bg-card p-6 shadow-sm">
        <Avatar initials={PM.initials} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-h4 text-ink">{PM.name}</p>
          <p className="text-caption text-muted">{PM.role} · {PM.city}</p>
          <p className="mt-1 text-caption text-muted">{PM.phone}</p>
        </div>
        <StatusBadge label="Available now" tone="positive" />
      </section>

      {/* Notifications */}
      <section className="rounded-lg border border-line bg-card px-6 shadow-sm">
        <h2 className="border-b border-line py-4 text-h4">Notifications</h2>
        <div className="divide-y divide-line">
          <SettingsToggle label="Guardian check-ins & delays" hint="Know the moment a visit starts or runs late" defaultOn />
          <SettingsToggle label="New family requests" hint="When a family prepares an ask for the next visit" defaultOn />
          <SettingsToggle label="Escalations & emergencies" hint="Always on for anything urgent" defaultOn />
          <SettingsToggle label="Daily operations summary" hint="A calm 8am recap of the day ahead" />
        </div>
      </section>

      {/* Team */}
      <section className="rounded-lg border border-line bg-card px-6 shadow-sm">
        <h2 className="border-b border-line py-4 text-h4">Your guardians</h2>
        <ul className="divide-y divide-line">
          {GUARDIANS.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-3.5">
              <Avatar initials={g.initials} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold text-ink">{g.name}</p>
                <p className="truncate text-caption text-muted">{g.availabilityLabel}</p>
              </div>
              <span className="text-caption font-semibold text-green">★ {g.rating}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
