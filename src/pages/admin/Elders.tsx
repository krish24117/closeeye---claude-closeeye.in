import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Plus, Pencil, UserCheck, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import { ElderProfileModal } from './ElderProfileModal'

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
  const [lastVisit, setLastVisit]   = useState<Record<string, string>>({})   // elder_id -> ISO
  const [companionByLO, setCompanionByLO] = useState<Record<string, string>>({}) // loved_one_id -> companion name
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

      // Latest visit per elder
      const lv: Record<string, string> = {}
      ;(visitsRes.data || []).forEach((v: any) => {
        if (!v.elder_id) return
        const when = v.end_time || v.created_at
        if (!lv[v.elder_id] || new Date(when) > new Date(lv[v.elder_id])) lv[v.elder_id] = when
      })
      setLastVisit(lv)

      // Most recent assigned companion per loved one
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl text-green-900">Elders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{elders.length} elder profile{elders.length === 1 ? '' : 's'}</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 text-sm font-semibold bg-green-800 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors">
          <Plus size={16} /> Add New Elder
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or city…"
        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
      />

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">👵</p>
          <p className="font-semibold text-green-900">{elders.length === 0 ? 'No elder profiles yet' : 'No matches'}</p>
          <p className="text-sm text-gray-400 mt-1">
            {elders.length === 0 ? 'Add the first elder profile above.' : 'Try a different search.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Last visit</th>
                  <th className="px-4 py-3">Companion</th>
                  <th className="px-4 py-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(e => {
                  const name = e.name || e.loved_ones?.full_name || '—'
                  const city = e.city || e.loved_ones?.city || '—'
                  const lv   = lastVisit[e.id]
                  const comp = e.loved_one_id ? companionByLO[e.loved_one_id] : null
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-green-900">
                        {name}
                        {!e.loved_one_id && <span className="ml-2 text-[10px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">Unlinked</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.age ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{city}</td>
                      <td className="px-4 py-3 text-gray-600">{lv ? format(new Date(lv), 'dd MMM yyyy') : <span className="text-gray-300">No visits</span>}</td>
                      <td className="px-4 py-3 text-gray-600">{comp || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(e)} className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-900">
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
          <div className="md:hidden space-y-2">
            {filtered.map(e => {
              const name = e.name || e.loved_ones?.full_name || '—'
              const city = e.city || e.loved_ones?.city || '—'
              const lv   = lastVisit[e.id]
              const comp = e.loved_one_id ? companionByLO[e.loved_one_id] : null
              return (
                <div key={e.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-green-900">{name}{e.age ? <span className="text-gray-400 font-normal">, {e.age}</span> : ''}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{city}</p>
                    </div>
                    <button onClick={() => openEdit(e)} className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-green-700 border border-green-200 rounded-xl px-2.5 py-1.5">
                      <Pencil size={12} /> Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><CalendarClock size={12} /> {lv ? format(new Date(lv), 'dd MMM yyyy') : 'No visits'}</span>
                    {comp && <span className="flex items-center gap-1"><UserCheck size={12} /> {comp}</span>}
                    {!e.loved_one_id && <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">Unlinked</span>}
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
