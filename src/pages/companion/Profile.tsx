import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { Camera, FileText, Bell, Star, BadgeCheck, Upload } from 'lucide-react'
import { LANGUAGES, SKILLS, AVAILABILITY_OPTIONS, COMPANION_STATUS_COLORS } from '@/lib/companion-options'
import { PUSH_SUPPORTED, getNotificationPermission, requestNotificationPermission } from '@/lib/push-notifications'

const MAX_FILE_SIZE = 5 * 1024 * 1024

export function CompanionProfile() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [companion, setCompanion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [idProofUrl, setIdProofUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [availability, setAvailability] = useState('')
  const [permission, setPermission] = useState(getNotificationPermission())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('companions').select('*').eq('id', user.id).maybeSingle()
      if (error) throw error
      setCompanion(data)
      if (data) {
        setBio(data.bio || '')
        setSkills(data.skills || [])
        setLanguages(data.languages || [])
        setAvailability(data.availability || '')
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (companion?.photo_url) {
      supabase.storage.from('companion-photos').createSignedUrl(companion.photo_url, 3600).then(({ data, error }) => {
        if (error) { console.error('Failed to load photo URL:', error); return }
        setPhotoUrl(data?.signedUrl ?? null)
      })
    }
    if (companion?.id_proof_url) {
      supabase.storage.from('companion-documents').createSignedUrl(companion.id_proof_url, 3600).then(({ data, error }) => {
        if (error) { console.error('Failed to load ID proof URL:', error); return }
        setIdProofUrl(data?.signedUrl ?? null)
      })
    }
  }, [companion?.photo_url, companion?.id_proof_url])

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > MAX_FILE_SIZE) { showToast('Profile photo must be under 5MB.', 'error'); return }
    setUploadingPhoto(true)
    try {
      const path = `${user.id}/photo-${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('companion-photos').upload(path, file)
      if (upErr) throw upErr
      const { error: updErr } = await supabase.from('companions').update({ photo_url: path }).eq('id', user.id)
      if (updErr) throw updErr
      setCompanion((prev: any) => ({ ...prev, photo_url: path }))
      showToast('Profile photo updated', 'success')
    } catch (err) {
      console.error('Failed to update photo:', err)
      showToast('Could not update photo — try again', 'error')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function saveAbout() {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.from('companions').update({ bio, skills, languages, availability: availability || null }).eq('id', user.id)
      if (error) throw error
      setCompanion((prev: any) => ({ ...prev, bio, skills, languages, availability }))
      showToast('Profile updated', 'success')
    } catch (err) {
      console.error('Failed to update profile:', err)
      showToast('Could not save changes — try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function enableNotifications() {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  if (loading) return <ProfileSkeleton />

  if (!companion) {
    return (
      <div className="text-center py-20 bg-green-50 rounded-2xl">
        <p className="text-4xl mb-3">👤</p>
        <p className="font-semibold text-green-900">Your profile hasn't been set up yet</p>
        <p className="text-sm text-gray-400 mt-1">Contact the admin to get started.</p>
      </div>
    )
  }

  const rating = companion.rating as number | null
  const isVerified = companion.is_verified as boolean | undefined

  return (
    <div className="space-y-5 animate-fade-in">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Profile hero card */}
      <div className="bg-gradient-to-br from-green-900 to-green-700 rounded-2xl overflow-hidden">
        {/* Photo + overlay */}
        <div className="flex flex-col items-center pt-8 pb-6 px-5 relative">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative group mb-4"
            aria-label="Change profile photo"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-24 h-24 rounded-full object-cover ring-4 ring-white/20" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-green-600 ring-4 ring-white/20 flex items-center justify-center text-3xl font-bold text-white">
                {companion.full_name?.[0] || '?'}
              </div>
            )}
            <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploadingPhoto
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={20} className="text-white" />
              }
            </span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="text-xs text-green-200 hover:text-white flex items-center gap-1.5 mb-4 transition-colors"
          >
            <Upload size={11} /> {uploadingPhoto ? 'Uploading...' : 'Change photo'}
          </button>

          <h1 className="font-serif text-xl text-white mb-2 text-center">{companion.full_name}</h1>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${COMPANION_STATUS_COLORS[companion.status] || 'bg-gray-100 text-gray-600'}`}>
              {companion.status ? companion.status.charAt(0).toUpperCase() + companion.status.slice(1) : 'Unknown'}
            </span>
            {isVerified && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-blue-500 text-white px-2.5 py-1 rounded-full">
                <BadgeCheck size={12} /> Verified
              </span>
            )}
            {rating != null && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-amber-400 text-amber-900 px-2.5 py-1 rounded-full">
                <Star size={11} fill="currentColor" /> {rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* City chip */}
          {companion.city && (
            <p className="text-green-200 text-xs mt-3">📍 {companion.city}</p>
          )}
        </div>
      </div>

      {/* Read-only details */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <h2 className="font-semibold text-green-900 text-sm">Your details</h2>
          <p className="text-xs text-gray-400 mt-0.5">Contact admin to update</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            ['Phone', companion.phone],
            ['Email', companion.email],
            ['Age', companion.age],
            ['Gender', companion.gender ? companion.gender.charAt(0).toUpperCase() + companion.gender.slice(1) : null],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center justify-between px-5 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm text-green-900 font-medium">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editable about you */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
        <h2 className="font-semibold text-green-900">About you</h2>

        <div>
          <label className="block text-xs font-bold text-green-900 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            placeholder="Tell families a little about yourself..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-green-900 mb-2">Languages spoken</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <label key={l} className="cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={languages.includes(l)} onChange={() => toggle(languages, setLanguages, l)} />
                <span className="text-xs font-medium px-3 py-1.5 rounded-full border-2 border-gray-200 peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors inline-block select-none">{l}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-green-900 mb-2">Skills / Services</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(s => (
              <label key={s} className="cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={skills.includes(s)} onChange={() => toggle(skills, setSkills, s)} />
                <span className="text-xs font-medium px-3 py-1.5 rounded-full border-2 border-gray-200 peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors inline-block select-none">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-green-900 mb-2">Availability</label>
          <div className="grid grid-cols-3 gap-2">
            {AVAILABILITY_OPTIONS.map(opt => (
              <label key={opt.value} className="cursor-pointer">
                <input type="radio" name="availability" className="sr-only peer" checked={availability === opt.value} onChange={() => setAvailability(opt.value)} />
                <span className="block text-center text-xs font-medium px-2 py-2.5 rounded-xl border-2 border-gray-200 peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors select-none">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={saveAbout}
          disabled={saving}
          className="w-full bg-green-800 text-white text-sm font-semibold py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-green-900 mb-3">Documents</h2>
        {idProofUrl ? (
          <a
            href={idProofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2.5 rounded-xl transition-colors"
          >
            <FileText size={15} /> View ID proof
          </a>
        ) : (
          <p className="text-sm text-gray-400">No document on file — contact admin.</p>
        )}
      </div>

      {/* Visit alerts */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-green-700" />
          <h2 className="font-semibold text-green-900">Visit alerts</h2>
        </div>
        {!PUSH_SUPPORTED ? (
          <p className="text-sm text-gray-400">Notifications aren't supported on this device.</p>
        ) : permission === 'granted' ? (
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Alerts enabled — you'll be notified of new bookings
          </div>
        ) : permission === 'denied' ? (
          <p className="text-sm text-gray-400">Notifications are blocked. Enable them in your browser settings to receive visit alerts.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Get notified when you're assigned a new visit.</p>
            <button
              onClick={enableNotifications}
              className="text-sm font-semibold bg-green-800 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
            >
              Enable visit alerts
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="bg-gray-200 rounded-2xl h-52" />
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
        {[1,2,3,4].map(i => (
          <div key={i} className="flex justify-between">
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-3 bg-gray-200 rounded w-28" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-20 bg-gray-100 rounded-xl" />
        <div className="h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}
