import { CareTeamDirectory } from '@/components/console/care-team-directory'
import { GUARDIANS } from '@/lib/console-data'

export default function CareTeamPage() {
  const onVisit = GUARDIANS.filter((g) => g.status === 'on-visit').length
  const available = GUARDIANS.filter((g) => g.status === 'available').length
  const companions = GUARDIANS.filter((g) => g.role === 'companion').length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Care Team</h1>
          <p className="mt-1.5 text-body leading-relaxed text-muted">Your Guardians and Companions — availability, today&apos;s load, skills and how they&apos;re doing.</p>
        </div>
        <div className="flex items-center gap-2 text-caption font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-green"><span className="h-1.5 w-1.5 rounded-full bg-green" /> {onVisit} on a visit</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> {available} available</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-green">{companions} companions</span>
        </div>
      </div>

      <CareTeamDirectory />
    </div>
  )
}
