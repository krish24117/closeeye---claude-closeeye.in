import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { TbArrowLeft, TbBrandWhatsapp, TbCalendarPlus, TbFileText } from 'react-icons/tb'
import { supabase } from '@/lib/supabase'
import {
  Card, Badge, Avatar, EmptyState, ErrorBox, Skeleton,
  istDate, timeAgo, serviceLabel, inr, flagTone,
} from './_shared'

/* ============================================================
   AdminFamilies — unified list (NRI loved_ones + Society members)
   ============================================================ */

type FilterKey = 'all' | 'nri' | 'society' | 'active' | 'trial'

interface FamilyRow {
  id: string
  family: string
  type: 'NRI' | 'Society'
  society: string
  elder: string
  plan: string
  status: string
  created_at: string | null
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'nri', label: 'NRI' },
  { key: 'society', label: 'Society' },
  { key: 'active', label: 'Active' },
  { key: 'trial', label: 'Trial' },
]

const truncate = (s?: string | null, n = 90) =>
  !s ? '' : s.length > n ? s.slice(0, n).trimEnd() + '…' : s

export function AdminFamilies() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rows, setRows] = useState<FamilyRow[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const [loRes, socRes] = await Promise.all([
        supabase.from('loved_ones').select('id, full_name, age, city, family_user_id, created_at'),
        supabase.from('society_members').select('*'),
      ])
      if (loRes.error) throw loRes.error
      if (socRes.error) throw socRes.error

      const lovedOnes = loRes.data || []
      const famIds = [...new Set(lovedOnes.map((lo: any) => lo.family_user_id).filter(Boolean))]
      let profMap: Record<string, any> = {}
      if (famIds.length) {
        const { data: profs } = await supabase
          .from('profiles').select('id, full_name, whatsapp_number').in('id', famIds)
        profMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
      }

      const nriRows: FamilyRow[] = lovedOnes.map((lo: any) => {
        const prof = profMap[lo.family_user_id]
        return {
          id: lo.family_user_id,
          family: prof?.full_name || 'Family',
          type: 'NRI',
          society: '—',
          elder: lo.full_name + (lo.age ? ` · ${lo.age}` : ''),
          plan: 'On-demand',
          status: 'Active',
          created_at: lo.created_at,
        }
      })

      const socRows: FamilyRow[] = (socRes.data || []).map((m: any) => ({
        id: m.user_id,
        family: m.name || 'Member',
        type: 'Society',
        society: m.society_name || '—',
        elder: '—',
        plan: 'Founding',
        status: m.membership_status || 'Active',
        created_at: m.created_at,
      }))

      const merged = [...nriRows, ...socRows].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
      setRows(merged)
    } catch (err) {
      console.error('Failed to load families:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (q && !(r.family.toLowerCase().includes(q) || r.society.toLowerCase().includes(q))) return false
      switch (filter) {
        case 'nri': return r.type === 'NRI'
        case 'society': return r.type === 'Society'
        case 'active': return (r.status || '').toLowerCase().includes('active')
        case 'trial': return (r.status || '').toLowerCase().includes('trial')
        default: return true
      }
    })
  }, [rows, search, filter])

  const statusBadge = (status: string) =>
    (status || '').toLowerCase().includes('trial')
      ? <Badge tone="amber">{status || 'Trial'}</Badge>
      : <Badge tone="green">{status || 'Active'}</Badge>

  return (
    <>
      <div className="adm-card-head" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div>
          <h1 className="adm-page-h">Families</h1>
          <p className="adm-page-sub" style={{ margin: 0 }}>NRI families and society members in one place.</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => navigate('/dashboard')}>Add family</button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <input
          className="adm-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by family name or society…"
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`adm-pill-f${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} h={48} />)}
          </div>
        ) : error ? (
          <ErrorBox onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No families found" sub="Try a different search or filter." />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Family</th><th>Type</th><th>Society</th><th>Elder</th>
                  <th>Plan</th><th>Status</th><th>Joined</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={`${r.id}-${i}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={r.family} size={30} />
                        <span style={{ fontWeight: 500 }}>{r.family}</span>
                      </div>
                    </td>
                    <td><Badge tone={r.type === 'NRI' ? 'blue' : 'purple'}>{r.type}</Badge></td>
                    <td>{r.society}</td>
                    <td>{r.elder}</td>
                    <td>{r.plan}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>{istDate(r.created_at)}</td>
                    <td><Link className="adm-link" to={`/admin/families/${r.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

/* ============================================================
   AdminFamilyDetail — single family / member deep view
   ============================================================ */

const medsToText = (meds?: any): string[] => {
  if (!Array.isArray(meds)) return []
  return meds.map((m: any) =>
    typeof m === 'string' ? m : [m?.name, m?.timing || m?.dose].filter(Boolean).join(' ')
  ).filter(Boolean)
}

export function AdminFamilyDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [d, setD] = useState<any>(null)
  const [notes, setNotes] = useState('')
  const [savedHint, setSavedHint] = useState(false)
  const notesKey = `adm-notes-${id}`

  async function load() {
    if (!id) return
    setLoading(true)
    setError(false)
    try {
      const [profRes, loRes, queriesRes, socRes, memRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('loved_ones').select('*').eq('family_user_id', id),
        supabase.from('member_queries').select('id, question, status, created_at')
          .eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('society_members').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('memberships').select('*').eq('user_id', id),
      ])

      const lovedOnes = loRes.data || []
      const lovedOneIds = lovedOnes.map((lo: any) => lo.id)

      let elderProfiles: any[] = []
      if (lovedOneIds.length) {
        const { data } = await supabase.from('elder_profiles').select('*').in('loved_one_id', lovedOneIds)
        elderProfiles = data || []
      }
      const elderIds = elderProfiles.map((e: any) => e.id)

      let visits: any[] = []
      if (elderIds.length) {
        const { data } = await supabase
          .from('visits').select('id, flags, one_moment, start_time, end_time, created_at')
          .in('elder_id', elderIds).order('created_at', { ascending: false })
        visits = data || []
      }

      let bookings: any[] = []
      if (lovedOneIds.length) {
        const { data } = await supabase
          .from('bookings').select('id, amount_paise, service_type, status, payment_status, scheduled_at, created_at')
          .in('loved_one_id', lovedOneIds).order('created_at', { ascending: false })
        bookings = data || []
      }

      setD({
        profile: profRes.data,
        society: socRes.data,
        lovedOnes,
        elderProfiles,
        visits,
        queries: queriesRes.data || [],
        bookings,
        memberships: memRes.data || [],
      })
    } catch (err) {
      console.error('Failed to load family detail:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [id])

  useEffect(() => {
    try { setNotes(localStorage.getItem(notesKey) || '') } catch { /* ignore */ }
  }, [notesKey])

  const saveNotes = () => {
    try {
      localStorage.setItem(notesKey, notes)
      setSavedHint(true)
      setTimeout(() => setSavedHint(false), 2000)
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <>
        <Skeleton h={40} />
        <div style={{ height: 16 }} />
        <Skeleton h={120} />
        <div style={{ height: 16 }} />
        <Skeleton h={200} />
      </>
    )
  }

  if (error) return <ErrorBox onRetry={load} />

  const name = d?.profile?.full_name || d?.society?.name
  if (!d || (!d.profile && !d.society)) {
    return (
      <>
        <Link className="adm-link" to="/admin/families" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <TbArrowLeft size={16} /> Families
        </Link>
        <Card><EmptyState title="Family not found" sub="This family may have been removed." /></Card>
      </>
    )
  }

  const isSociety = !!d.society && !d.profile
  const whatsapp = d.profile?.whatsapp_number || d.society?.mobile || ''
  const country = d.profile?.country || d.society?.area || '—'
  const waDigits = (whatsapp || '').replace(/[^0-9]/g, '')

  return (
    <>
      <Link className="adm-link" to="/admin/families" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <TbArrowLeft size={16} /> Families
      </Link>

      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Avatar name={name} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="adm-page-h" style={{ margin: 0 }}>{name || 'Family'}</h1>
              <Badge tone={isSociety ? 'purple' : 'blue'}>{isSociety ? 'Society' : 'NRI'}</Badge>
            </div>
            <p className="adm-page-sub" style={{ margin: '4px 0 0' }}>
              {whatsapp || 'No contact'} · {country}
              {d.society?.society_name ? ` · ${d.society.society_name}` : ''}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {waDigits && (
            <a className="adm-btn adm-btn-primary" href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TbBrandWhatsapp size={16} /> Send WhatsApp
            </a>
          )}
          <Link className="adm-btn" to="/admin/bookings" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TbCalendarPlus size={16} /> Schedule visit
          </Link>
          <Link className="adm-btn" to="/admin/reports" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TbFileText size={16} /> View reports
          </Link>
        </div>
      </Card>

      {/* Elder profile(s) */}
      {d.elderProfiles.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div className="adm-card-head"><span className="adm-card-title">Elder profile</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {d.elderProfiles.map((e: any) => {
              const meds = medsToText(e.current_medications)
              return (
                <div key={e.id} style={{ borderBottom: '0.5px solid var(--gray-light)', paddingBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>
                    {e.name}{e.age ? ` · ${e.age}` : ''}
                  </div>
                  {e.medical_conditions && <Detail label="Conditions" value={e.medical_conditions} />}
                  {meds.length > 0 && <Detail label="Medications" value={meds.join(', ')} />}
                  {e.allergies && <Detail label="Allergies" value={e.allergies} />}
                  {(e.doctor_name || e.doctor_phone) && (
                    <Detail label="Doctor" value={[e.doctor_name, e.doctor_phone].filter(Boolean).join(' · ')} />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Visit history */}
      {d.visits.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div className="adm-card-head"><span className="adm-card-title">Visit history</span></div>
          {d.visits.map((v: any) => {
            const ft = flagTone(v.flags)
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
                <div style={{ width: 110, flexShrink: 0, fontSize: 12, color: 'var(--gray-mid)' }}>{istDate(v.created_at || v.start_time)}</div>
                <Badge tone={ft.tone}>{ft.label}</Badge>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--gray-dark)' }}>{truncate(v.one_moment, 120)}</div>
              </div>
            )
          })}
        </Card>
      )}

      {/* Query history */}
      {d.queries.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div className="adm-card-head"><span className="adm-card-title">Query history</span></div>
          {d.queries.map((q: any) => (
            <div key={q.id} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--gray-dark)' }}>{truncate(q.question, 110)}</span>
                <Badge tone={q.status === 'doctor_reviewed' ? 'green' : 'amber'}>{q.status === 'doctor_reviewed' ? 'Reviewed' : 'Pending'}</Badge>
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 2 }}>{timeAgo(q.created_at)}</div>
            </div>
          ))}
        </Card>
      )}

      {/* Payment history */}
      {(d.bookings.length > 0 || d.memberships.length > 0) && (
        <Card style={{ marginBottom: 16 }}>
          <div className="adm-card-head"><span className="adm-card-title">Payment history</span></div>
          {d.memberships.map((m: any) => (
            <div key={`mem-${m.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Founding membership</div>
                <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{istDate(m.created_at)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)' }}>{inr(m.amount_paise)}</span>
                <Badge tone={m.status === 'active' ? 'green' : 'amber'}>{m.status || 'pending'}</Badge>
              </div>
            </div>
          ))}
          {d.bookings.map((b: any) => (
            <div key={`bk-${b.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid var(--gray-light)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{serviceLabel(b.service_type)}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>{istDate(b.scheduled_at || b.created_at)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)' }}>{inr(b.amount_paise)}</span>
                <Badge tone={b.payment_status === 'paid' ? 'green' : b.payment_status === 'failed' ? 'red' : 'amber'}>
                  {b.payment_status || 'pending'}
                </Badge>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Admin notes */}
      <Card>
        <div className="adm-card-head">
          <span className="adm-card-title">Admin notes</span>
          {savedHint && <span style={{ fontSize: 11, color: 'var(--sage)' }}>Saved locally</span>}
        </div>
        <textarea
          className="adm-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Private notes about this family — saved on this device only."
          rows={4}
        />
      </Card>
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, marginTop: 4 }}>
      <span style={{ width: 100, flexShrink: 0, color: 'var(--gray-mid)' }}>{label}</span>
      <span style={{ color: 'var(--gray-dark)' }}>{value}</span>
    </div>
  )
}
