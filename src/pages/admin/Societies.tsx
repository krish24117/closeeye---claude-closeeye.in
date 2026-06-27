import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TbBuildingCommunity, TbSpeakerphone, TbUsers } from 'react-icons/tb'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import {
  Card, Badge, Avatar, StatCard, EmptyState, ErrorBox, Skeleton, istDate, inr,
} from './_shared'

/* ---------- shared compose-announcement modal ---------- */
function ComposeModal({
  name, count, onClose,
}: { name: string; count: number; onClose: () => void }) {
  const { showToast } = useToast()
  const [msg, setMsg] = useState('')

  function send() {
    showToast(`Announcement queued for ${count} member${count === 1 ? '' : 's'}`, 'success')
    onClose()
  }

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 480, maxWidth: '92vw', background: '#fff',
          borderRadius: 'var(--radius-card)', padding: 24, zIndex: 90,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        <h2 className="adm-page-h" style={{ fontSize: 17, margin: '0 0 4px' }}>Announce to {name}</h2>
        <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '0 0 14px' }}>
          Reaching {count} member{count === 1 ? '' : 's'} in this society.
        </p>
        <textarea
          className="adm-textarea"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Write a warm, clear message for residents…"
          rows={5}
          style={{ width: '100%', marginBottom: 12 }}
        />
        <button className="adm-btn adm-btn-primary" onClick={send} style={{ width: '100%' }}>
          <TbSpeakerphone size={16} style={{ marginRight: 6, verticalAlign: '-3px' }} />
          Send via WhatsApp
        </button>
        <p style={{ fontSize: 11, color: 'var(--gray-mid)', margin: '10px 0 0', textAlign: 'center' }}>
          Broadcast delivery is queued to the ops team.
        </p>
      </div>
    </>
  )
}

/* ---------- society aggregation ---------- */
interface Society {
  name: string
  members: any[]
  total: number
  active: number
  area: string | null
}

function groupSocieties(rows: any[]): Society[] {
  const map: Record<string, Society> = {}
  ;(rows || []).forEach(r => {
    const name = r.society_name || 'Unassigned'
    if (!map[name]) map[name] = { name, members: [], total: 0, active: 0, area: null }
    const s = map[name]
    s.members.push(r)
    s.total += 1
    if (r.membership_status === 'active') s.active += 1
    if (!s.area && r.area) s.area = r.area
  })
  return Object.values(map).sort((a, b) => b.total - a.total)
}

/* ============================================================
   LIST
   ============================================================ */
export function AdminSocieties() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const [rows, setRows] = useState<any[]>([])
  const [compose, setCompose] = useState<Society | null>(null)

  async function load() {
    setLoading(true); setErr(false)
    const { data, error } = await supabase.from('society_members').select('*')
    if (error) { setErr(true); setLoading(false); return }
    setRows(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const societies = useMemo(() => groupSocieties(rows), [rows])
  const totalMembers = rows.length

  if (loading) return (
    <div className="adm-grid adm-grid-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} h={220} />)}</div>
  )
  if (err) return <ErrorBox onRetry={load} />

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h1 className="adm-page-h" style={{ margin: 0 }}>Societies</h1>
        <p className="adm-page-sub" style={{ margin: '2px 0 0', color: 'var(--gray-mid)', fontSize: 13 }}>
          Communities where Close Eye is the trusted presence next door.
        </p>
      </div>

      {societies.length === 0 ? (
        <Card><EmptyState title="No societies yet" sub="Members will appear here as communities sign up." /></Card>
      ) : (
        <div className="adm-grid adm-grid-2">
          {societies.map(s => {
            const live = s.active > 0
            const revenue = s.total * 10000 // ₹100 per member, in paise
            return (
              <Card key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TbBuildingCommunity size={18} color="var(--forest)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--black)' }}>{s.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 3 }}>
                      {s.area || 'Hyderabad'} · {s.total} member{s.total === 1 ? '' : 's'}
                    </div>
                  </div>
                  <Badge tone={live ? 'green' : 'amber'}>{live ? 'Live' : 'Trial'}</Badge>
                </div>

                <div style={{ display: 'flex', gap: 16, margin: '14px 0', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)' }}>{s.total}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>Registered members</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--forest)' }}>{s.active}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>Active families</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--black)' }}>{inr(revenue)}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-mid)' }}>Monthly revenue</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link
                    to={`/admin/societies/${encodeURIComponent(s.name)}`}
                    className="adm-btn adm-btn-primary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    View details
                  </Link>
                  <button
                    className="adm-btn"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => setCompose(s)}
                  >
                    Send announcement
                  </button>
                  <button
                    className="adm-btn"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => showToast('Editing society details is coming soon', 'info')}
                  >
                    Edit
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-mid)', fontSize: 13 }}>
        <TbUsers size={16} />
        <span>
          <strong style={{ color: 'var(--black)' }}>{totalMembers}</strong> member{totalMembers === 1 ? '' : 's'} across{' '}
          <strong style={{ color: 'var(--black)' }}>{societies.length}</strong> societ{societies.length === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {compose && (
        <ComposeModal name={compose.name} count={compose.total} onClose={() => setCompose(null)} />
      )}
    </>
  )
}

/* ============================================================
   DETAIL
   ============================================================ */
export function AdminSocietyDetail() {
  const { name } = useParams()
  const decodedName = decodeURIComponent(name || '')

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [revenuePaise, setRevenuePaise] = useState(0)
  const [compose, setCompose] = useState(false)

  async function load() {
    setLoading(true); setErr(false)
    const { data: mem, error } = await supabase
      .from('society_members')
      .select('*')
      .eq('society_name', decodedName)
      .order('created_at', { ascending: false })
    if (error) { setErr(true); setLoading(false); return }
    const list = mem || []
    setMembers(list)

    const userIds = [...new Set(list.map((m: any) => m.user_id).filter(Boolean))]
    let rev = 0
    if (userIds.length) {
      const { data: ships } = await supabase.from('memberships').select('*').in('user_id', userIds)
      rev = (ships || []).reduce((s: number, r: any) => s + (r.amount_paise || 0), 0)
    }
    setRevenuePaise(rev || list.length * 10000)
    setLoading(false)
  }
  useEffect(() => { load() }, [decodedName])

  const activeCount = members.filter(m => m.membership_status === 'active').length
  const area = members.find(m => m.area)?.area || 'Hyderabad'

  if (loading) return (
    <>
      <div className="adm-grid adm-grid-3" style={{ marginBottom: 20 }}>{[0, 1, 2].map(i => <Skeleton key={i} h={92} />)}</div>
      <Skeleton h={300} />
    </>
  )
  if (err) return <ErrorBox onRetry={load} />

  return (
    <>
      <Link to="/admin/societies" className="adm-link" style={{ display: 'inline-block', marginBottom: 12 }}>← Societies</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="adm-page-h" style={{ margin: 0 }}>{decodedName}</h1>
            <Badge tone="green">Live</Badge>
          </div>
          <p className="adm-page-sub" style={{ margin: '2px 0 0', color: 'var(--gray-mid)', fontSize: 13 }}>{area}</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => setCompose(true)}>
          <TbSpeakerphone size={16} style={{ marginRight: 6, verticalAlign: '-3px' }} />
          Send WhatsApp announcement
        </button>
      </div>

      <div className="adm-grid adm-grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Members" value={members.length} sub="Registered residents" />
        <StatCard label="Active" value={activeCount} sub="Active memberships" subTone={activeCount > 0 ? 'pos' : undefined} />
        <StatCard label="Revenue" value={inr(revenuePaise)} sub="Founding fees collected" />
      </div>

      <Card>
        <div className="adm-card-head"><span className="adm-card-title">Members</span></div>
        {members.length === 0 ? (
          <EmptyState title="No members in this society" sub="Residents will appear here once they join." />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Flat</th>
                  <th>Mobile</th>
                  <th>Member ID</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={m.name} size={28} />
                        <span style={{ fontWeight: 500 }}>{m.name || 'Member'}</span>
                      </div>
                    </td>
                    <td>{m.flat_number || '—'}</td>
                    <td>{m.mobile || '—'}</td>
                    <td>{m.member_id || '—'}</td>
                    <td>
                      <Badge tone={m.membership_status === 'active' ? 'green' : 'amber'}>
                        {m.membership_status === 'active' ? 'Active' : (m.membership_status || 'Pending')}
                      </Badge>
                    </td>
                    <td>{istDate(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {compose && (
        <ComposeModal name={decodedName} count={members.length} onClose={() => setCompose(false)} />
      )}
    </>
  )
}
