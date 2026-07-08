import { XCircle, IndianRupee, Wallet, Users, LifeBuoy, Gauge, TrendingUp } from 'lucide-react'
import { IntelCard, MetricGrid } from '@/components/insights/intel-panel'
import { IntelActions } from '@/components/insights/intel-actions'
import { AIRecommendationCard } from '@/components/console/ai-recommendation'
import { BarChart, TrendArea } from '@/components/admin/charts'
import { InsightBars } from '@/components/admin/insight-bars'
import { fmtINR } from '@/lib/admin-data'
import {
  CANCELLATION, REVENUE_INTEL, FINANCIAL_HEALTH, COMPANION_INTEL, CARE_TEAM_INTEL, GUARDIAN_CAPACITY, GROWTH, CROSS_MODULE,
} from '@/lib/exec-intel'

const inr = (n: number) => fmtINR(n)

/* ── 3 · Cancellation Intelligence ───────────────────────────────────────── */
export function CancellationIntel() {
  const s = CANCELLATION.stats
  return (
    <IntelCard icon={XCircle} title="Cancellation intelligence" sub="Where visits are lost, why, and how to recover" action={{ label: 'Operations', href: '/admin/operations' }}>
      <MetricGrid items={[
        { label: 'Scheduled', value: s.totalScheduled },
        { label: 'Completed', value: s.completed, tone: 'positive' },
        { label: 'Cancelled', value: s.cancelled, tone: 'warning' },
        { label: 'Rescheduled', value: s.rescheduled },
        { label: 'Cancel rate', value: s.ratePct },
        { label: 'Revenue lost', value: inr(s.revenueLost), tone: 'error' },
        { label: 'Recovered', value: inr(s.recovered), tone: 'positive' },
        { label: 'Repeat families', value: CANCELLATION.repeatFamilies, tone: 'warning' },
      ]} />
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <div><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Reasons</p><InsightBars rows={CANCELLATION.reasons} format={(n) => `${n}%`} /></div>
        <div><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Top affected zones</p><InsightBars rows={CANCELLATION.zones} format={(n) => `${n}%`} /></div>
        <div>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Trend · 8 weeks</p>
          <TrendArea data={CANCELLATION.trend} />
          <p className="mt-3 text-caption text-muted">Worst area · <span className="font-semibold text-error">{CANCELLATION.worstArea}</span></p>
          <p className="text-caption text-muted">Watch · {CANCELLATION.worstGuardian}</p>
        </div>
      </div>
      <IntelActions actions={CANCELLATION.actions} />
    </IntelCard>
  )
}

/* ── 4 · Revenue Intelligence ────────────────────────────────────────────── */
export function RevenueIntel() {
  const s = REVENUE_INTEL.stats
  return (
    <IntelCard icon={IndianRupee} title="Revenue intelligence" sub="Where the money comes from, and what to protect" action={{ label: 'Finance', href: '/admin/finance' }}>
      <MetricGrid items={[
        { label: "Today's revenue", value: inr(s.today) },
        { label: 'MRR', value: inr(s.mrr) },
        { label: 'ARR', value: inr(s.arr) },
        { label: 'Growth', value: s.growthPct, tone: 'positive' },
        { label: 'Avg / family', value: inr(s.arpf) },
        { label: 'LTV', value: inr(s.ltv) },
        { label: 'Churn', value: s.churnPct, tone: 'warning' },
        { label: 'Pending', value: inr(s.pending), tone: 'warning' },
        { label: 'Failures', value: inr(s.failures), tone: 'error' },
        { label: 'Refunds', value: inr(s.refunds) },
        { label: 'Cancelled rev.', value: inr(s.cancelledRevenue), tone: 'error' },
        { label: 'Net revenue', value: inr(s.net), tone: 'positive' },
      ]} />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Monthly revenue</p><BarChart data={REVENUE_INTEL.monthly} format={inr} /></div>
        <div><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Revenue by service</p><InsightBars rows={REVENUE_INTEL.byService} format={inr} /></div>
      </div>
      <IntelActions actions={REVENUE_INTEL.actions} />
    </IntelCard>
  )
}

/* ── 8 · Financial Health ────────────────────────────────────────────────── */
export function FinancialHealth() {
  const m = FINANCIAL_HEALTH.metrics
  return (
    <IntelCard icon={Wallet} title="Financial health" sub="Collections, leakage and recovery">
      <MetricGrid items={[
        { label: 'Revenue', value: inr(m.revenue) },
        { label: 'Refunds', value: inr(m.refunds) },
        { label: 'Discounts', value: inr(m.discounts) },
        { label: 'Waivers', value: inr(m.waivers) },
        { label: 'Outstanding', value: inr(m.outstanding), tone: 'warning' },
        { label: 'Failed', value: inr(m.failed), tone: 'error' },
        { label: 'Recovered', value: inr(m.recovered), tone: 'positive' },
        { label: 'Collection', value: m.collectionPct, tone: 'positive' },
      ]} />
      <div className="mt-5"><p className="mb-2 text-caption font-semibold uppercase tracking-widest text-muted">Collections · last 30 days</p><TrendArea data={FINANCIAL_HEALTH.trend} /></div>
      <IntelActions actions={FINANCIAL_HEALTH.actions} />
    </IntelCard>
  )
}

/* ── 5 · Companion Intelligence ──────────────────────────────────────────── */
export function CompanionIntel() {
  const s = COMPANION_INTEL.stats
  return (
    <IntelCard icon={Users} title="Companion intelligence" sub="Pipeline, deployment and weekend demand" action={{ label: 'Recruit', href: '/become-a-companion' }}>
      <MetricGrid items={[
        { label: 'Applications', value: s.applications },
        { label: 'Verified', value: s.verified, tone: 'positive' },
        { label: 'Training pending', value: s.trainingPending, tone: 'warning' },
        { label: 'Ready', value: s.ready },
        { label: 'Assigned', value: s.assigned },
        { label: 'Available', value: s.available },
        { label: 'Weekend avail.', value: s.weekendAvailability, tone: 'warning' },
        { label: 'Utilisation', value: s.utilisation },
      ]} />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Application funnel</p><BarChart data={COMPANION_INTEL.funnel} /></div>
        <div className="flex flex-col justify-center gap-2 text-body-sm">
          <p className="text-muted">Top Companion · <span className="font-semibold text-ink">{COMPANION_INTEL.topCompanion}</span></p>
          <p className="text-muted">Cities needing recruitment · <span className="font-semibold text-warning">{COMPANION_INTEL.citiesNeeding.join(', ')}</span></p>
          <p className="text-muted">Inactive Companions · <span className="font-semibold text-ink">{COMPANION_INTEL.inactive}</span></p>
        </div>
      </div>
      <IntelActions actions={COMPANION_INTEL.actions} />
    </IntelCard>
  )
}

/* ── 6 · Care Team Intelligence ──────────────────────────────────────────── */
export function CareTeamIntel() {
  const s = CARE_TEAM_INTEL.stats
  return (
    <IntelCard icon={LifeBuoy} title="Care team intelligence" sub="Tickets, coordination and response">
      <MetricGrid items={[
        { label: 'Open tickets', value: s.open, tone: 'warning' },
        { label: 'Resolved today', value: s.resolvedToday, tone: 'positive' },
        { label: 'Pending', value: s.pending },
        { label: 'Doctor coord.', value: s.doctorCoordination },
        { label: 'Medicine req.', value: s.medicineRequests },
        { label: 'Hospital coord.', value: s.hospitalCoordination },
        { label: 'Lab tests', value: s.labTests },
        { label: 'Escalations', value: s.escalations, tone: 'warning' },
        { label: 'Avg response', value: s.avgResponse },
        { label: 'Satisfaction', value: s.csat, tone: 'positive' },
      ]} />
      <div className="mt-5"><p className="mb-2 text-caption font-semibold uppercase tracking-widest text-muted">Tickets · this week</p><BarChart data={CARE_TEAM_INTEL.trend} /></div>
      <IntelActions actions={CARE_TEAM_INTEL.actions} />
    </IntelCard>
  )
}

/* ── 7 · Guardian Capacity ───────────────────────────────────────────────── */
export function GuardianCapacity() {
  const c = GUARDIAN_CAPACITY
  return (
    <IntelCard icon={Gauge} title="Guardian capacity" sub="Workload, utilisation and burnout risk" action={{ label: 'Care Team', href: '/admin/care-team' }}>
      <MetricGrid items={[...c.status, { label: 'Avg visits/day', value: c.avgVisitsPerDay }, { label: 'Utilisation', value: c.utilisation }]} />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Workload · visits today</p><InsightBars rows={c.workload} /></div>
        <div className="flex flex-col justify-center gap-2 text-body-sm">
          <p className="text-muted">Overloaded · <span className="font-semibold text-warning">{c.overloaded.join(', ')}</span></p>
          <p className="text-muted">Underutilised · <span className="font-semibold text-ink">{c.underutilised.join(', ')}</span></p>
        </div>
      </div>
      <IntelActions actions={c.actions} />
    </IntelCard>
  )
}

/* ── 9 · Growth ──────────────────────────────────────────────────────────── */
export function GrowthDashboard() {
  const m = GROWTH.metrics
  return (
    <IntelCard icon={TrendingUp} title="Growth" sub="Acquisition, conversion and economics">
      <MetricGrid items={[
        { label: 'New families', value: m.newFamilies, tone: 'positive' },
        { label: 'Renewals', value: m.renewals },
        { label: 'Referrals', value: m.referrals },
        { label: 'Website leads', value: m.websiteLeads },
        { label: 'Guardian apps', value: m.guardianApps },
        { label: 'Companion apps', value: m.companionApps },
        { label: 'Conversion', value: m.conversionPct, tone: 'positive' },
        { label: 'CAC', value: inr(m.cac) },
        { label: 'LTV', value: inr(m.ltv) },
        { label: 'Monthly growth', value: m.monthlyGrowthPct, tone: 'positive' },
      ]} />
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1"><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Active families</p><BarChart data={GROWTH.trend} /></div>
        <div><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Lead funnel</p><InsightBars rows={GROWTH.funnel} /></div>
        <div><p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Referral sources</p><InsightBars rows={GROWTH.referralSources} format={(n) => `${n}%`} /></div>
      </div>
      <IntelActions actions={GROWTH.actions} />
    </IntelCard>
  )
}

/* ── 12 · Cross-module Intelligence ──────────────────────────────────────── */
export function CrossModuleIntel() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {CROSS_MODULE.map((r) => <AIRecommendationCard key={r.id} rec={r} />)}
    </div>
  )
}
