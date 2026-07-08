import Link from 'next/link'
import { Users, Activity, CalendarClock, TriangleAlert, ShieldCheck, Clock, Smile, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { ConsoleGreeting } from '@/components/console/console-greeting'
import { FamilyHealthWidget } from '@/components/console/family-health-widget'
import { FamilyHealthOverview } from '@/components/console/family-health-overview'
import { DashboardMetrics } from '@/components/console/dashboard-metrics'
import { OperationsKPICard } from '@/components/console/kpi-card'
import { AIRecommendationCard } from '@/components/console/ai-recommendation'
import { ActivityItem } from '@/components/console/activity-item'
import { VisitStatusBadge } from '@/components/console/visit-status-badge'
import { STATS, KPIS, ACTIVITY, AI_RECOMMENDATIONS, TODAY_VISITS, guardianById, familyById } from '@/lib/console-data'

const HERO = [
  { label: 'Families', value: STATS.families, icon: Users },
  { label: 'Active visits', value: STATS.activeVisits, icon: Activity },
  { label: 'Upcoming visits', value: STATS.upcomingVisits, icon: CalendarClock },
  { label: 'High-priority alerts', value: STATS.highPriority, icon: TriangleAlert },
]

export default function ConsoleDashboard() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section>
        <ConsoleGreeting />
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {HERO.map((s) => {
            const Icon = s.icon
            const alert = s.label.includes('High-priority') && s.value > 0
            return (
              <div key={s.label} className={`rounded-lg border bg-card p-4 shadow-sm ${alert ? 'border-error/30' : 'border-line'}`}>
                <Icon className={`h-5 w-5 ${alert ? 'text-error' : 'text-green'}`} strokeWidth={1.75} />
                <p className="mt-3 text-h2 leading-none text-ink">{s.value}</p>
                <p className="mt-1.5 text-caption font-medium text-muted">{s.label}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Live operational metrics */}
      <section>
        <h2 className="mb-3 text-h4">Today at a glance</h2>
        <DashboardMetrics />
      </section>

      {/* Quick KPIs */}
      <section>
        <h2 className="mb-3 text-h4">Service health</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <OperationsKPICard icon={ShieldCheck} label="Guardian availability" value={KPIS.guardianAvailability} sub="on shift today" tone="positive" />
          <OperationsKPICard icon={TriangleAlert} label="Pending follow-ups" value={KPIS.pendingFollowUps} tone={KPIS.pendingFollowUps > 0 ? 'warning' : 'positive'} />
          <OperationsKPICard icon={Clock} label="Avg response" value={KPIS.avgResponse} />
          <OperationsKPICard icon={Smile} label="Family satisfaction" value={KPIS.satisfaction} tone="positive" />
          <OperationsKPICard icon={CheckCircle2} label="Completion rate" value={KPIS.completionRate} tone="positive" />
          <OperationsKPICard icon={CalendarClock} label="Today's visits" value={KPIS.todaysVisits} />
        </div>
      </section>

      {/* Family Health Widget — the hero */}
      <FamilyHealthWidget />

      {/* Schedule + Assistant + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-h4">Today&apos;s schedule</h2>
            <Link href="/console/visits" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">Live monitor <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
          </div>
          <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            <ul className="divide-y divide-line">
              {TODAY_VISITS.map((v) => {
                const g = guardianById(v.guardianId)
                const f = familyById(v.familyId)
                return (
                  <li key={v.id}>
                    <Link href={`/console/families/${v.familyId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent-soft/30">
                      <span className="w-16 shrink-0 text-caption font-semibold text-ink">{v.timeLabel}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm font-semibold text-ink">{v.memberName}</span>
                        <span className="block truncate text-caption text-muted">{g?.name} · {f?.area}</span>
                      </span>
                      {v.priority === 'high' && <span className="hidden shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-error sm:inline">Priority</span>}
                      <span className="hidden w-24 shrink-0 text-caption text-muted sm:block">{v.etaLabel}</span>
                      <VisitStatusBadge status={v.status} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <FamilyHealthOverview />

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-h4"><Sparkles className="h-5 w-5 text-green" strokeWidth={1.75} /> Operations assistant</h2>
            <div className="flex flex-col gap-2.5">
              {AI_RECOMMENDATIONS.map((r) => <AIRecommendationCard key={r.id} rec={r} />)}
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-h4">Recent activity</h2>
            <ul className="rounded-lg border border-line bg-card px-4 shadow-sm">
              {ACTIVITY.slice(0, 6).map((a, i) => <ActivityItem key={a.id} item={a} last={i === 5} />)}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
