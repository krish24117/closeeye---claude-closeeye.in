// src/pages/companion/Visit.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Camera, X } from 'lucide-react'

const MAX_PHOTOS = 6
const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB

export function CompanionVisit() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([])
  const [photoError, setPhotoError] = useState('')
  const { register, handleSubmit, formState:{errors} } = useForm()

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    setPhotoError('')
    const valid: { file: File; url: string }[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Only image files are allowed.')
        continue
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setPhotoError('Each photo must be under 5MB.')
        continue
      }
      valid.push({ file, url: URL.createObjectURL(file) })
    }

    setPhotos(prev => {
      const combined = [...prev, ...valid]
      if (combined.length > MAX_PHOTOS) {
        setPhotoError(`You can upload up to ${MAX_PHOTOS} photos.`)
        return combined.slice(0, MAX_PHOTOS)
      }
      return combined
    })
  }

  function removePhoto(index: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].url)
      return prev.filter((_, i) => i !== index)
    })
  }

  useEffect(()=>{ load() },[user,bookingId])

  async function load() {
    if (!user || !bookingId) return
    setLoading(true)
    setLoadError(null)
    try {
      // Scope to this companion's own booking — prevents viewing/reporting on visits assigned to others
      const { data, error: bookingError } = await supabase.from('bookings').select('*,loved_ones(*)')
        .eq('id',bookingId)
        .eq('companion_id',user.id)
        .single()
      if (bookingError) throw bookingError
      setBooking(data)
    } catch (err) {
      console.error('Failed to load visit:', err)
      setLoadError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: any) {
    if (!booking || !user) return
    setSaving(true); setError('')

    const photoPaths: string[] = []
    for (const { file } of photos) {
      const path = `${booking.id}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('visit-photos').upload(path, file)
      if (uploadErr) { setError(`Failed to upload photo "${file.name}": ${uploadErr.message}`); setSaving(false); return }
      photoPaths.push(path)
    }

    const { error: err } = await supabase.from('visit_reports').insert({
      booking_id: booking.id,
      companion_id: user.id,
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
      photo_urls: photoPaths,
    })
    if (err) { setError(err.message); setSaving(false); return }
    const { error: statusErr } = await supabase.from('bookings').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',booking.id)
    if (statusErr) { setError('Report saved, but the booking status could not be updated. Please contact support.'); setSaving(false); return }
    navigate('/companion')
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>

  if (loadError) return (
    <div className="text-center py-20">
      <p className="text-red-600 font-semibold mb-2">{loadError}</p>
      <button onClick={load} className="text-sm text-green-700 font-medium underline">Retry</button>
    </div>
  )

  if (!booking) return (
    <div className="text-center py-20">
      <p className="text-green-900 font-semibold mb-2">Visit not found</p>
      <p className="text-gray-400 text-sm mb-4">This visit doesn't exist or isn't assigned to you.</p>
      <button onClick={()=>navigate('/companion')} className="text-sm text-green-700 font-medium hover:text-green-800">← Back to visits</button>
    </div>
  )

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
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
          <h2 className="font-semibold text-green-900">Visit timing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
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

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
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

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
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

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-4">
          <h2 className="font-semibold text-green-900">Photos</h2>
          <p className="text-xs text-gray-400">Add up to {MAX_PHOTOS} photos from the visit — these are shared with the family on their report.</p>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {photos.map((p, i) => (
                <div key={p.url} className="relative w-20 h-20">
                  <img src={p.url} alt={`Visit photo ${i + 1}`} className="w-20 h-20 object-cover rounded-xl border border-gray-100" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-red-600 shadow-sm"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            <label className="inline-flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-500 cursor-pointer hover:border-green-300 hover:text-green-700 transition-colors">
              <Camera size={16} />
              Add photos
              <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoChange} className="sr-only" />
            </label>
          )}
          {photoError && <p className="text-red-500 text-xs">{photoError}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 space-y-5">
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
