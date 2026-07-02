import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Star, Phone, MapPin, Plus, Trash2, MessageCircle, ChevronRight, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import {
  Card, Badge, Avatar, EmptyState, ErrorBox, Skeleton,
  istDate, durationMin, flagTone,
} from './_shared'
import { AddCompanionModal } from './AddCompanionModal'

/* ── helpers ─────────────────────────────────────────────────── */
const statusColor = (s?: string | null) =>
  s === 'approved' ? '#16A34A' : s === 'rejected' ? '#DC2626' : '#D97706'

const statusTone = (s?: string | null) =>
  s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'amber'

const statusLabel = (s?: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending'

const truncate = (t?: string | null, n = 80) =>
  !t ? '' : t.length > n ? t.slice(0, n).trimEnd() + '…' : t

const monthStartISO = () =>
  new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

/* ── Status segmented control ─────────────────────────────────── */
function StatusToggle({
  value,
  onChange,
}: {
  value: string
  onChange: (s: string) => void
}) {
  const opts = [
    { v: 'pending',  label: 'Pending',  color: '#D97706', bg: '#FEF3C7' },
    { v: 'approved', label: 'Approve',  color: '#16A34A', bg: '#DCFCE7' },
    { v: 'rejected', label: 'Reject',   color: '#DC2626', bg: '#FEE2E2' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {opts.map(o => {
        const active = value === o.v
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700,
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: active ? o.bg : '#F3F4F6',
              color: active ? o.color : '#9CA3AF',
              transition: 'all 140ms ease',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ============================================================
   LIST
============================================================ */
export function AdminCompanions() {
  const { showToast } = useToast()
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [companions, setCompanions] = useState<any[]>([])
  const [avatars, setAvatars]       = useState<Record<string, string>>({})
  const [whatsapps, setWhatsapps]   = useState<Record<string, string>>({})
  const [monthVisits, setMonthVisits] = useState<Record<string, number>>({})
  const [totalVisits, setTotalVisits] = useState<Record<string, number>>({})
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [showAdd, setShowAdd]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(false)
    try {
      const [compRes, profRes, monthRes, totalRes] = await Promise.all([
        supabase.from('companions').select('*').order('full_name'),
        supabase.from('profiles').select('id, avatar_url, whatsapp_number').eq('role', 'companion'),
        supabase.from('bookings').select('companion_id').gte('created_at', monthStartISO()),
        supabase.from('bookings').select('companion_id').not('companion_id', 'is', null),
      ])
      if (compRes.error) throw compRes.error
      setCompanions(compRes.data || [])

      const av: Record<string, string> = {}
      const wa: Record<string, string> = {}
      ;(profRes.data || []).forEach((p: any) => {
        if (p.avatar_url)     av[p.id] = p.avatar_url
        if (p.whatsapp_number) wa[p.id] = p.whatsapp_number
      })
      setAvatars(av); setWhatsapps(wa)

      const m: Record<string, number> = {}
      ;(monthRes.data || []).forEach((b: any) => {
        if (b.companion_id) m[b.companion_id] = (m[b.companion_id] || 0) + 1
      })
      setMonthVisits(m)

      const t: Record<string, number> = {}
      ;(totalRes.data || []).forEach((b: any) => {
        if (b.companion_id) t[b.companion_id] = (t[b.companion_id] || 0) + 1
      })
      setTotalVisits(t)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function changeStatus(id: string, status: string) {
    const prev = companions
    setCompanions(cs => cs.map(c => c.id === id ? { ...c, status } : c))
    const { error } = await supabase.from('companions').update({ status }).eq('id', id)
    if (error) { setCompanions(prev); showToast('Could not update status', 'error') }
    else showToast(`Marked as ${status}`, 'success')
  }

  async function deleteCompanion(id: string) {
    const { error } = await supabase.from('companions').delete().eq('id', id)
    if (error) { showToast('Could not delete companion', 'error'); return }
    setCompanions(cs => cs.filter(c => c.id !== id))
    setDeleteConfirm(null)
    showToast('Companion removed', 'success')
  }

  const filtered = companions.filter(c => {
    if (filter === 'approved' && c.status !== 'approved') return false
    if (filter === 'pending'  && c.status === 'approved') return false
    if (filter === 'rejected' && c.status !== 'rejected') return false
    if (search && !(c.full_name || '').toLowerCase().includes(search.toLowerCase())
                && !(c.city || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const approved  = companions.filter(c => c.status === 'approved').length
  const pending   = companions.filter(c => !c.status || c.status === 'pending').length
  const rejected  = companions.filter(c => c.status === 'rejected').length

  if (loading) return (
    <>
      <h1 className="adm-page-h" style={{ marginBottom: 16 }}>Companions</h1>
      <div className="adm-grid adm-grid-3">{[0,1,2,3,4,5].map(i => <Skeleton key={i} h={200} />)}</div>
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
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 className="adm-page-h" style={{ margin: 0 }}>Companions</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            {companions.length} total · {approved} approved · {pending} pending
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: 'var(--forest)', color: '#A8D5B5',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={15} strokeWidth={2.5} /> Add Companion
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total', value: companions.length, color: '#111827', bg: '#F9FAFB' },
          { label: 'Approved', value: approved,  color: '#15803D', bg: '#F0FDF4' },
          { label: 'Pending',  value: pending,   color: '#B45309', bg: '#FFFBEB' },
          { label: 'Rejected', value: rejected,  color: '#B91C1C', bg: '#FEF2F2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Search + filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input
          className="adm-input"
          placeholder="Search by name or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: 180 }}
        />
        <div style={{ display: 'flex', gap: 6, background: '#F3F4F6', borderRadius: 10, padding: 4 }}>
          {(['all', 'approved', 'pending', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: filter === f ? '#fff' : 'transparent',
                color: filter === f ? '#111' : '#9CA3AF',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                transition: 'all 120ms ease',
                textTransform: 'capitalize',
              }}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* ── Cards ── */}
      {filtered.length === 0 ? (
        <Card><EmptyState title="No companions found" sub="Try a different search or filter." /></Card>
      ) : (
        <div className="adm-grid adm-grid-3">
          {filtered.map(c => {
            const mv   = monthVisits[c.id] || 0
            const tv   = totalVisits[c.id] || 0
            const wa   = whatsapps[c.id] || c.phone
            const dot  = statusColor(c.status)
            const isConfirmingDelete = deleteConfirm === c.id
            const langs = Array.isArray(c.languages) ? c.languages.slice(0, 2) : []
            const skills = Array.isArray(c.skills) ? c.skills : []

            return (
              <div
                key={c.id}
                style={{
                  background: '#fff', borderRadius: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
              >
                {/* Card header */}
                <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar with status dot */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar name={c.full_name} src={avatars[c.id]} size={52} />
                    <span style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: 12, height: 12, borderRadius: '50%',
                      background: dot, border: '2px solid #fff',
                    }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.full_name || 'Companion'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={10} /> {c.phone || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.city || '—'}{c.availability ? ` · ${c.availability}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp quick-contact */}
                  {wa && (
                    <a
                      href={`https://wa.me/${wa.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      title="WhatsApp"
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none',
                        background: '#DCFCE7', color: '#16A34A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, textDecoration: 'none',
                      }}
                    >
                      <MessageCircle size={15} />
                    </a>
                  )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                  {[
                    { value: mv, label: 'This month' },
                    { value: tv, label: 'All visits' },
                    { value: c.rating != null ? Number(c.rating).toFixed(1) : '—', label: 'Rating', icon: <Star size={11} fill={c.rating ? '#D97706' : 'none'} color={c.rating ? '#D97706' : '#9CA3AF'} /> },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: '10px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        {s.icon}{s.value}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Skills / languages */}
                {(langs.length > 0 || skills.length > 0) && (
                  <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {langs.map(l => (
                      <span key={l} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8' }}>{l}</span>
                    ))}
                    {skills.slice(0, 2).map(s => (
                      <span key={s} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#F0FDF4', color: '#16A34A' }}>{s}</span>
                    ))}
                    {skills.length > 2 && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: '#F3F4F6', color: '#6B7280' }}>+{skills.length - 2}</span>
                    )}
                  </div>
                )}

                {/* Status toggle */}
                <div style={{ padding: '10px 16px 0' }}>
                  <StatusToggle value={c.status || 'pending'} onChange={v => changeStatus(c.id, v)} />
                </div>

                {/* Action row */}
                <div style={{ padding: '10px 16px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link
                    to={`/admin/companions/${c.id}`}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      padding: '9px 14px', borderRadius: 9, border: 'none',
                      background: 'var(--forest)', color: '#A8D5B5',
                      fontSize: 12, fontWeight: 700, textDecoration: 'none',
                    }}
                  >
                    View profile <ChevronRight size={13} />
                  </Link>

                  {/* Delete */}
                  {isConfirmingDelete ? (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button
                        onClick={() => deleteCompanion(c.id)}
                        style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: '#FEE2E2', color: '#B91C1C', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      title="Remove companion"
                      style={{
                        width: 34, height: 34, borderRadius: 9, border: 'none',
                        background: '#F3F4F6', color: '#9CA3AF', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add companion modal */}
      {showAdd && (
        <AddCompanionModal
          onClose={() => setShowAdd(false)}
          onAdded={row => {
            setCompanions(prev => [...prev, row])
            setShowAdd(false)
            showToast('Companion added', 'success')
          }}
        />
      )}
    </>
  )
}

/* ============================================================
   DETAIL
============================================================ */
export function AdminCompanionDetail() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [companion, setCompanion]   = useState<any>(null)
  const [profile, setProfile]       = useState<any>(null)
  const [visits, setVisits]         = useState<any[]>([])
  const [bookings, setBookings]     = useState<any[]>([])

  async function load() {
    if (!id) return
    setLoading(true); setError(false)
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
    } catch { setError(true) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  async function changeStatus(status: string) {
    if (!id) return
    const { error } = await supabase.from('companions').update({ status }).eq('id', id)
    if (error) { showToast('Could not update status', 'error'); return }
    setCompanion((c: any) => ({ ...c, status }))
    showToast(`Marked as ${status}`, 'success')
  }

  if (loading) return (
    <>
      <Skeleton h={28} />
      <div style={{ height: 12 }} />
      <Skeleton h={140} />
      <div style={{ height: 16 }} />
      <div className="adm-grid adm-grid-3">{[0,1,2].map(i => <Skeleton key={i} h={92} />)}</div>
    </>
  )
  if (error) return <Card><ErrorBox onRetry={load} /></Card>
  if (!companion) return (
    <>
      <Link to="/admin/companions" className="adm-link">← Companions</Link>
      <Card style={{ marginTop: 12 }}><EmptyState title="Companion not found" sub="This companion may have been removed." /></Card>
    </>
  )

  const durations    = visits.map(v => durationMin(v.start_time, v.end_time)).filter((m): m is number => m != null)
  const avgDuration  = durations.length ? Math.round(durations.reduce((s, m) => s + m, 0) / durations.length) : null
  const flaggedCount = visits.filter(v => v.flags && v.flags !== 'none').length
  const wa           = profile?.whatsapp_number || companion.phone

  return (
    <>
      <Link to="/admin/companions" className="adm-link">← Companions</Link>

      {/* ── Profile header ── */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '20px', marginTop: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar name={companion.full_name} src={profile?.avatar_url} size={64} />
            <span style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 14, height: 14, borderRadius: '50%',
              background: statusColor(companion.status), border: '2px solid #fff',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>{companion.full_name || 'Companion'}</span>
              <Badge tone={statusTone(companion.status)}>{statusLabel(companion.status)}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
              <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={12} /> {companion.phone || '—'}
              </span>
              <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={12} /> {companion.city || '—'}
              </span>
              {companion.rating != null && (
                <span style={{ fontSize: 12, color: '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={12} fill="#D97706" /> {Number(companion.rating).toFixed(1)}
                </span>
              )}
              {companion.age && (
                <span style={{ fontSize: 12, color: '#6B7280' }}>Age {companion.age}</span>
              )}
              {companion.gender && (
                <span style={{ fontSize: 12, color: '#6B7280', textTransform: 'capitalize' }}>{companion.gender}</span>
              )}
            </div>

            {/* Languages + skills */}
            {(Array.isArray(companion.languages) && companion.languages.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {companion.languages.map((l: string) => (
                  <span key={l} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8' }}>{l}</span>
                ))}
                {Array.isArray(companion.skills) && companion.skills.map((s: string) => (
                  <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#F0FDF4', color: '#16A34A' }}>{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {wa && (
              <a
                href={`https://wa.me/${wa.replace(/\D/g, '')}`}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 9,
                  background: '#DCFCE7', color: '#15803D',
                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                }}
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
            {companion.phone && (
              <a
                href={`tel:${companion.phone}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 9,
                  background: '#F3F4F6', color: '#374151',
                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                }}
              >
                <Phone size={14} /> Call
              </a>
            )}
          </div>
        </div>

        {/* Status toggle */}
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Companion status</p>
          <div style={{ maxWidth: 320 }}>
            <StatusToggle value={companion.status || 'pending'} onChange={changeStatus} />
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="adm-grid adm-grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total visits', value: visits.length },
          { label: 'Avg duration', value: avgDuration != null ? `${avgDuration} min` : '—' },
          { label: 'Flagged visits', value: flaggedCount },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.03em', marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Assigned elders ── */}
      <Card style={{ marginBottom: 16 }}>
        <div className="adm-card-head">
          <span className="adm-card-title">Assigned elders · recent bookings</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{bookings.length} total</span>
        </div>
        {bookings.length === 0 ? (
          <EmptyState title="No bookings assigned yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {bookings.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #F3F4F6' }}>
                <Avatar name={b.loved_ones?.full_name} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{b.loved_ones?.full_name || 'Elder'}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{b.loved_ones?.city || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge tone={b.status === 'completed' ? 'green' : b.status === 'cancelled' ? 'gray' : 'amber'}>
                    {b.status ? b.status.replace(/_/g, ' ') : 'pending'}
                  </Badge>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{istDate(b.scheduled_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Visit history ── */}
      <Card>
        <div className="adm-card-head">
          <span className="adm-card-title">Visit history</span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{visits.length} visits</span>
        </div>
        {visits.length === 0 ? (
          <EmptyState title="No visits logged yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {visits.map(v => {
              const ft  = flagTone(v.flags)
              const dur = durationMin(v.start_time, v.end_time)
              return (
                <div key={v.id} style={{ padding: '12px 0', borderBottom: '0.5px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{v.elder_profiles?.name || 'Elder'}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {istDate(v.created_at)}{dur != null ? ` · ${dur} min` : ''}
                      </div>
                    </div>
                    <Badge tone={ft.tone}>{ft.label}</Badge>
                  </div>
                  {v.one_moment && (
                    <p style={{ fontSize: 12, color: '#374151', margin: '6px 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{truncate(v.one_moment, 120)}"
                    </p>
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
