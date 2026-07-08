import { HeartPulse, Users2, ShieldCheck, Radar, Network, MapPin } from 'lucide-react'
import { InsightSearch } from '@/components/insights/insight-search'
import { DailyBrief } from '@/components/insights/daily-brief'
import { WellnessTrends } from '@/components/insights/wellness-trends'
import { RelationshipInsights } from '@/components/insights/relationship-insights'
import { CareQuality } from '@/components/insights/care-quality'
import { OperationalIntelligence } from '@/components/insights/operational-intelligence'
import { StoryStudio } from '@/components/insights/story-studio'
import { ExecKpiStrip } from '@/components/insights/exec-kpi-strip'
import { PriorityList } from '@/components/insights/priority-list'
import { ZoneIntel } from '@/components/insights/zone-intel'
import {
  CancellationIntel, RevenueIntel, FinancialHealth, CompanionIntel, CareTeamIntel, GuardianCapacity, GrowthDashboard, CrossModuleIntel,
} from '@/components/insights/exec-dashboards'
import { AlertCard } from '@/components/admin/alert-card'
import { proactiveAlerts } from '@/lib/cloza-engine'

function Heading({ icon: Icon, title, sub }: { icon: typeof HeartPulse; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-green"><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
      <div><h2 className="text-h4">{title}</h2><p className="text-caption text-muted">{sub}</p></div>
    </div>
  )
}

export default function InsightsPage() {
  const alerts = proactiveAlerts()
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Insights</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">What happened, why, and what to do next — read from everything Close Eye already knows.</p>
      </div>

      {/* Executive KPIs */}
      <ExecKpiStrip />

      {/* Today's top priorities */}
      <PriorityList />

      {/* Ask anything */}
      <InsightSearch />

      {/* Daily brief */}
      <DailyBrief />

      {/* Needs attention */}
      <section>
        <h2 className="mb-3 text-h4">Needs your attention</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{alerts.map((a) => <AlertCard key={a.id} alert={a} />)}</div>
      </section>

      {/* Business intelligence — cross-module correlations */}
      <div className="flex flex-col gap-3">
        <Heading icon={Network} title="Connected insights" sub="What one part of the business is telling you about another" />
        <CrossModuleIntel />
      </div>

      {/* Cancellation + Revenue + Financial */}
      <CancellationIntel />
      <RevenueIntel />
      <FinancialHealth />

      {/* Care team tickets */}
      <CareTeamIntel />

      {/* Family wellness */}
      <div className="flex flex-col gap-3">
        <Heading icon={HeartPulse} title="Family wellness" sub="Mood, mobility, sleep, medication and more — over time" />
        <WellnessTrends />
      </div>

      {/* Relationships */}
      <div className="flex flex-col gap-3">
        <Heading icon={Users2} title="Relationships" sub="How connected each family feels — and who to reach out to" />
        <RelationshipInsights />
      </div>

      {/* Care quality + Guardian capacity */}
      <div className="flex flex-col gap-3">
        <Heading icon={ShieldCheck} title="Care quality" sub="Consistency, punctuality and gentle coaching for the team" />
        <CareQuality />
      </div>
      <GuardianCapacity />

      {/* Companions */}
      <CompanionIntel />

      {/* What's coming + Zones */}
      <div className="flex flex-col gap-3">
        <Heading icon={Radar} title="What's coming" sub="Predicted shortages, hotspots and staffing" />
        <OperationalIntelligence />
      </div>
      <div className="flex flex-col gap-3">
        <Heading icon={MapPin} title="Zone intelligence" sub="A city heatmap of demand, supply and risk" />
        <ZoneIntel />
      </div>

      {/* Growth */}
      <GrowthDashboard />

      {/* AI story engine */}
      <StoryStudio />
    </div>
  )
}
