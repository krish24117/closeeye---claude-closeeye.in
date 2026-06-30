import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { TrendingUp, Banknote, PieChart, Clock } from 'lucide-react'
import { Badge, EmptyState, ErrorBox, Skeleton } from './_shared'
import type { Tone } from './_shared'

function paymentTone(status: string): Tone {
  if (status === 'paid' || status === 'received') return 'green'
  if (status === 'pending') return 'amber'
  if (status === 'failed') return 'red'
  return 'gray'
}

function statusTone(status: string): Tone {
  if (status === 'pending') return 'amber'
  if (status === 'confirmed') return 'blue'
  if (status === 'companion_assigned') return 'purple'
  if (status === 'in_progress') return 'green'
  if (status === 'completed') return 'gray'
  if (status === 'cancelled') return 'red'
  return 'gray'
}

function rupees(paise: number | null | undefined) {
  if (paise == null) return <span style={{ color: 'var(--gray-light)' }}>—</span>
  return <span>₹{(paise / 100).toLocaleString('en-IN')}</span>
}

function TableSkeleton() {
  return (
    <div className="adm-card">
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 16, borderBottom: '1px solid var(--line)' }}>
          <Skeleton h={12} />
        </div>
      ))}
    </div>
  )
}

export function AdminPayments() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('bookings')
        .select('id,amount_paise,companion_payout_paise,payment_status,status,created_at,scheduled_at,service_type,companion_id,companions(full_name),loved_ones(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setBookings(data || [])
    } catch (err) {
      console.error('Failed to load payments:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const paidBookings = bookings.filter(b => b.payment_status === 'paid' || b.payment_status === 'received')
  const thisMonth = paidBookings.filter(b => new Date(b.created_at) >= monthStart)

  const totalRevenue  = paidBookings.reduce((s, b) => s + (b.amount_paise || 0), 0)
  const monthRevenue  = thisMonth.reduce((s, b) => s + (b.amount_paise || 0), 0)
  const totalPayouts  = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.companion_payout_paise || 0), 0)
  const margin        = totalRevenue - totalPayouts
  const pendingCount  = bookings.filter(b => b.payment_status === 'pending' && !['cancelled'].includes(b.status)).length

  const fmt = (dt: string) => format(new Date(dt), 'dd MMM yy')

  return (
    <div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="adm-page-h">Payments</h1>
        <p className="adm-page-sub">Revenue, payouts, and platform margin.</p>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <ErrorBox onRetry={load} />
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} h={100} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: TrendingUp, label: 'Total Revenue',    value: `₹${(totalRevenue / 100).toLocaleString('en-IN')}`,  sub: 'All time paid' },
            { icon: Banknote,   label: 'This month',       value: `₹${(monthRevenue / 100).toLocaleString('en-IN')}`,  sub: format(now, 'MMMM yyyy') },
            { icon: PieChart,   label: 'Platform Margin',  value: `₹${(margin / 100).toLocaleString('en-IN')}`,        sub: 'Revenue − payouts' },
            { icon: Clock,      label: 'Pending Payments', value: pendingCount,                                        sub: 'Awaiting payment' },
          ].map(c => (
            <div key={c.label} className="adm-card adm-card-pad">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0faf3', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <c.icon size={17} />
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: 'var(--forest)', lineHeight: 1, margin: 0 }}>{c.value}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-dark)', marginTop: 6, marginBottom: 0 }}>{c.label}</p>
              <p style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 2, marginBottom: 0 }}>{c.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Payments list */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>All payments</p>

        {loading ? <TableSkeleton /> : bookings.length === 0 ? (
          <EmptyState title="No bookings yet" sub="Payments will appear here once bookings are made." />
        ) : (
          <>
            {/* Desktop table */}
            <div className="adm-table-wrap" style={{ display: 'none' }} data-desktop>
              <table className="adm-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Date</th>
                    <th style={{ textAlign: 'left' }}>Family / Companion</th>
                    <th style={{ textAlign: 'left' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Payout</th>
                    <th style={{ textAlign: 'right' }}>Margin</th>
                    <th style={{ textAlign: 'left' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontSize: 12, color: 'var(--gray-mid)', whiteSpace: 'nowrap' }}>{fmt(b.created_at)}</td>
                      <td>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-dark)', margin: 0 }}>{b.loved_ones?.full_name || '—'}</p>
                        <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>{b.companions?.full_name || 'Unassigned'}</p>
                      </td>
                      <td>
                        <Badge tone={statusTone(b.status)}>{b.status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--forest)', whiteSpace: 'nowrap', fontSize: 14 }}>
                        {rupees(b.amount_paise)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--gray-mid)', whiteSpace: 'nowrap', fontSize: 14 }}>
                        {rupees(b.companion_payout_paise)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--gray-mid)', whiteSpace: 'nowrap', fontSize: 14 }}>
                        {b.companion_payout_paise != null ? rupees(b.amount_paise - b.companion_payout_paise) : <span style={{ color: 'var(--gray-light)' }}>—</span>}
                      </td>
                      <td>
                        <Badge tone={paymentTone(b.payment_status)}>
                          {b.payment_status === 'received' ? 'Received' : b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'failed' ? 'Failed' : 'Pending'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — replaces horizontal table to avoid cutoff */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bookings.map(b => (
                <div key={b.id} className="adm-card adm-card-pad">
                  {/* Row 1: family + date */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--forest)', margin: 0 }}>{b.loved_ones?.full_name || '—'}</p>
                      <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>{b.companions?.full_name || 'Unassigned'}</p>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--gray-mid)', whiteSpace: 'nowrap', margin: 0 }}>{fmt(b.created_at)}</p>
                  </div>
                  {/* Row 2: amount + payout + margin */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--forest)' }}>{b.amount_paise ? `₹${(b.amount_paise/100).toLocaleString('en-IN')}` : '—'}</span>
                    {b.companion_payout_paise != null && (
                      <span style={{ color: 'var(--gray-mid)' }}>payout ₹{(b.companion_payout_paise/100).toLocaleString('en-IN')}</span>
                    )}
                    {b.companion_payout_paise != null && (
                      <span style={{ color: 'var(--gray-mid)' }}>margin ₹{((b.amount_paise - b.companion_payout_paise)/100).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  {/* Row 3: status badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Badge tone={statusTone(b.status)}>{b.status.replace(/_/g, ' ')}</Badge>
                    <Badge tone={paymentTone(b.payment_status)}>
                      {b.payment_status === 'received' ? 'Received' : b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'failed' ? 'Failed' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
