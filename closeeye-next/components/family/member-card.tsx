import { Pencil, ShieldCheck, Heart, Phone, UserRound, Sparkles } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { MoodBadge } from '@/components/family/badges'
import { Button } from '@/components/ui/button'
import { PRESENCE_MANAGER, type Member } from '@/lib/family-data'

function InfoBlock({ icon: Icon, title, children }: { icon: typeof Heart; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} /> {title}
      </p>
      <div className="mt-2 text-body-sm text-ink">{children}</div>
    </div>
  )
}

export function MemberCard({ member, onEdit }: { member: Member; onEdit?: () => void }) {
  const meta = [member.relationship, member.age > 0 ? member.age : null, member.city].filter(Boolean).join(' · ')
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
      <header className="flex items-center gap-4 border-b border-line px-6 py-5">
        <Avatar initials={member.initials} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h4 text-ink">{member.name}</h2>
            <MoodBadge mood={member.mood} />
          </div>
          <p className="text-caption text-muted">{meta}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${member.name}`}>
          <Pencil className="h-4 w-4" strokeWidth={1.5} /> Edit
        </Button>
      </header>

      {/* Personality — what makes them, them */}
      <div className="border-b border-line px-6 py-5">
        <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-muted">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> What makes them, them
        </p>
        {member.personality.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {member.personality.map((p) => (
              <li key={p.label} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-body-sm text-ink">
                <span aria-hidden>{p.emoji}</span> {p.label}
              </li>
            ))}
          </ul>
        ) : (
          <button onClick={onEdit} className="mt-3 text-body-sm text-green hover:underline">
            + Add what makes them special
          </button>
        )}
      </div>

      <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
        <InfoBlock icon={Heart} title="Medical notes">
          <ul className="flex flex-col gap-1">
            {member.medicalNotes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </InfoBlock>
        <InfoBlock icon={UserRound} title="Preferences">
          <ul className="flex flex-col gap-1">
            {member.preferences.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </InfoBlock>
        <InfoBlock icon={Phone} title="Emergency contacts">
          {member.emergencyContacts.length ? (
            <ul className="flex flex-col gap-1.5">
              {member.emergencyContacts.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2">
                  <span>{c.name} · <span className="text-muted">{c.relation}</span></span>
                  {c.phone && <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="font-medium text-green hover:underline">{c.phone}</a>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">None added yet.</p>
          )}
        </InfoBlock>
        <InfoBlock icon={ShieldCheck} title="Their care team">
          <p>Guardian · <span className="font-medium">{member.guardianName}</span></p>
          <p>Presence Manager · <span className="font-medium">{PRESENCE_MANAGER.name}</span></p>
        </InfoBlock>
      </div>
    </article>
  )
}
