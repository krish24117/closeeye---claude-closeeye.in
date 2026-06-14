// src/pages/companion/Visit.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export function CompanionVisit() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<any>(null)
  const [companion, setCompanion] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState:{errors} } = useForm()

  useEffect(()=>{
    if (!user || !bookingId) return
    supabase.from('companions').select('id').eq('user_id',user.id).single()
      .then(({data:c})=>{
        setCompanion(c)
        supabase.from('bookings').select('*,loved_ones(*)').eq('id',bookingId).single()
          .then(({data})=>setBooking(data))
      })
  },[user,bookingId])

  async function onSubmit(data: any) {
    if (!booking || !companion) return
    setSaving(true); setError('')
    const { error: err } = await supabase.from('visit_reports').insert({
      booking_id: booking.id,
      companion_id: companion.id,
      loved_one_id: booking.loved_one_id,
      mood_score: parseInt(data.mood_score),
      health_score: parseInt(data.health_score),
      home_safety_score: parseInt(data.home_safety_score),
      mood_notes: data.mood_notes,
      health_notes: data.health_notes,
      medication_taken: data.medication_taken === 'true',
      medication_notes: data.medication_notes,
      home_safety_notes: data.home_safety_notes,
      activity_during_visit: data.activity_during_visit,
      family_message: data.family_message,
      follow_up_needed: data.follow_up_needed === 'true',
      follow_up_notes: data.follow_up_notes,
      visit_started_at: data.visit_started_at || null,
      visit_ended_at: data.visit_ended_at || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    await supabase.from('bookings').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',booking.id)
    navigate('/companion')
  }

  if (!booking) return <div className="text-center py-20 text-gray-400">Loading...</div>

  const ScoreField = ({ name, label }: {name:string,label:string}) => (
    <div>
      <label className="block text-sm font-semibold text-green-900 mb-2">{label} (1–5) *</label>
      <div className="flex gap-2">
        {[1,2,3,4,5].map(n=>(
          <label key={n} className="flex-1">
            <input type="radio" value={n} {...register(name,{required:true})} className="sr-only peer" />
            <div className="text-center py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold cursor-pointer peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 hover:border-green-300 transition-colors">{n}</div>
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <button onClick={()=>navigate('/companion')} className="text-sm text-gray-400 hover:text-green-800 mb-3">← Back to visits</button>
        <h1 className="font-serif text-2xl text-green-900">Visit Report</h1>
        <p className="text-gray-400 text-sm">For: {booking.loved_ones?.full_name} · {booking.loved_ones?.city}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Visit timing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">Visit started</label>
              <input type="datetime-local" {...register('visit_started_at')} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">Visit ended</label>
              <input type="datetime-local" {...register('visit_ended_at')} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Wellbeing scores</h2>
          <ScoreField name="mood_score" label="Mood & emotional state" />
          {errors.mood_score && <p className="text-red-500 text-xs">Required</p>}
          <ScoreField name="health_score" label="Physical health" />
          <ScoreField name="home_safety_score" label="Home & safety" />
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Mood notes</label>
            <textarea {...register('mood_notes')} rows={2} placeholder="How was their energy, mood, spirits?" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Health notes</label>
            <textarea {...register('health_notes')} rows={2} placeholder="Any complaints, symptoms, concerns?" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Medication</h2>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-2">Was medication taken? *</label>
            <div className="flex gap-3">
              {[['true','Yes ✓'],['false','No ✗']].map(([v,l])=>(
                <label key={v} className="flex-1">
                  <input type="radio" value={v} {...register('medication_taken',{required:true})} className="sr-only peer" />
                  <div className="text-center py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold cursor-pointer peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors">{l}</div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Medication notes</label>
            <input {...register('medication_notes')} placeholder="Which medications, any concerns?" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Activity & home</h2>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">What did you do during the visit?</label>
            <textarea {...register('activity_during_visit')} rows={2} placeholder="Had tea, watched TV together, helped with lunch..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Home & safety notes</label>
            <textarea {...register('home_safety_notes')} rows={2} placeholder="Cleanliness, any hazards, appliances working?" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Message for the family</h2>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Warm message to share *</label>
            <textarea {...register('family_message',{required:true})} rows={3} placeholder="Had a lovely visit with aunty. She's in good spirits and..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none" />
            {errors.family_message && <p className="text-red-500 text-xs mt-1">This is required — the family sees this first</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-2">Follow-up needed?</label>
            <div className="flex gap-3">
              {[['false','No'],['true','Yes']].map(([v,l])=>(
                <label key={v} className="flex-1">
                  <input type="radio" value={v} {...register('follow_up_needed')} defaultChecked={v==='false'} className="sr-only peer" />
                  <div className="text-center py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold cursor-pointer peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors">{l}</div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Follow-up notes</label>
            <input {...register('follow_up_notes')} placeholder="If yes, what needs attention?" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600" />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-green-800 text-white font-semibold py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-300 transition-colors">
          {saving ? 'Submitting report...' : 'Submit Visit Report'}
        </button>
      </form>
    </div>
  )
}
