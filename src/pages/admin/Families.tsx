import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Skeleton'
import { Heart } from 'lucide-react'

export function AdminFamilies() {
  const [families, setFamilies] = useState<any[]>([])
  const [lovedOnes, setLovedOnes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [familiesRes, lovedOnesRes] = await Promise.all([
        supabase.from('profiles').select('id,full_name,whatsapp_number,country').eq('role', 'family').order('full_name'),
        supabase.from('loved_ones').select('id,family_user_id,full_name,age,city'),
      ])
      if (familiesRes.error) throw familiesRes.error
      if (lovedOnesRes.error) throw lovedOnesRes.error
      setFamilies(familiesRes.data || [])
      setLovedOnes(lovedOnesRes.data || [])
    } catch (err) {
      console.error('Failed to load families:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = families.filter(f => !search || f.full_name?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Spinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-serif text-2xl text-green-900">Families</h1>
        <p className="text-gray-400 text-sm mt-1">All registered families and their loved ones.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by family name..."
        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">👨‍👩‍👧</p>
          <p className="font-semibold text-green-900">No families found</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const familyLovedOnes = lovedOnes.filter(lo => lo.family_user_id === f.id)
            return (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-green-900 text-sm">{f.full_name}</p>
                    <p className="text-xs text-gray-400">{f.whatsapp_number} · {f.country}</p>
                  </div>
                  <span className="text-xs font-semibold bg-pink-50 text-pink-700 px-2.5 py-1 rounded-full">
                    {familyLovedOnes.length} loved one{familyLovedOnes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {familyLovedOnes.length === 0 ? (
                  <p className="text-xs text-gray-400">No loved ones added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {familyLovedOnes.map(lo => (
                      <div key={lo.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                        <Heart size={12} className="text-pink-500" />
                        <p className="text-xs text-gray-600">{lo.full_name}{lo.age ? `, ${lo.age}` : ''} · {lo.city}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
