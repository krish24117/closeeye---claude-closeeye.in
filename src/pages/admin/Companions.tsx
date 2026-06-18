import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { UserPlus, UserMinus, Plus, FileText, Phone, ChevronDown } from 'lucide-react'
import { AddCompanionModal } from './AddCompanionModal'
import { AVAILABILITY_LABELS, COMPANION_STATUS_COLORS as STATUS_COLORS } from '@/lib/companion-options'

// ── Helpers ────────────────────────────────────────────────────────────────────

function callLink(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `tel:${digits}`
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
      {name?.[0] || '?'}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function AdminCompanions() {
  const { showToast } = useToast()
  const [companions, setCompanions] = useState<any[]>([])
  const [companionProfiles, setCompanionProfiles] = useState<any[]>([])
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [idProofUrls, setIdProofUrls] = useState<Record<string, string>>({})
  const [visitsThisMonth, setVisitsThisMonth] = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [companionsRes, companionProfilesRes, familiesRes, visitsRes] = await Promise.all([
        supabase.from('companions').select('*').order('full_name'),
        supabase.from('profiles').select('id,full_name,whatsapp_number,avatar_url').eq('role', 'companion'),
        supabase.from('profiles').select('id,full_name,whatsapp_number').eq('role', 'family').order('full_name'),
        supabase.from('bookings')
          .select('companion_id')
          .gte('created_at', startOfMonth)
          .not('companion_id', 'is', null),
      ])
      if (companionsRes.error) throw companionsRes.error

      setCompanions(companionsRes.data || [])
      setCompanionProfiles(companionProfilesRes.data || [])
      setFamilyProfiles(familiesRes.data || [])

      // Tally visits per companion this month
      const tally: Record<string, number> = {}
      ;(visitsRes.data || []).forEach((b: any) => {
        if (b.companion_id) tally[b.companion_id] = (tally[b.companion_id] || 0) + 1
      })
      setVisitsThisMonth(tally)

      const phones: Record<string, string> = {}
      ;(companionsRes.data || []).forEach((c: any) => { phones[c.id] = c.phone || '' })
      setPhoneInputs(phones)
    } catch (err) {
      console.error('Failed to load companions:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Resolve signed URLs for photos and ID proofs
  useEffect(() => {
    const photoPaths = companions.map(c => c.photo_url).filter(Boolean) as string[]
    if (photoPaths.length) {
      supabase.storage.from('companion-photos').createSignedUrls(photoPaths, 3600).then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
        setPhotoUrls(map)
      })
    }
    const idPaths = companions.map(c => c.id_proof_url).filter(Boolean) as string[]
    if (idPaths.length) {
      supabase.storage.from('companion-documents').createSignedUrls(idPaths, 3600).then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
        setIdProofUrls(map)
      })
    }
  }, [companions])

  async function savePhone(id: string) {
    setSavingId(id)
    try {
      const phone = phoneInputs[id] ?? ''
      const { error } = await supabase.from('companions').update({ phone }).eq('id', id)
      if (error) throw error
      setCompanions(prev => prev.map(c => c.id === id ? { ...c, phone } : c))
      showToast('Phone updated', 'success')
    } catch {
      showToast('Could not update phone — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function updateStatus(id: string, status: string) {
    setSavingId(id)
    try {
      const { error } = await supabase.from('companions').update({ status }).eq('id', id)
      if (error) throw error
      setCompanions(prev => prev.map(c => c.id === id ? { ...c, status } : c))
      showToast(`Marked as ${status}`, 'success')
    } catch {
      showToast('Could not update status — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function removeAccess(p: any) {
    if (!window.confirm(`Remove companion access for ${p.full_name}?`)) return
    setSavingId(p.id)
    try {
      const { error } = await supabase.from('profiles').update({ role: 'family' }).eq('id', p.id)
      if (error) throw error
      setCompanionProfiles(prev => prev.filter(x => x.id !== p.id))
      setFamilyProfiles(prev => [...prev, p].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      showToast(`Removed companion access for ${p.full_name}`, 'success')
    } catch {
      showToast('Could not update — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function promote(p: any) {
    setSavingId(p.id)
    try {
      const { error: roleErr } = await supabase.from('profiles').update({ role: 'companion' }).eq('id', p.id)
      if (roleErr) throw roleErr
      const { data: row, error: upsertErr } = await supabase.from('companions')
        .upsert({ id: p.id, full_name: p.full_name, phone: '', city: '', status: 'approved' })
        .select().single()
      if (upsertErr) throw upsertErr
      setFamilyProfiles(prev => prev.filter(x => x.id !== p.id))
      setCompanionProfiles(prev => [...prev, p].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      setCompanions(prev => [...prev.filter(c => c.id !== p.id), row].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      setPhoneInputs(prev => ({ ...prev, [p.id]: '' }))
      showToast(`${p.full_name} is now a companion`, 'success')
    } catch {
      showToast('Could not promote — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  function handleAdded(row: any) {
    setCompanions(prev => [row, ...prev])
    setPhoneInputs(prev => ({ ...prev, [row.id]: row.phone || '' }))
    setShowAddModal(false)
    showToast(`${row.full_name} added`, 'success')
  }

  const filteredFamilies = familyProfiles.filter(p =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const active = companions.filter(c => c.status === 'approved')
  const inactive = companions.filter(c => c.status !== 'approved')

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl text-green-900">Companions</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {active.length} active · {inactive.length} pending/inactive
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-green-800 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Companion cards */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : companions.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">🧑‍🤝‍🧑</p>
          <p className="font-semibold text-green-900">No companions yet</p>
          <p className="text-sm text-gray-400 mt-1">Add one above, or promote a family member below.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {companions.map(c => {
            const linkedProfile = companionProfiles.find(p => p.id === c.id)
            const isInactive = c.status !== 'approved'
            const phone = phoneInputs[c.id] ?? c.phone ?? ''
            const visits = visitsThisMonth[c.id] || 0
            const isExpanded = expanded === c.id

            return (
              <div key={c.id} className={`bg-white rounded-2xl border border-gray-100 transition-all ${isInactive ? 'opacity-60' : ''}`}>
                {/* Compact row */}
                <button
                  className="w-full text-left px-4 py-3 flex items-center gap-3"
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                >
                  <Avatar
                    name={c.full_name}
                    photoUrl={c.photo_url && photoUrls[c.photo_url] ? photoUrls[c.photo_url] : undefined}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-green-900 text-sm truncate">{c.full_name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-500'}`}>
                        {c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {/* Visits this month */}
                      <span className="text-xs text-gray-400">
                        <span className="font-semibold text-gray-600">{visits}</span> visit{visits !== 1 ? 's' : ''} this month
                      </span>
                      {/* Rating placeholder */}
                      <span className="text-xs text-gray-400">
                        ★ {(c.rating ?? '—')}
                      </span>
                      {/* City */}
                      {c.city && <span className="text-xs text-gray-400">{c.city}</span>}
                    </div>
                  </div>
                  {/* Click-to-call */}
                  {c.phone && (
                    <a
                      href={callLink(c.phone)}
                      onClick={e => e.stopPropagation()}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-green-700 border border-green-200 rounded-xl px-2.5 py-1.5 hover:bg-green-50 transition-colors"
                    >
                      <Phone size={12} /> Call
                    </a>
                  )}
                  <ChevronDown size={14} className={`text-gray-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-50 px-4 pb-4 pt-3 space-y-3">
                    {/* Tags */}
                    {(c.languages?.length > 0 || c.skills?.length > 0 || c.availability) && (
                      <div className="flex flex-wrap gap-1.5">
                        {c.languages?.map((l: string) => (
                          <span key={l} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-lg">{l}</span>
                        ))}
                        {c.skills?.map((s: string) => (
                          <span key={s} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-lg">{s}</span>
                        ))}
                        {c.availability && (
                          <span className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded-lg">
                            {AVAILABILITY_LABELS[c.availability] || c.availability}
                          </span>
                        )}
                        {c.id_proof_url && idProofUrls[c.id_proof_url] && (
                          <a
                            href={idProofUrls[c.id_proof_url]}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-green-700 px-2 py-0.5 rounded-lg bg-green-50 flex items-center gap-1"
                          >
                            <FileText size={11} /> ID proof
                          </a>
                        )}
                      </div>
                    )}

                    {/* Phone + status actions */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        value={phone}
                        onChange={e => setPhoneInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="Phone number"
                        className="w-36 border-2 border-gray-200 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-600"
                      />
                      <button
                        onClick={() => savePhone(c.id)}
                        disabled={savingId === c.id}
                        className="text-xs font-semibold bg-green-800 text-white px-3 py-1.5 rounded-xl hover:bg-green-700 disabled:opacity-50"
                      >
                        Save
                      </button>

                      <div className="relative">
                        <select
                          value={c.status || 'pending'}
                          onChange={e => updateStatus(c.id, e.target.value)}
                          disabled={savingId === c.id}
                          className="text-xs border-2 border-gray-200 rounded-xl px-2.5 py-1.5 pr-6 appearance-none bg-white focus:outline-none focus:border-green-600 disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>

                      {linkedProfile && (
                        <button
                          onClick={() => removeAccess(linkedProfile)}
                          disabled={savingId === c.id}
                          className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          <UserMinus size={13} /> Remove access
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Promote a family member */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Promote a family member</p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
        />
        {!loading && filteredFamilies.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No family accounts found.</p>
        ) : (
          <div className="space-y-2">
            {filteredFamilies.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {p.full_name?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-green-900 truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400">{p.whatsapp_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => promote(p)}
                  disabled={savingId === p.id}
                  className="flex items-center gap-1 text-xs font-semibold bg-green-800 text-white px-3 py-1.5 rounded-xl hover:bg-green-700 disabled:opacity-50"
                >
                  <UserPlus size={13} /> Make companion
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddCompanionModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />
      )}
    </div>
  )
}
