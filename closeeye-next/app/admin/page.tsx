import Link from 'next/link'
import { Sparkles, TrendingUp, MapPin, ShieldCheck, Users, ArrowRight } from 'lucide-react'
import { KpiTile } from '@/components/admin/kpi-tile'
import { AlertCard } from '@/components/admin/alert-card'
import { InsightBars } from '@/components/admin/insight-bars'
import { AIRecommendationCard } from '@/components/console/ai-recommendation'
import {
  ADMIN, KPI_FINANCE, KPI_OPERATIONS, KPI_GROWTH, ALERTS, AI_BUSINESS, fmtINR,
  REVENUE_BY_CITY, REVENUE_BY_SERVICE, REVENUE_BY_MEMBERSHIP, REVENUE_BY_GUARDIAN, REVENUE_BY_COMPANION, INSIGHT_HIGHLIGHTS,
} from '@/lib/admin-data'

function Panel({ title, children, cta }: { title: string; children: React.ReactNode; cta?: { label: string; href: string } }) {
  return (
    <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-h4">{title}</h2>
        {cta && <Link href={cta.href} className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">{cta.label} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>}
      </div>
      {children}
    </section>
  )
}

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div>
        <h1 className="text-h2">Good morning, {ADMIN.firstName}.</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">
          Revenue is up <span className="font-semibold text-success">15%</span> this month · <span className="font-semibold text-ink">184 active families</span> · 2 things need your attention today.
        </p>
      </div>

      {/* Financial KPIs */}
      <section>
        <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Financial</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {KPI_FINANCE.map((k) => <KpiTile key={k.key} kpi={k} />)}
        </div>
      </section>

      {/* Operational + Growth KPIs */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Operational</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {KPI_OPERATIONS.map((k) => <KpiTile key={k.key} kpi={k} />)}
          </div>
        </section>
        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Growth</p>
          <div className="grid grid-cols-3 gap-3">
            {KPI_GROWTH.map((k) => <KpiTile key={k.key} kpi={k} />)}
          </div>
        </section>
      </div>

      {/* Attention Center + AI Assistant */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-h4">Attention center</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ALERTS.map((a) => <AlertCard key={a.id} alert={a} />)}
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-h4"><Sparkles className="h-5 w-5 text-green" strokeWidth={1.75} /> Business assistant</h2>
            <Link href="/admin/insights" className="inline-flex items-center gap-1 text-caption font-semibold text-green hover:underline">All insights <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {AI_BUSINESS.map((r) => <AIRecommendationCard key={r.id} rec={r} />)}
          </div>
        </div>
      </div>

      {/* Business Insights */}
      <section>
        <h2 className="mb-3 text-h4">Business insights</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Panel title="Revenue by city" cta={{ label: 'Finance', href: '/admin/finance' }}><InsightBars rows={REVENUE_BY_CITY} format={(n) => fmtINR(n)} /></Panel>
          <Panel title="Revenue by service"><InsightBars rows={REVENUE_BY_SERVICE} format={(n) => fmtINR(n)} /></Panel>
          <Panel title="Revenue by membership"><InsightBars rows={REVENUE_BY_MEMBERSHIP} format={(n) => fmtINR(n)} /></Panel>
          <Panel title="Revenue by Guardian" cta={{ label: 'Care Team', href: '/admin/care-team' }}><InsightBars rows={REVENUE_BY_GUARDIAN} format={(n) => fmtINR(n)} /></Panel>
          <Panel title="Revenue by Companion"><InsightBars rows={REVENUE_BY_COMPANION} format={(n) => fmtINR(n)} /></Panel>
          <Panel title="Highlights">
            <ul className="flex flex-col gap-3">
              <Highlight icon={TrendingUp} tone="text-success" label="Fastest growing" value={INSIGHT_HIGHLIGHTS.fastestGrowingService.label} detail={INSIGHT_HIGHLIGHTS.fastestGrowingService.detail} />
              <Highlight icon={MapPin} tone="text-warning" label="Lowest performing city" value={INSIGHT_HIGHLIGHTS.lowestCity.label} detail={INSIGHT_HIGHLIGHTS.lowestCity.detail} />
              <Highlight icon={ShieldCheck} tone="text-green" label="Top Guardian" value={INSIGHT_HIGHLIGHTS.topGuardian.label} detail={INSIGHT_HIGHLIGHTS.topGuardian.detail} />
              <Highlight icon={Users} tone="text-green" label="Top Companion" value={INSIGHT_HIGHLIGHTS.topCompanion.label} detail={INSIGHT_HIGHLIGHTS.topCompanion.detail} />
            </ul>
          </Panel>
        </div>
      </section>
    </div>
  )
}

function Highlight({ icon: Icon, tone, label, value, detail }: { icon: typeof TrendingUp; tone: string; label: string; value: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft"><Icon className={`h-4 w-4 ${tone}`} strokeWidth={1.75} /></span>
      <div className="min-w-0">
        <p className="text-caption text-muted">{label}</p>
        <p className="text-body-sm font-semibold text-ink">{value}</p>
        <p className="text-caption text-muted">{detail}</p>
      </div>
    </li>
  )
}
