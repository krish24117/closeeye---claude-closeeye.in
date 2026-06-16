import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { UserPlus, UserMinus, Plus, FileText } from 'lucide-react'
import { AddCompanionModal } from './AddCompanionModal'
import { AVAILABILITY_LABELS, COMPANION_STATUS_COLORS as STATUS_COLORS } from '@/lib/companion-options'

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
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [companionsRes, companionProfilesRes, familiesRes] = await Promise.all([
        supabase.from('companions').select('*').order('full_name'),
        supabase.from('profiles').select('id,full_name,whatsapp_number,avatar_url').eq('role', 'companion'),
        supabase.from('profiles').select('id,full_name,whatsapp_number').eq('role', 'family').order('full_name'),
      ])
      if (companionsRes.error) throw companionsRes.error
      if (companionProfilesRes.error) throw companionProfilesRes.error
      if (familiesRes.error) throw familiesRes.error
      setCompanions(companionsRes.data || [])
      setCompanionProfiles(companionProfilesRes.data || [])
      setFamilyProfiles(familiesRes.data || [])
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

  // Resolve signed URLs for profile photos and ID proof documents
  useEffect(() => {
    const photoPaths = companions.map(c => c.photo_url).filter(Boolean) as string[]
    if (photoPaths.length) {
      supabase.storage.from('companion-photos').createSignedUrls(photoPaths, 3600).then(({ data, error }) => {
        if (error) { console.error('Failed to load photo URLs:', error); return }
        const map: Record<string, string> = {}
        data?.forEach(d => { if (d.signedUrl && d.path) map[d.path] = d.signedUrl })
        setPhotoUrls(map)
      })
    }
    const idPaths = companions.map(c => c.id_proof_url).filter(Boolean) as string[]
    if (idPaths.length) {
      supabase.storage.from('companion-documents').createSignedUrls(idPaths, 3600).then(({ data, error }) => {
        if (error) { console.error('Failed to load ID proof URLs:', error); return }
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
    } catch (err) {
      console.error('Failed to update phone:', err)
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
    } catch (err) {
      console.error('Failed to update status:', err)
      showToast('Could not update status — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  async function removeAccess(p: any) {
    if (!window.confirm(`Remove companion access for ${p.full_name}? They'll become a family account again.`)) return
    setSavingId(p.id)
    try {
      const { error } = await supabase.from('profiles').update({ role: 'family' }).eq('id', p.id)
      if (error) throw error
      setCompanionProfiles(prev => prev.filter(x => x.id !== p.id))
      setFamilyProfiles(prev => [...prev, p].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      showToast(`Removed companion access for ${p.full_name}`, 'success')
    } catch (err) {
      console.error('Failed to remove companion access:', err)
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
        .select()
        .single()
      if (upsertErr) throw upsertErr
      setFamilyProfiles(prev => prev.filter(x => x.id !== p.id))
      setCompanionProfiles(prev => [...prev, p].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      setCompanions(prev => [...prev.filter(c => c.id !== p.id), row].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      setPhoneInputs(prev => ({ ...prev, [p.id]: '' }))
      showToast(`${p.full_name} is now a companion`, 'success')
    } catch (err) {
      console.error('Failed to promote to companion:', err)
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

  if (loading) return <Spinner />

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl text-green-900">Companions</h1>
          <p className="text-gray-400 text-sm mt-1">Manage the companion roster — add, approve, and promote.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-sm font-semibold bg-green-800 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
        >
          <Plus size={16} /> Add Companion
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Companion roster */}
      <div className="space-y-3">
        <h2 className="font-semibold text-green-900">Companions ({companions.length})</h2>
        {companions.length === 0 ? (
          <div className="text-center py-12 bg-green-50 rounded-2xl">
            <p className="text-4xl mb-3">🧑‍🤝‍🧑</p>
            <p className="font-semibold text-green-900">No companions yet</p>
            <p className="text-sm text-gray-400 mt-1">Add one above, or promote a family member below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {companions.map(c => {
              const linkedProfile = companionProfiles.find(p => p.id === c.id)
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.photo_url && photoUrls[c.photo_url] ? (
                        <img src={photoUrls[c.photo_url]} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                          {c.full_name?.[0] || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-green-900 text-sm truncate">{c.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {[c.phone, c.email, c.city].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[c.status] || 'bg-gray-50 text-gray-600'}`}>
                      {c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : 'Unknown'}
                    </span>
                  </div>

                  {(c.languages?.length > 0 || c.skills?.length > 0 || c.availability || (c.id_proof_url && idProofUrls[c.id_proof_url])) && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.languages?.map((l: string) => (
                        <span key={l} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">{l}</span>
                      ))}
                      {c.skills?.map((s: string) => (
                        <span key={s} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">{s}</span>
                      ))}
                      {c.availability && (
                        <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">{AVAILABILITY_LABELS[c.availability] || c.availability}</span>
                      )}
                      {c.id_proof_url && idProofUrls[c.id_proof_url] && (
                        <a
                          href={idProofUrls[c.id_proof_url]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-green-700 hover:text-green-800 px-2 py-1 rounded-lg bg-green-50 flex items-center gap-1"
                        >
                          <FileText size={12} /> ID proof
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <input
                        value={phoneInputs[c.id] ?? ''}
                        onChange={e => setPhoneInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="Contact phone"
                        className="w-32 sm:w-36 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                      />
                      <button
                        onClick={() => savePhone(c.id)}
                        disabled={savingId === c.id}
                        className="text-xs font-semibold bg-green-800 text-white px-3 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={c.status || 'pending'}
                        onChange={e => updateStatus(c.id, e.target.value)}
                        disabled={savingId === c.id}
                        className="text-xs font-semibold border-2 border-gray-200 rounded-xl px-2 py-2 focus:outline-none focus:border-green-600 bg-white disabled:opacity-50"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      {linkedProfile && (
                        <button
                          onClick={() => removeAccess(linkedProfile)}
                          disabled={savingId === c.id}
                          className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 px-2"
                        >
                          <UserMinus size={14} /> Remove access
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Promote a family member */}
      <div className="space-y-3">
        <h2 className="font-semibold text-green-900">Promote a family member</h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
        />
        {filteredFamilies.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No family accounts found.</p>
        ) : (
          <div className="space-y-2">
            {filteredFamilies.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">
                    {p.full_name?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-green-900 text-sm truncate">{p.full_name}</p>
                    <p className="text-xs text-gray-400">{p.whatsapp_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => promote(p)}
                  disabled={savingId === p.id}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-green-800 text-white px-3 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <UserPlus size={14} /> Make companion
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
