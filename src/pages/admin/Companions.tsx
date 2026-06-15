import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { UserPlus, UserMinus } from 'lucide-react'

export function AdminCompanions() {
  const { showToast } = useToast()
  const [companionProfiles, setCompanionProfiles] = useState<any[]>([])
  const [companionRows, setCompanionRows] = useState<any[]>([])
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [companionsRes, companionRowsRes, familiesRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,whatsapp_number,avatar_url').eq('role', 'companion').order('full_name'),
        supabase.from('companions').select('id,full_name,phone'),
        supabase.from('profiles').select('id,full_name,whatsapp_number').eq('role', 'family').order('full_name'),
      ])
      if (companionsRes.error) throw companionsRes.error
      if (companionRowsRes.error) throw companionRowsRes.error
      if (familiesRes.error) throw familiesRes.error
      setCompanionProfiles(companionsRes.data || [])
      setCompanionRows(companionRowsRes.data || [])
      setFamilyProfiles(familiesRes.data || [])
      const phones: Record<string, string> = {}
      ;(companionRowsRes.data || []).forEach((c: any) => { phones[c.id] = c.phone || '' })
      setPhoneInputs(phones)
    } catch (err) {
      console.error('Failed to load companions:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function savePhone(id: string) {
    setSavingId(id)
    try {
      const phone = phoneInputs[id] ?? ''
      const { error } = await supabase.from('companions').update({ phone }).eq('id', id)
      if (error) throw error
      setCompanionRows(prev => prev.map(c => c.id === id ? { ...c, phone } : c))
      showToast('Phone updated', 'success')
    } catch (err) {
      console.error('Failed to update phone:', err)
      showToast('Could not update phone — try again', 'error')
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
      setCompanionRows(prev => prev.filter(x => x.id !== p.id))
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
      const { error: upsertErr } = await supabase.from('companions').upsert({ id: p.id, full_name: p.full_name, phone: '' })
      if (upsertErr) throw upsertErr
      setFamilyProfiles(prev => prev.filter(x => x.id !== p.id))
      setCompanionProfiles(prev => [...prev, p].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      setCompanionRows(prev => [...prev, { id: p.id, full_name: p.full_name, phone: '' }])
      setPhoneInputs(prev => ({ ...prev, [p.id]: '' }))
      showToast(`${p.full_name} is now a companion`, 'success')
    } catch (err) {
      console.error('Failed to promote to companion:', err)
      showToast('Could not promote — try again', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const companions = companionProfiles.map(p => ({
    ...p,
    phone: companionRows.find(c => c.id === p.id)?.phone ?? '',
  }))

  const filteredFamilies = familyProfiles.filter(p =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="text-center py-20 text-gray-400">Loading companions...</div>

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Companions</h1>
        <p className="text-gray-400 text-sm mt-1">Manage companion accounts and promote family members.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Current companions */}
      <div className="space-y-3">
        <h2 className="font-semibold text-green-900">Current companions ({companions.length})</h2>
        {companions.length === 0 ? (
          <div className="text-center py-12 bg-green-50 rounded-2xl">
            <p className="text-4xl mb-3">🧑‍🤝‍🧑</p>
            <p className="font-semibold text-green-900">No companions yet</p>
            <p className="text-sm text-gray-400 mt-1">Promote a family member below to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {companions.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                    {c.full_name?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-green-900 text-sm truncate">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.whatsapp_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={phoneInputs[c.id] ?? ''}
                    onChange={e => setPhoneInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="Contact phone"
                    className="w-36 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                  />
                  <button
                    onClick={() => savePhone(c.id)}
                    disabled={savingId === c.id}
                    className="text-xs font-semibold bg-green-800 text-white px-3 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => removeAccess(c)}
                    disabled={savingId === c.id}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 px-2"
                  >
                    <UserMinus size={14} /> Remove access
                  </button>
                </div>
              </div>
            ))}
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
    </div>
  )
}
