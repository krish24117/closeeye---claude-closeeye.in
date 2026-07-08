import Link from 'next/link'
import { BadgeCheck, ArrowUpRight, Star } from 'lucide-react'
import { Avatar } from '@/components/family/avatar'
import { GUARDIANS, REVENUE_BY_GUARDIAN, REVENUE_BY_COMPANION, fmtINR } from '@/lib/admin-data'
import { cn } from '@/lib/utils'

const revByName = new Map<string, number>([...REVENUE_BY_GUARDIAN, ...REVENUE_BY_COMPANION].map((r) => [r.label, r.value]))

export default function AdminCareTeamPage() {
  const guardians = GUARDIANS.filter((g) => g.role === 'guardian').length
  const companions = GUARDIANS.filter((g) => g.role === 'companion').length
  const avgRating = (GUARDIANS.reduce((s, g) => s + g.rating, 0) / GUARDIANS.length).toFixed(1)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2">Care Team</h1>
          <p className="mt-1.5 text-body leading-relaxed text-muted">Verification, training and performance across Guardians and Companions.</p>
        </div>
        <Link href="/console/guardians" className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-card px-3.5 py-2 text-caption font-semibold text-ink transition-colors hover:border-green/40">
          <ArrowUpRight className="h-4 w-4 text-green" strokeWidth={1.75} /> Availability (Presence Console)
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: 'Guardians', v: guardians },
          { l: 'Companions', v: companions },
          { l: 'Verified', v: `${GUARDIANS.length}/${GUARDIANS.length}` },
          { l: 'Avg rating', v: `${avgRating}★` },
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-line bg-card p-4 shadow-sm"><p className="text-h3 leading-none text-ink">{s.v}</p><p className="mt-1.5 text-caption text-muted">{s.l}</p></div>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-line px-5 py-3 text-caption font-semibold uppercase tracking-wide text-muted lg:grid">
          <span>Member</span><span>Role</span><span>Verification</span><span>Training</span><span>Performance</span><span className="text-right">Revenue</span>
        </div>
        <ul className="divide-y divide-line">
          {GUARDIANS.map((g) => (
            <li key={g.id} className="grid grid-cols-2 items-center gap-3 px-5 py-3.5 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]">
              <span className="flex items-center gap-3">
                <Avatar initials={g.initials} size="sm" />
                <span className="min-w-0"><span className="block truncate text-body-sm font-semibold text-ink">{g.name}</span><span className="block text-caption text-muted lg:hidden">{g.role === 'companion' ? 'Companion' : 'Guardian'}</span></span>
              </span>
              <span className={cn('hidden rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase justify-self-start lg:inline', g.role === 'companion' ? 'bg-success/12 text-success' : 'bg-accent-soft text-green')}>{g.role}</span>
              <span className="hidden items-center gap-1 text-caption font-medium text-success lg:flex"><BadgeCheck className="h-4 w-4" strokeWidth={1.75} /> Verified</span>
              <span className="hidden text-caption text-muted lg:block">{g.training.length} certified</span>
              <span className="hidden items-center gap-1 text-caption text-ink lg:flex"><Star className="h-3.5 w-3.5 fill-warning text-warning" strokeWidth={0} /> {g.rating} · {g.onTimeRate}</span>
              <span className="text-right text-body-sm font-semibold text-ink">{revByName.has(g.name) ? fmtINR(revByName.get(g.name)!) : '—'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
