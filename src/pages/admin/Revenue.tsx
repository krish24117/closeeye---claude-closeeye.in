import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  Card, StatCard, Badge, EmptyState, ErrorBox, Skeleton,
  inr, istDate, serviceLabel, payTone,
} from './_shared'

const sum = (rows: any[] | null | undefined, field = 'amount_paise') =>
  (rows || []).reduce((s, r) => s + (r[field] || 0), 0)

const inMonth = (iso: string | null | undefined, y: number, m: number) => {
  if (!iso) return false
  const d = new Date(iso)
  return d.getFullYear() === y && d.getMonth() === m
}

export function AdminRevenue() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [bookings, setBookings] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const [bk, mem] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, amount_paise, companion_payout_paise, payment_status, service_type, created_at, loved_ones(full_name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('memberships')
          .select('id, amount_paise, status, created_at'),
      ])
      if (bk.error || mem.error) throw bk.error || mem.error
      setBookings(bk.data || [])
      setMemberships(mem.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  if (loading) return (
    <>
      <h1 className="adm-page-h" style={{ marginBottom: 16 }}>Revenue</h1>
      <div className="adm-grid adm-grid-4" style={{ marginBottom: 20 }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} h={92} />)}</div>
      <Skeleton h={260} />
      <div style={{ height: 20 }} />
      <Skeleton h={260} />
    </>
  )

  if (error) return (
    <>
      <h1 className="adm-page-h" style={{ marginBottom: 16 }}>Revenue</h1>
      <Card><ErrorBox onRetry={load} /></Card>
    </>
  )

  const now = new Date()
  const thisY = now.getFullYear()
  const thisM = now.getMonth()
  const lastY = thisM === 0 ? thisY - 1 : thisY
  const lastM = thisM === 0 ? 11 : thisM - 1

  const paidBookings = bookings.filter((b: any) => b.payment_status === 'paid' || b.payment_status === 'received')
  const activeMems = memberships.filter((m: any) => m.status === 'active')

  const revInMonth = (y: number, m: number) =>
    sum(paidBookings.filter((b: any) => inMonth(b.created_at, y, m))) +
    sum(activeMems.filter((mm: any) => inMonth(mm.created_at, y, m)))

  const thisMonth = revInMonth(thisY, thisM)
  const lastMonth = revInMonth(lastY, lastM)
  const outstanding = sum(bookings.filter((b: any) => b.payment_status === 'pending'))
  const projectedNext = Math.round(thisMonth * 1.1)
  const monthDelta = thisMonth - lastMonth

  // last 6 calendar months (oldest -> newest)
  const months: { y: number; m: number; label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisY, thisM - i, 1)
    months.push({
      y: d.getFullYear(),
      m: d.getMonth(),
      label: d.toLocaleString('en-IN', { month: 'short' }),
      value: revInMonth(d.getFullYear(), d.getMonth()),
    })
  }
  const maxValue = Math.max(1, ...months.map(mm => mm.value))

  // plan breakdown
  const onDemandCount = bookings.length
  const foundingCount = activeMems.length
  const monthlyCount = 0 // subscriptions not yet available
  const totalPlans = Math.max(1, onDemandCount + foundingCount + monthlyCount)
  const aPct = (onDemandCount / totalPlans) * 100
  const bPct = (foundingCount / totalPlans) * 100

  const tableRows = paidBookings.slice(0, 30)

  return (
    <>
      <h1 className="adm-page-h" style={{ marginBottom: 16 }}>Revenue</h1>

      {/* summary cards */}
      <div className="adm-grid adm-grid-4" style={{ marginBottom: 20 }}>
        <StatCard
          label="This month"
          value={inr(thisMonth)}
          sub={`${monthDelta >= 0 ? '+' : ''}${inr(monthDelta)} vs last`}
          subTone={monthDelta >= 0 ? 'pos' : 'warn'}
        />
        <StatCard label="Last month" value={inr(lastMonth)} sub="previous period" />
        <StatCard label="Outstanding" value={inr(outstanding)} sub="unpaid" subTone="warn" />
        <StatCard label="Projected next" value={inr(projectedNext)} sub="est. +10%" />
      </div>

      {/* revenue chart */}
      <Card style={{ marginBottom: 20 }}>
        <div className="adm-card-head"><span className="adm-card-title">Revenue — last 6 months</span></div>
        <div className="adm-bars">
          {months.map((mm, i) => {
            const pct = Math.max(2, (mm.value / maxValue) * 100)
            return (
              <div className="adm-bar-col" key={i}>
                <div className="adm-bar-val">{inr(mm.value)}</div>
                <div className="adm-bar" style={{ height: `${pct}%` }} />
                <div className="adm-bar-label">{mm.label}</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* payments table */}
      <Card style={{ marginBottom: 20 }}>
        <div className="adm-card-head"><span className="adm-card-title">Payments received</span></div>
        {tableRows.length === 0 ? (
          <EmptyState title="No payments yet" sub="Paid bookings will appear here." />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((b: any) => {
                  const pt = payTone(b.payment_status)
                  return (
                    <tr key={b.id}>
                      <td>{b.loved_ones?.full_name || '—'}</td>
                      <td>{serviceLabel(b.service_type)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--forest)' }}>{inr(b.amount_paise)}</td>
                      <td>{istDate(b.created_at)}</td>
                      <td>Razorpay</td>
                      <td><Badge tone={pt.tone}>{pt.label}</Badge></td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--gray-mid)', cursor: 'not-allowed' }}>
                          <Download size={14} /> Download
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* plan breakdown */}
      <div className="adm-grid adm-grid-2">
        <Card>
          <div className="adm-card-head"><span className="adm-card-title">Plan breakdown</span></div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                position: 'relative',
                background: `conic-gradient(var(--forest) 0 ${aPct}%, var(--sage) ${aPct}% ${aPct + bPct}%, var(--gray-light) ${aPct + bPct}% 100%)`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--forest)' }}>{onDemandCount + foundingCount + monthlyCount}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>total</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="adm-card-head"><span className="adm-card-title">By plan type</span></div>
          {([
            { color: 'var(--forest)', label: 'On-demand visits', count: onDemandCount },
            { color: 'var(--sage)', label: 'Founding members', count: foundingCount },
            { color: 'var(--gray-light)', label: 'Monthly plans', count: monthlyCount },
          ]).map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{row.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--forest)' }}>{row.count}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--gray-mid)' }}>
            On-demand counts all bookings · Founding counts active ₹100 memberships.
          </div>
        </Card>
      </div>
    </>
  )
}
