// src/pages/dashboard/LovedOnes.tsx
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, X } from 'lucide-react'

export function DashboardLovedOnes() {
  const { user } = useAuth()
  const [list, setList] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  useEffect(()=>{ load() },[])

  async function load() {
    const { data } = await supabase.from('loved_ones').select('*').order('created_at',{ascending:false})
    setList(data||[])
  }

  async function onSubmit(data: any) {
    if (!user) return
    setSaving(true)
    await supabase.from('loved_ones').insert({ ...data, family_user_id: user.id })
    await load()
    reset(); setShowForm(false); setSaving(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-green-900">Loved Ones</h1>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-2 bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
          {showForm ? <><X size={14}/>Cancel</> : <><Plus size={14}/>Add person</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-green-900">Add a loved one</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[['full_name','Full name','e.g. Sunita Reddy',true],['age','Age','65',false],['phone','Phone number','+91 98765 43210',false],['city','City','Hyderabad',true],['address','Home address','EIPL Rivera A-405...',true]].map(([n,l,p,req])=>(
              <div key={n as string} className={n==='address'?'sm:col-span-2':''}>
                <label className="block text-xs font-semibold text-green-900 mb-1">{l as string}{req?' *':''}</label>
                <input {...register(n as string,{required:!!req})} placeholder={p as string} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-green-900 mb-1">Medical notes</label>
              <textarea {...register('medical_notes')} rows={2} placeholder="Diabetes, blood pressure medication..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="bg-green-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-green-700 disabled:bg-gray-300 transition-colors">
            {saving?'Saving...':'Save'}
          </button>
        </form>
      )}

      {list.length === 0 && !showForm ? (
        <div className="text-center py-20 bg-green-50 rounded-2xl">
          <p className="text-4xl mb-3">❤️</p>
          <p className="font-semibold text-green-900 mb-1">No loved ones added yet</p>
          <p className="text-sm text-gray-400 mb-5">Add your parent or family member to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map(p=>(
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">{p.full_name?.[0]}</div>
                <div>
                  <p className="font-semibold text-green-900 text-sm">{p.full_name}</p>
                  <p className="text-xs text-gray-400">{p.city}{p.age ? ` · Age ${p.age}` : ''}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">{p.address}</p>
              {p.medical_notes && <p className="text-xs text-gray-500 mt-1 bg-amber-50 p-2 rounded-lg">📋 {p.medical_notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
