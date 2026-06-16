// src/pages/dashboard/LovedOnes.tsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { Plus, X, Pencil, Trash2, Phone } from 'lucide-react'
import { Spinner } from '@/components/ui/Skeleton'

export function DashboardLovedOnes() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('loved_ones').select('*').order('created_at',{ascending:false})
      if (error) throw error
      setList(data||[])
    } catch (err) {
      console.error('Failed to load loved ones:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(person: any) {
    reset(person)
    setEditingId(person.id)
    setShowForm(true)
  }

  function toggleForm() {
    if (showForm) {
      reset({})
      setEditingId(null)
    }
    setShowForm(!showForm)
  }

  async function onSubmit(data: any) {
    if (!user) return
    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('loved_ones').update(data).eq('id', editingId)
        if (error) throw error
        showToast('Loved one updated', 'success')
      } else {
        const { error } = await supabase.from('loved_ones').insert({ ...data, family_user_id: user.id })
        if (error) throw error
        showToast('Loved one added', 'success')
      }
      await load()
      reset(); setShowForm(false); setEditingId(null)
    } catch (err) {
      console.error('Failed to save loved one:', err)
      showToast('Could not save — try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(p: any) {
    if (!window.confirm(`Remove ${p.full_name} from your loved ones? This can't be undone.`)) return
    try {
      const { error } = await supabase.from('loved_ones').delete().eq('id', p.id)
      if (error) throw error
      await load()
      showToast('Loved one removed', 'success')
    } catch (err) {
      console.error('Failed to delete loved one:', err)
      showToast('Could not remove — try again', 'error')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-green-900">Loved Ones</h1>
        <button onClick={toggleForm} className="flex items-center gap-2 bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
          {showForm ? <><X size={14}/>Cancel</> : <><Plus size={14}/>Add person</>}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-green-900">{editingId ? 'Edit loved one' : 'Add a loved one'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              ['full_name','Full name','e.g. Sunita Reddy',true],
              ['age','Age','65',false],
              ['phone','Phone number','+91 98765 43210',false],
              ['city','City','Hyderabad',true],
              ['address','Home address','EIPL Rivera A-405...',true],
            ] as [string,string,string,boolean][]).map(([n,l,p,req])=>(
              <div key={n} className={n==='address'?'sm:col-span-2':''}>
                <label className="block text-xs font-semibold text-green-900 mb-1">{l}{req?' *':''}</label>
                <input
                  {...register(n, { required: req ? 'This field is required' : false })}
                  placeholder={p}
                  className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none ${(errors as any)[n] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-green-600'}`}
                />
                {(errors as any)[n] && (
                  <p className="text-red-500 text-xs mt-1">{(errors as any)[n]?.message || 'Required'}</p>
                )}
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1">Doctor name</label>
              <input {...register('doctor_name')} placeholder="Dr. Sharma" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1">Nearest hospital</label>
              <input {...register('nearest_hospital')} placeholder="Apollo Jubilee Hills" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1">Emergency contact name</label>
              <input {...register('emergency_contact_name')} placeholder="Suresh (son)" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1">Emergency contact phone</label>
              <input {...register('emergency_contact_phone')} placeholder="+91 98765 43210" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-green-900 mb-1">Medical notes</label>
              <textarea {...register('medical_notes')} rows={2} placeholder="Diabetes, blood pressure medication..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="bg-green-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-green-700 disabled:bg-gray-300 transition-colors">
            {saving?'Saving...':editingId?'Update':'Save'}
          </button>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : list.length === 0 && !showForm ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">❤️</p>
          <p className="font-semibold text-green-900 mb-1">No loved ones added yet</p>
          <p className="text-sm text-gray-400 mb-5">Add your parent or family member to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map(p=>(
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">{p.full_name?.[0]}</div>
                  <div>
                    <p className="font-semibold text-green-900 text-sm">{p.full_name}</p>
                    <p className="text-xs text-gray-400">{p.city}{p.age ? ` · Age ${p.age}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={()=>startEdit(p)} aria-label={`Edit ${p.full_name}`} className="p-2 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={()=>handleDelete(p)} aria-label={`Remove ${p.full_name}`} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {p.address && <p className="text-xs text-gray-400">{p.address}</p>}
              {p.medical_notes && <p className="text-xs text-gray-500 mt-2 bg-amber-50 p-2 rounded-lg">📋 {p.medical_notes}</p>}
              {p.emergency_contact_name && (
                <div className="mt-3 pt-3 border-t border-red-100 flex items-center gap-2 bg-red-50 rounded-xl p-2.5">
                  <Phone size={13} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">Emergency contact</p>
                    <p className="text-xs text-red-600">
                      {p.emergency_contact_name}{p.emergency_contact_phone ? ` · ${p.emergency_contact_phone}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
