import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { Pencil, UserCheck, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import { ElderProfileModal } from './ElderProfileModal'
import { Badge, Skeleton, EmptyState, ErrorBox } from './_shared'

interface LovedOneOption {
  id: string
  full_name: string | null
  city: string | null
  family_user_id: string | null
}

export function AdminElders() {
  const { showToast } = useToast()
  const [elders, setElders]         = useState<any[]>([])
  const [lovedOnes, setLovedOnes]   = useState<LovedOneOption[]>([])
  const [lastVisit, setLastVisit]   = useState<Record<string, string>>({})
  const [companionByLO, setCompanionByLO] = useState<Record<string, string>>({})
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [editing, setEditing]       = useState<any | null>(null)
  const [showModal, setShowModal]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [eldersRes, lovedOnesRes, visitsRes, bookingsRes, companionsRes] = await Promise.all([
        supabase.from('elder_profiles').select('*, loved_ones(id, full_name, city, family_user_id)').order('name'),
        supabase.from('loved_ones').select('id, full_name, city, family_user_id').order('full_name'),
        supabase.from('visits').select('elder_id, end_time, created_at').order('created_at', { ascending: false }),
        supabase.from('bookings').select('loved_one_id, companion_id, created_at').not('companion_id', 'is', null).order('created_at', { ascending: false }),
        supabase.from('companions').select('id, full_name'),
      ])
      if (eldersRes.error) throw eldersRes.error
      setElders(eldersRes.data || [])
      setLovedOnes(lovedOnesRes.data || [])

      const lv: Record<string, string> = {}
      ;(visitsRes.data || []).forEach((v: any) => {
        if (!v.elder_id) return
        const when = v.end_time || v.created_at
        if (!lv[v.elder_id] || new Date(when) > new Date(lv[v.elder_id])) lv[v.elder_id] = when
      })
      setLastVisit(lv)

      const compNames: Record<string, string> = {}
      ;(companionsRes.data || []).forEach((c: any) => { compNames[c.id] = c.full_name })
      const byLO: Record<string, string> = {}
      ;(bookingsRes.data || []).forEach((b: any) => {
        if (b.loved_one_id && b.companion_id && !byLO[b.loved_one_id]) {
          byLO[b.loved_one_id] = compNames[b.companion_id] || 'Assigned'
        }
      })
      setCompanionByLO(byLO)
    } catch (err) {
      console.error('Failed to load elders:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  function openAdd()  { setEditing(null); setShowModal(true) }
  function openEdit(e: any) { setEditing(e); setShowModal(true) }

  function handleSaved(row: any) {
    setElders(prev => {
      const exists = prev.some(e => e.id === row.id)
      const next = exists ? prev.map(e => e.id === row.id ? row : e) : [row, ...prev]
      return next.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    })
    setShowModal(false)
    showToast(editing ? 'Elder profile updated' : 'Elder profile created', 'success')
  }

  const filtered = elders.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    const name = (e.name || e.loved_ones?.full_name || '').toLowerCase()
    const city = (e.city || e.loved_ones?.city || '').toLowerCase()
    return name.includes(q) || city.includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="adm-page-h">Elders</h1>
          <p className="adm-page-sub">{elders.length} elder profile{elders.length === 1 ? '' : 's'}</p>
        </div>
        <button onClick={openAdd} className="adm-btn adm-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add New Elder
        </button>
      </div>

      {error && <ErrorBox onRetry={load} />}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or city…"
        className="adm-input"
        style={{ width: '100%' }}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} h={88} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={elders.length === 0 ? 'No elder profiles yet' : 'No matches'}
          sub={elders.length === 0 ? 'Add the first elder profile above.' : 'Try a different search.'}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="adm-table-wrap" style={{ display: 'none' }} data-desktop>
            <style>{`@media (min-width: 768px) { [data-desktop] { display: block !important; } [data-mobile] { display: none !important; } }`}</style>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>City</th>
                  <th>Last visit</th>
                  <th>Companion</th>
                  <th style={{ textAlign: 'right' }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const name = e.name || e.loved_ones?.full_name || '—'
                  const rawCity = e.city || e.loved_ones?.city || ''
                  const lv   = lastVisit[e.id]
                  const comp = e.loved_one_id ? companionByLO[e.loved_one_id] : null
                  return (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600, color: 'var(--forest)' }}>
                        {name}
                        {!e.loved_one_id && (
                          <span style={{ marginLeft: 8 }}><Badge tone="amber">Unlinked</Badge></span>
                        )}
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{e.age ?? '—'}</td>
                      <td>
                        {rawCity
                          ? <span style={{ color: 'var(--muted)' }}>{rawCity}</span>
                          : <Badge tone="amber">City missing</Badge>
                        }
                      </td>
                      <td style={{ color: 'var(--muted)' }}>
                        {lv ? format(new Date(lv), 'dd MMM yyyy') : <span style={{ color: 'var(--gray-light)' }}>No visits</span>}
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{comp || <span style={{ color: 'var(--gray-light)' }}>—</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => openEdit(e)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--forest)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div data-mobile style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(e => {
              const name = e.name || e.loved_ones?.full_name || '—'
              const rawCity = e.city || e.loved_ones?.city || ''
              const lv   = lastVisit[e.id]
              const comp = e.loved_one_id ? companionByLO[e.loved_one_id] : null
              return (
                <div key={e.id} className="adm-card adm-card-pad">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: 'var(--forest)', margin: 0 }}>
                        {name}{e.age ? <span style={{ color: 'var(--gray-mid)', fontWeight: 400 }}>, {e.age}</span> : ''}
                      </p>
                      {rawCity
                        ? <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>{rawCity}</p>
                        : <p style={{ marginTop: 4 }}><Badge tone="amber">City missing</Badge></p>
                      }
                    </div>
                    <button
                      onClick={() => openEdit(e)}
                      style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--forest)', border: '1px solid var(--sage)', borderRadius: 'var(--radius-card)', padding: '6px 10px', background: 'none', cursor: 'pointer' }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CalendarClock size={12} /> {lv ? format(new Date(lv), 'dd MMM yyyy') : 'No visits'}
                    </span>
                    {comp && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <UserCheck size={12} /> {comp}
                      </span>
                    )}
                    {!e.loved_one_id && <Badge tone="amber">Unlinked</Badge>}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {showModal && (
        <ElderProfileModal
          elder={editing}
          lovedOnes={lovedOnes}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
