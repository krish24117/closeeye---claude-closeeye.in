import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { Camera, FileText, Bell } from 'lucide-react'
import { LANGUAGES, SKILLS, AVAILABILITY_OPTIONS, COMPANION_STATUS_COLORS } from '@/lib/companion-options'
import { PUSH_SUPPORTED, getNotificationPermission, requestNotificationPermission } from '@/lib/push-notifications'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB, matches storage bucket limit

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

  if (loading) return <div className="text-center py-20 text-gray-400">Loading your profile...</div>

  if (!companion) {
    return (
      <div className="text-center py-20 bg-green-50 rounded-2xl">
        <p className="text-4xl mb-3">👤</p>
        <p className="font-semibold text-green-900">Your companion profile hasn't been set up yet</p>
        <p className="text-sm text-gray-400 mt-1">Contact the admin to get set up.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-serif text-2xl text-green-900">My Profile</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="relative w-16 h-16 rounded-full flex-shrink-0 group"
          aria-label="Change profile photo"
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-xl font-bold text-green-700">
              {companion.full_name?.[0] || '?'}
            </div>
          )}
          <span className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Camera size={18} className="text-white" />
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        <div className="min-w-0">
          <p className="font-semibold text-green-900 truncate">{companion.full_name}</p>
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${COMPANION_STATUS_COLORS[companion.status] || 'bg-gray-50 text-gray-600'}`}>
            {companion.status ? companion.status.charAt(0).toUpperCase() + companion.status.slice(1) : 'Unknown'}
          </span>
        </div>
      </div>

      {/* Read-only info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="font-semibold text-green-900">Your details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Phone</p><p className="text-green-900">{companion.phone || '—'}</p></div>
          <div><p className="text-xs text-gray-400">Email</p><p className="text-green-900">{companion.email || '—'}</p></div>
          <div><p className="text-xs text-gray-400">Age</p><p className="text-green-900">{companion.age || '—'}</p></div>
          <div><p className="text-xs text-gray-400">Gender</p><p className="text-green-900 capitalize">{companion.gender || '—'}</p></div>
          <div className="col-span-2"><p className="text-xs text-gray-400">City / Area</p><p className="text-green-900">{companion.city || '—'}</p></div>
        </div>
        <p className="text-xs text-gray-400">To update these details, contact the admin.</p>
      </div>

      {/* Editable about you */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-semibold text-green-900">About you</h2>
        <div>
          <label className="block text-xs font-semibold text-green-900 mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
            placeholder="Tell families a little about yourself..."
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-green-900 mb-2">Languages spoken</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <label key={l} className="cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={languages.includes(l)} onChange={() => toggle(languages, setLanguages, l)} />
                <span className="text-xs font-medium px-3 py-1.5 rounded-full border-2 border-gray-200 peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors inline-block">{l}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-green-900 mb-2">Skills / Services</label>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(s => (
              <label key={s} className="cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={skills.includes(s)} onChange={() => toggle(skills, setSkills, s)} />
                <span className="text-xs font-medium px-3 py-1.5 rounded-full border-2 border-gray-200 peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors inline-block">{s}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-green-900 mb-2">Availability</label>
          <div className="flex gap-2">
            {AVAILABILITY_OPTIONS.map(opt => (
              <label key={opt.value} className="flex-1 cursor-pointer">
                <input type="radio" name="availability" className="sr-only peer" checked={availability === opt.value} onChange={() => setAvailability(opt.value)} />
                <span className="block text-center text-xs font-medium px-3 py-2 rounded-xl border-2 border-gray-200 peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={saveAbout}
          disabled={saving}
          className="w-full bg-green-800 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="font-semibold text-green-900">Documents</h2>
        {idProofUrl ? (
          <a href={idProofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 bg-green-50 px-3 py-2 rounded-xl">
            <FileText size={14} /> View ID proof
          </a>
        ) : (
          <p className="text-sm text-gray-400">No document on file — contact admin.</p>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h2 className="font-semibold text-green-900 flex items-center gap-2"><Bell size={16} /> Visit alerts</h2>
        {!PUSH_SUPPORTED ? (
          <p className="text-sm text-gray-400">Notifications aren't supported on this device.</p>
        ) : permission === 'granted' ? (
          <p className="text-sm text-green-600 font-medium">✓ Visit alerts are enabled</p>
        ) : permission === 'denied' ? (
          <p className="text-sm text-gray-400">Notifications are blocked. Enable them in your browser settings to get visit alerts.</p>
        ) : (
          <button onClick={enableNotifications} className="text-sm font-semibold bg-green-800 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors">
            Enable visit alerts
          </button>
        )}
      </div>
    </div>
  )
}
