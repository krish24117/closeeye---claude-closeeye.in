import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TbChevronRight } from 'react-icons/tb'
import { supabase } from '@/lib/supabase'
import {
  StatCard, Card, Avatar, Badge, EmptyState, Skeleton,
  inr, serviceLabel, istTime, bookingTone, queryTone,
} from './_shared'

const paiseSum = (rows: any[] | null | undefined, field = 'amount_paise') =>
  (rows || []).reduce((s, r) => s + (r[field] || 0), 0)

export function AdminHome() {
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState<any>(null)

  async function load() {
    setLoading(true)
    const now = new Date()
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
    const weekAgo = new Date(now.getTime() - 7 * 864e5)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [fam, soc, newFam, todayB, queries, monthBk, lastBk, monthMem, recent, societies, flaggedToday] = await Promise.all([
      supabase.from('loved_ones').select('id', { count: 'exact', head: true }),
      supabase.from('society_members').select('id', { count: 'exact', head: true }),
      supabase.from('loved_ones').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      supabase.from('bookings').select('id, status, companion_id, scheduled_at, service_type, loved_ones(full_name, city), companions(full_name)')
        .gte('scheduled_at', dayStart.toISOString()).lte('scheduled_at', dayEnd.toISOString()).order('scheduled_at'),
      supabase.from('member_queries').select('id, question, subject_label, status, created_at, user_id').neq('status', 'doctor_reviewed').order('created_at', { ascending: false }).limit(6),
      supabase.from('bookings').select('amount_paise').in('payment_status', ['paid', 'received']).gte('created_at', monthStart.toISOString()),
      supabase.from('bookings').select('amount_paise').in('payment_status', ['paid', 'received']).gte('created_at', lastMonthStart.toISOString()).lt('created_at', monthStart.toISOString()),
      supabase.from('memberships').select('amount_paise').eq('status', 'active').gte('created_at', monthStart.toISOString()),
      supabase.from('bookings').select('id, amount_paise, service_type, created_at, loved_ones(full_name)').order('created_at', { ascending: false }).limit(6),
      supabase.from('society_members').select('society_name'),
      supabase.from('visits').select('id').neq('flags', 'none').gte('created_at', dayStart.toISOString()),
    ])

    const userIds = [...new Set((queries.data || []).map((q: any) => q.user_id).filter(Boolean))]
    let names: Record<string, string> = {}
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
      names = Object.fromEntries((profs || []).map((p: any) => [p.id, p.full_name]))
    }

    const todayList = todayB.data || []
    const done = todayList.filter((b: any) => b.status === 'completed').length
    const pending = todayList.length - done
    const unassigned = todayList.filter((b: any) => !b.companion_id && b.status !== 'cancelled').length

    const socMap: Record<string, number> = {}
    ;(societies.data || []).forEach((s: any) => { const n = s.society_name || 'Unassigned'; socMap[n] = (socMap[n] || 0) + 1 })
    const socList = Object.entries(socMap).sort((a, b) => b[1] - a[1])

    const revMonth = paiseSum(monthBk.data) + paiseSum(monthMem.data)
    const revLast = paiseSum(lastBk.data)

    setD({
      famCount: (fam.count || 0) + (soc.count || 0),
      newFam: newFam.count || 0,
      todayList, done, pending, unassigned,
      queriesCount: queries.data?.length || 0,
      queries: (queries.data || []).map((q: any) => ({ ...q, name: names[q.user_id] || 'A family' })),
      revMonth, revDelta: revMonth - revLast,
      recent: recent.data || [],
      socList, socTotal: societies.data?.length || 0,
      flaggedToday: flaggedToday.data?.length || 0,
    })
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  if (loading) return (
    <>
      <div className="adm-grid adm-grid-4" style={{ marginBottom: 20 }}>{[0, 1, 2, 3].map(i => <Skeleton key={i} h={92} />)}</div>
      <div className="adm-grid adm-grid-2" style={{ marginBottom: 20 }}><Skeleton h={260} /><Skeleton h={260} /></div>
    </>
  )

  const actions: { tone: string; title: string; sub: string; to: string }[] = []
  if (d.flaggedToday > 0) actions.push({ tone: '#FEE2E2', title: `${d.flaggedToday} visit${d.flaggedToday > 1 ? 's' : ''} flagged today`, sub: 'Review and call family if urgent', to: '/admin/visits' })
  if (d.unassigned > 0) actions.push({ tone: '#FEF3C7', title: `${d.unassigned} visit${d.unassigned > 1 ? 's' : ''} unassigned today`, sub: 'Assign a companion', to: '/admin/bookings' })
  if (d.queriesCount > 0) actions.push({ tone: '#EDE9FE', title: `${d.queriesCount} health quer${d.queriesCount > 1 ? 'ies' : 'y'} to review`, sub: 'A doctor needs to verify', to: '/admin/queries' })
  if (d.pending > 0) actions.push({ tone: '#DBEAFE', title: `${d.pending} visit${d.pending > 1 ? 's' : ''} pending today`, sub: 'Track to completion', to: '/admin/visits' })

  return (
    <>
      {/* Stats row */}
      <div className="adm-grid adm-grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Active families" value={d.famCount} sub={d.newFam > 0 ? `+${d.newFam} this week` : 'Families & members'} subTone={d.newFam > 0 ? 'pos' : undefined} />
        <StatCard label="Visits today" value={d.todayList.length} sub={`${d.done} done · ${d.pending} pending`} />
        <StatCard label="Queries pending" value={d.queriesCount} sub="Need doctor review" alert={d.queriesCount > 0} subTone={d.queriesCount > 0 ? 'urgent' : undefined} />
        <StatCard label="Revenue this month" value={inr(d.revMonth)} sub={`${d.revDelta >= 0 ? '+' : ''}${inr(d.revDelta)} vs last month`} subTone={d.revDelta >= 0 ? 'pos' : 'warn'} />
      </div>

      {/* Main two-col */}
      <div className="adm-grid adm-grid-2" style={{ marginBottom: 20 }}>
        <Card>
          <div className="adm-card-head">
            <span className="adm-card-title">Today's visits</span>
            <Link className="adm-link" to="/admin/visits">View all →</Link>
          </div>
          {d.todayList.length === 0 ? <EmptyState title="No visits scheduled today" /> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {d.todayList.slice(0, 6).map((b: any) => {
                const bt = bookingTone(b.status)
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--cream-2)' }}>
                    <Avatar name={b.loved_ones?.full_name} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)' }}>{b.loved_ones?.full_name || 'Elder'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.loved_ones?.city || 'Hyderabad'} · {b.companions?.full_name || 'Unassigned'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <Badge tone={bt.tone}>{bt.label}</Badge>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{istTime(b.scheduled_at)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="adm-card-head">
            <span className="adm-card-title">Queries needing review</span>
            <Link className="adm-link" to="/admin/queries">View all →</Link>
          </div>
          {d.queries.length === 0 ? <EmptyState title="No pending queries" sub="Doctors are all caught up." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.queries.slice(0, 4).map((q: any) => {
                const qt = queryTone(q.status)
                return (
                  <div key={q.id} style={{ borderBottom: '1px solid var(--cream-2)', paddingBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--forest)' }}>{q.name}{q.subject_label ? ` — for ${q.subject_label}` : ''}</span>
                      <Badge tone={qt.tone}>{qt.label}</Badge>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.question}</p>
                    <Link to="/admin/queries" className="adm-btn adm-btn-sage" style={{ fontSize: 11, padding: '4px 10px' }}>Review now</Link>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom two-col */}
      <div className="adm-grid adm-grid-2">
        <Card>
          <div className="adm-card-head">
            <span className="adm-card-title">Recent payments</span>
            <Link className="adm-link" to="/admin/revenue">View all →</Link>
          </div>
          {d.recent.length === 0 ? <EmptyState title="No payments yet" /> : d.recent.map((p: any) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--cream-2)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--forest)' }}>{p.loved_ones?.full_name || 'Family'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{serviceLabel(p.service_type)}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--forest)', flexShrink: 0 }}>{inr(p.amount_paise)}</span>
            </div>
          ))}
        </Card>

        <Card>
          <div className="adm-card-head"><span className="adm-card-title">Needs attention</span></div>
          {actions.length === 0 ? <EmptyState title="All clear" sub="Nothing needs attention right now." /> : actions.map((a, i) => (
            <Link key={i} to={a.to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--cream-2)', textDecoration: 'none' }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: a.tone, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--forest)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.sub}</div>
              </div>
              <TbChevronRight size={14} color="var(--muted)" />
            </Link>
          ))}
        </Card>
      </div>
    </>
  )
}
