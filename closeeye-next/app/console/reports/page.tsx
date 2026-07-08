import { Smile, CheckCircle2, Clock, TriangleAlert } from 'lucide-react'
import { OperationsKPICard } from '@/components/console/kpi-card'
import { FAMILIES, KPIS } from '@/lib/console-data'

function Bar({ label, value, pct, tone = 'green' }: { label: string; value: string; pct: number; tone?: 'green' | 'warning' | 'error' }) {
  const fill = tone === 'warning' ? 'bg-warning' : tone === 'error' ? 'bg-error' : 'bg-green'
  return (
    <div>
      <div className="flex items-center justify-between text-body-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-accent-soft">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const green = FAMILIES.filter((f) => f.status === 'green').length
  const yellow = FAMILIES.filter((f) => f.status === 'yellow').length
  const red = FAMILIES.filter((f) => f.status === 'red').length
  const total = FAMILIES.length

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2">Reports</h1>
        <p className="mt-1.5 text-body leading-relaxed text-muted">The health of your service, in plain language — never complicated analytics.</p>
      </div>

      {/* Today's overview */}
      <section>
        <h2 className="mb-3 text-h4">Today&apos;s overview</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <OperationsKPICard icon={Smile} label="Family satisfaction" value={KPIS.satisfaction} tone="positive" />
          <OperationsKPICard icon={CheckCircle2} label="Visit completion" value={KPIS.completionRate} tone="positive" />
          <OperationsKPICard icon={Clock} label="Avg response" value={KPIS.avgResponse} />
          <OperationsKPICard icon={TriangleAlert} label="Open escalations" value={KPIS.pendingFollowUps} tone={KPIS.pendingFollowUps > 0 ? 'warning' : 'positive'} />
        </div>
      </section>

      {/* Weekly summary */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <h2 className="text-h4">This week</h2>
          <div className="mt-4 flex flex-col gap-4">
            <Bar label="Visit completion" value="96%" pct={96} />
            <Bar label="Family satisfaction" value="97%" pct={97} />
            <Bar label="On-time arrival" value="95%" pct={95} />
            <Bar label="Response within an hour" value="92%" pct={92} tone="warning" />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <h2 className="text-h4">Family health trends</h2>
          <p className="mt-1 text-caption text-muted">Relationship &amp; service health across {total} families</p>
          <div className="mt-4 flex flex-col gap-4">
            <Bar label="On track" value={`${green}`} pct={(green / total) * 100} tone="green" />
            <Bar label="Follow-up recommended" value={`${yellow}`} pct={(yellow / total) * 100} tone="warning" />
            <Bar label="Immediate attention" value={`${red}`} pct={(red / total) * 100} tone="error" />
          </div>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full">
            <span className="bg-success" style={{ width: `${(green / total) * 100}%` }} />
            <span className="bg-warning" style={{ width: `${(yellow / total) * 100}%` }} />
            <span className="bg-error" style={{ width: `${(red / total) * 100}%` }} />
          </div>
        </div>
      </section>

      {/* Care Team performance */}
      <section className="rounded-lg border border-line bg-card p-6 shadow-sm">
        <h2 className="text-h4">Care Team performance · this month</h2>
        <p className="mt-1 text-caption text-muted">Guardians and Companions</p>
        <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Guardians</p>
            <div className="flex flex-col gap-4">
              <Bar label="Arjun Kumar" value="98% on-time" pct={98} />
              <Bar label="Meena Iyer" value="99% on-time" pct={99} />
              <Bar label="Ravi Teja" value="96% on-time" pct={96} />
              <Bar label="Karthik Rao" value="92% on-time" pct={92} tone="warning" />
            </div>
          </div>
          <div>
            <p className="mb-3 text-caption font-semibold uppercase tracking-widest text-muted">Companions</p>
            <div className="flex flex-col gap-4">
              <Bar label="Anita Rao" value="98% on-time" pct={98} />
              <Bar label="Vikram Shetty" value="96% on-time" pct={96} />
              <Bar label="Fatima Begum" value="97% on-time" pct={97} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
