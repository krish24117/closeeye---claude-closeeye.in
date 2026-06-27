import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TbStar, TbPhone, TbMapPin } from 'react-icons/tb'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import {
  Card, Badge, Avatar, EmptyState, ErrorBox, Skeleton,
  istDate, durationMin, flagTone,
} from './_shared'

/* ---------- helpers ---------- */
const statusTone = (s?: string | null) =>
  s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'amber'
const statusLabel = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending'
const truncate = (t?: string | null, n = 80) =>
  !t ? '' : t.length > n ? t.slice(0, n).trimEnd() + '…' : t

const monthStartISO = () =>
  new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

/* ============================================================
   LIST
============================================================ */
export function AdminCompanions() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [companions, setCompanions] = useState<any[]>([])
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [whatsapps, setWhatsapps] = useState<Record<string, string>>({})
  const [visits, setVisits] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all')

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const [compRes, profRes, bkRes] = await Promise.all([
        supabase.from('companions').select('*').order('full_name'),
        supabase.from('profiles').select('id, avatar_url, whatsapp_number').eq('role', 'companion'),
        supabase.from('bookings').select('companion_id').gte('created_at', monthStartISO()),
      ])
      if (compRes.error) throw compRes.error

      setCompanions(compRes.data || [])

      const av: Record<string, string> = {}
      const wa: Record<string, string> = {}
      ;(profRes.data || []).forEach((p: any) => {
        if (p.avatar_url) av[p.id] = p.avatar_url
        if (p.whatsapp_number) wa[p.id] = p.whatsapp_number
      })
      setAvatars(av)
      setWhatsapps(wa)

      const tally: Record<string, number> = {}
      ;(bkRes.data || []).forEach((b: any) => {
        if (b.companion_id) tally[b.companion_id] = (tally[b.companion_id] || 0) + 1
      })
      setVisits(tally)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function changeStatus(id: string, status: string) {
    const prev = companions
    setCompanions(cs => cs.map(c => c.id === id ? { ...c, status } : c))
    const { error } = await supabase.from('companions').update({ status }).eq('id', id)
    if (error) {
      setCompanions(prev)
      showToast('Could not update status — try again', 'error')
    } else {
      showToast(`Marked as ${status}`, 'success')
    }
  }

  const filtered = companions.filter(c => {
    if (filter === 'approved' && c.status !== 'approved') return false
    if (filter === 'pending' && c.status === 'approved') return false
    if (search && !(c.full_name || '').toLowerCase().includes(search.toLowerCase())
      && !(c.city || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const approvedCount = companions.filter(c => c.status === 'approved').length

  if (loading) return (
    <>
      <h1 className="adm-page-h" style={{ marginBottom: 16 }}>Companions</h1>
      <div className="adm-grid adm-grid-3">{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={150} />)}</div>
    </>
  )
  if (error) return (
    <>
      <h1 className="adm-page-h" style={{ marginBottom: 16 }}>Companions</h1>
      <Card><ErrorBox onRetry={load} /></Card>
    </>
  )

  return (
    <>
      <div className="adm-card-head" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 className="adm-page-h">Companions</h1>
          <p className="adm-page-sub" style={{ margin: 0 }}>
            {approvedCount} approved · {companions.length - approvedCount} pending/inactive
          </p>
        </div>
      </div>

      {/* search + filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input
          className="adm-input"
          placeholder="Search by name or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: 200 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'approved', 'pending'] as const).map(f => (
            <button
              key={f}
              className={`adm-pill-f ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'approved' ? 'Approved' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><EmptyState title="No companions found" sub="Try a different search or filter." /></Card>
      ) : (
        <div className="adm-grid adm-grid-3">
          {filtered.map(c => {
            const v = visits[c.id] || 0
            const wa = whatsapps[c.id]
            return (
              <div key={c.id} className="adm-card adm-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={c.full_name} src={avatars[c.id]} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{c.full_name || 'Companion'}</span>
                      <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TbPhone size={11} /> {c.phone || '—'}{wa && wa !== c.phone ? ` · wa ${wa}` : ''}
                    </div>
                  </div>
                </div>

                {/* stats */}
                <div className="adm-grid adm-grid-3" style={{ textAlign: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--forest)' }}>{v}</div>
                    <div style={{ fontSize: 10, color: 'var(--gray-mid)' }}>Visits this month</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--forest)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <TbStar size={14} /> {c.rating != null ? Number(c.rating).toFixed(1) : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--gray-mid)' }}>Rating</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.city || '—'}</div>
                    <div style={{ fontSize: 10, color: 'var(--gray-mid)' }}>City</div>
                  </div>
                </div>

                {/* actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto' }}>
                  <Link to={`/admin/companions/${c.id}`} className="adm-btn adm-btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                    View visits
                  </Link>
                  <select
                    className="adm-input"
                    value={c.status || 'pending'}
                    onChange={e => changeStatus(c.id, e.target.value)}
                    style={{ width: 130 }}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* ============================================================
   DETAIL
============================================================ */
export function AdminCompanionDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [companion, setCompanion] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [visits, setVisits] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])

  async function load() {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const [compRes, profRes, visitsRes, bkRes] = await Promise.all([
        supabase.from('companions').select('*').eq('id', id).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('visits')
          .select('id, flags, one_moment, start_time, end_time, created_at, elder_profiles(name)')
          .eq('companion_id', id).order('created_at', { ascending: false }),
        supabase.from('bookings')
          .select('id, status, scheduled_at, loved_ones(full_name, city)')
          .eq('companion_id', id).order('scheduled_at', { ascending: false }),
      ])
      if (compRes.error) throw compRes.error
      setCompanion(compRes.data)
      setProfile(profRes.data)
      setVisits(visitsRes.data || [])
      setBookings(bkRes.data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  if (loading) return (
    <>
      <Skeleton h={28} />
      <div style={{ height: 12 }} />
      <Skeleton h={120} />
      <div style={{ height: 16 }} />
      <div className="adm-grid adm-grid-3">{[0, 1, 2].map(i => <Skeleton key={i} h={92} />)}</div>
    </>
  )
  if (error) return <Card><ErrorBox onRetry={load} /></Card>
  if (!companion) return (
    <>
      <Link to="/admin/companions" className="adm-link">← Companions</Link>
      <Card style={{ marginTop: 12 }}><EmptyState title="Companion not found" sub="This companion may have been removed." /></Card>
    </>
  )

  const durations = visits.map(v => durationMin(v.start_time, v.end_time)).filter((m): m is number => m != null)
  const avgDuration = durations.length ? Math.round(durations.reduce((s, m) => s + m, 0) / durations.length) : null
  const flaggedCount = visits.filter(v => v.flags && v.flags !== 'none').length

  return (
    <>
      <Link to="/admin/companions" className="adm-link">← Companions</Link>

      {/* header */}
      <Card style={{ marginTop: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Avatar name={companion.full_name} src={profile?.avatar_url} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)' }}>{companion.full_name || 'Companion'}</span>
              <Badge tone={statusTone(companion.status)}>{statusLabel(companion.status)}</Badge>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><TbPhone size={12} /> {companion.phone || '—'}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><TbMapPin size={12} /> {companion.city || '—'}</span>
              {companion.rating != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><TbStar size={12} /> {Number(companion.rating).toFixed(1)}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* metrics */}
      <div className="adm-grid adm-grid-3" style={{ marginBottom: 16 }}>
        <div className="adm-card adm-card-pad">
          <div className="adm-stat-label">Total visits</div>
          <div className="adm-stat-value">{visits.length}</div>
        </div>
        <div className="adm-card adm-card-pad">
          <div className="adm-stat-label">Avg duration</div>
          <div className="adm-stat-value">{avgDuration != null ? `${avgDuration} min` : '—'}</div>
        </div>
        <div className="adm-card adm-card-pad">
          <div className="adm-stat-label">Flagged visits</div>
          <div className="adm-stat-value">{flaggedCount}</div>
        </div>
      </div>

      {/* assigned elders / bookings */}
      <Card style={{ marginBottom: 16 }}>
        <div className="adm-card-head"><span className="adm-card-title">Assigned elders · recent bookings</span></div>
        {bookings.length === 0 ? (
          <EmptyState title="No bookings assigned yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {bookings.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
                <Avatar name={b.loved_ones?.full_name} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{b.loved_ones?.full_name || 'Elder'}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{b.loved_ones?.city || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge tone={b.status === 'completed' ? 'green' : b.status === 'cancelled' ? 'gray' : 'amber'}>
                    {b.status ? b.status.replace(/_/g, ' ') : 'pending'}
                  </Badge>
                  <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 2 }}>{istDate(b.scheduled_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* visit history */}
      <Card>
        <div className="adm-card-head"><span className="adm-card-title">Visit history</span></div>
        {visits.length === 0 ? (
          <EmptyState title="No visits logged yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {visits.map(v => {
              const ft = flagTone(v.flags)
              const dur = durationMin(v.start_time, v.end_time)
              return (
                <div key={v.id} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{v.elder_profiles?.name || 'Elder'}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>
                        {istDate(v.created_at)}{dur != null ? ` · ${dur} min` : ''}
                      </div>
                    </div>
                    <Badge tone={ft.tone}>{ft.label}</Badge>
                  </div>
                  {v.one_moment && (
                    <p style={{ fontSize: 12, color: 'var(--gray-dark)', margin: '6px 0 0' }}>{truncate(v.one_moment, 120)}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </>
  )
}
