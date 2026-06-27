import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TbX } from 'react-icons/tb'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import {
  Card, Badge, Avatar, EmptyState, ErrorBox, Skeleton,
  istDate, istTime, durationMin, serviceLabel, bookingTone, flagTone,
} from './_shared'

type FilterKey = 'all' | 'today' | 'week' | 'pending' | 'done' | 'flagged'
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'pending', label: 'Pending' },
  { key: 'done', label: 'Done' },
  { key: 'flagged', label: 'Flagged' },
]

const PAGE_SIZE = 20

export function AdminVisits() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [bookings, setBookings] = useState<any[]>([])
  const [visitMap, setVisitMap] = useState<Map<string, any>>(new Map())

  const [filter, setFilter] = useState<FilterKey>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<any>(null)

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const [bRes, vRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, status, service_type, scheduled_at, companion_id, loved_ones(full_name, age, city), companions(full_name)')
          .order('scheduled_at', { ascending: false }),
        supabase
          .from('visits')
          .select('id, booking_id, flags, flag_notes, start_time, end_time, one_moment, mood_score, checklist_data, created_at, elder_profiles(name)')
          .order('created_at', { ascending: false }),
      ])
      if (bRes.error || vRes.error) { setError(true); setLoading(false); return }
      const map = new Map<string, any>()
      ;(vRes.data || []).forEach((v: any) => {
        if (v.booking_id && !map.has(v.booking_id)) map.set(v.booking_id, v)
      })
      setBookings(bRes.data || [])
      setVisitMap(map)
    } catch {
      setError(true)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { setPage(0) }, [filter, search])

  const filtered = useMemo(() => {
    const now = new Date()
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(now.getTime() + 7 * 864e5)
    const q = search.trim().toLowerCase()

    return bookings.filter((b: any) => {
      const visit = visitMap.get(b.id)
      // filter
      if (filter === 'today') {
        const t = b.scheduled_at ? new Date(b.scheduled_at) : null
        if (!t || t < dayStart || t > dayEnd) return false
      } else if (filter === 'week') {
        const t = b.scheduled_at ? new Date(b.scheduled_at) : null
        if (!t || t < weekStart || t > weekEnd) return false
      } else if (filter === 'pending') {
        if (b.status === 'completed' || b.status === 'cancelled') return false
      } else if (filter === 'done') {
        if (b.status !== 'completed') return false
      } else if (filter === 'flagged') {
        if (!visit || visit.flags === 'none' || !visit.flags) return false
      }
      // search
      if (q) {
        const elder = (b.loved_ones?.full_name || '').toLowerCase()
        const comp = (b.companions?.full_name || '').toLowerCase()
        if (!elder.includes(q) && !comp.includes(q)) return false
      }
      return true
    })
  }, [bookings, visitMap, filter, search])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const from = total === 0 ? 0 : safePage * PAGE_SIZE + 1
  const to = Math.min(total, safePage * PAGE_SIZE + PAGE_SIZE)

  function goAssign(e?: any) {
    if (e) e.stopPropagation()
    navigate('/admin/bookings')
  }

  return (
    <>
      <div className="adm-card-head" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 className="adm-page-h">Visits</h1>
          <p className="adm-page-sub" style={{ margin: 0 }}>Track every visit, snapshot and flag in one place.</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => navigate('/admin/bookings')}>Schedule visit</button>
      </div>

      <Card>
        {/* filters + search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`adm-pill-f${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          <input
            className="adm-input"
            placeholder="Search elder or companion…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginLeft: 'auto', maxWidth: 240, flex: '1 1 180px' }}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} h={44} />)}
          </div>
        ) : error ? (
          <ErrorBox onRetry={load} />
        ) : total === 0 ? (
          <EmptyState title="No visits found" sub="Try a different filter or search." />
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Elder</th>
                    <th>City</th>
                    <th>Companion</th>
                    <th>Date/Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((b: any) => {
                    const visit = visitMap.get(b.id)
                    const dur = visit ? durationMin(visit.start_time, visit.end_time) : null
                    const flagged = visit && visit.flags && visit.flags !== 'none'
                    const status = flagged ? flagTone(visit.flags) : bookingTone(b.status)
                    return (
                      <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(b)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={b.loved_ones?.full_name} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{b.loved_ones?.full_name || 'Elder'}</div>
                              <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>
                                {[b.loved_ones?.age ? `${b.loved_ones.age} yrs` : null, b.loved_ones?.city].filter(Boolean).join(' · ') || serviceLabel(b.service_type)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{b.loved_ones?.city || '—'}</td>
                        <td>
                          {b.companions?.full_name ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Avatar name={b.companions.full_name} size={22} />
                              <span style={{ fontSize: 13 }}>{b.companions.full_name}</span>
                            </div>
                          ) : (
                            <span
                              onClick={goAssign}
                              style={{ color: 'var(--amber, #B45309)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                            >
                              Assign →
                            </span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{istDate(b.scheduled_at)} · {istTime(b.scheduled_at)}</td>
                        <td>{dur != null ? `${dur} min` : '—'}</td>
                        <td><Badge tone={status.tone}>{status.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>Showing {from}–{to} of {total}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="adm-btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Prev</button>
                <button className="adm-btn" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selected && (
        <VisitDrawer
          booking={selected}
          visit={visitMap.get(selected.id)}
          onClose={() => setSelected(null)}
          onReport={() => { showToast('Opening full report…', 'info'); navigate('/admin/reports') }}
          onAssign={() => navigate('/admin/bookings')}
        />
      )}
    </>
  )
}

/* ---------- slide-over ---------- */
function VisitDrawer({ booking, visit, onClose, onReport, onAssign }: any) {
  const dur = visit ? durationMin(visit.start_time, visit.end_time) : null
  const flagged = visit && visit.flags && visit.flags !== 'none'
  const status = flagged ? flagTone(visit.flags) : bookingTone(booking.status)
  const tier1 = visit?.checklist_data?.tier1 || {}
  const narrative = visit?.one_moment || tier1.one_moment || ''

  const snapItems = [
    { label: 'Mood', val: tier1.mood },
    { label: 'Eating', val: tier1.eating },
    { label: 'Medicines', val: tier1.medicines },
    { label: 'Home', val: tier1.home },
  ]

  const mark = (v: any) => {
    if (v === true) return { txt: '✓', color: '#15803D' }
    if (v === false) return { txt: '✗', color: '#DC2626' }
    return { txt: '—', color: 'var(--gray-mid)' }
  }

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div className="adm-slideover">
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-dark)', padding: 4 }}
        >
          <TbX size={20} />
        </button>

        <div style={{ paddingRight: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--forest)' }}>{booking.loved_ones?.full_name || 'Elder'}</div>
          <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginTop: 4 }}>
            {istDate(booking.scheduled_at)} · {istTime(booking.scheduled_at)}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', margin: '14px 0' }}>
          <Badge tone={status.tone}>{status.label}</Badge>
          <span style={{ fontSize: 12, color: 'var(--gray-dark)' }}>{serviceLabel(booking.service_type)}</span>
          <span style={{ fontSize: 12, color: 'var(--gray-dark)' }}>{dur != null ? `${dur} min` : 'Duration —'}</span>
        </div>

        <div style={{ fontSize: 13, color: 'var(--gray-dark)', marginBottom: 14 }}>
          Companion: <strong>{booking.companions?.full_name || 'Unassigned'}</strong>
          {!booking.companions?.full_name && (
            <span onClick={onAssign} style={{ color: 'var(--amber, #B45309)', cursor: 'pointer', marginLeft: 8, fontWeight: 500 }}>Assign →</span>
          )}
        </div>

        {flagged && visit?.flag_notes && (
          <div style={{
            background: visit.flags === 'urgent' ? '#FEE2E2' : '#FEF3C7',
            border: `1px solid ${visit.flags === 'urgent' ? '#FCA5A5' : '#FCD34D'}`,
            borderRadius: 'var(--radius-card)', padding: '10px 12px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: visit.flags === 'urgent' ? '#991B1B' : '#92400E', marginBottom: 4 }}>
              {visit.flags === 'urgent' ? 'Urgent flag' : 'To monitor'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--black)' }}>{visit.flag_notes}</div>
          </div>
        )}

        {visit ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)', marginBottom: 10 }}>Wellbeing snapshot</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {snapItems.map(it => {
                const m = mark(it.val)
                return (
                  <div key={it.label} style={{ border: '1px solid var(--gray-light)', borderRadius: 'var(--radius-card)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-dark)' }}>{it.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.txt}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)', marginBottom: 8 }}>What happened</div>
            <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-card)', padding: '12px 14px', fontSize: 13, lineHeight: 1.5, color: 'var(--black)', marginBottom: 18 }}>
              {narrative || 'No narrative recorded for this visit.'}
            </div>
          </>
        ) : (
          <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-card)', padding: '16px', fontSize: 13, color: 'var(--gray-dark)', marginBottom: 18, textAlign: 'center' }}>
            No report yet — visit not completed.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {visit && <button className="adm-btn adm-btn-primary" onClick={onReport}>View full report</button>}
          <button className="adm-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  )
}
