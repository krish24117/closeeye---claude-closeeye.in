import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LANGUAGES, SKILLS, AVAILABILITY_OPTIONS } from '@/lib/companion-options'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB, matches storage bucket limit

export function AddCompanionModal({ onClose, onAdded }: { onClose: () => void, onAdded: (row: any) => void }) {
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', age: '', gender: '', city: '',
    availability: '', status: 'pending',
  })
  const [languages, setLanguages] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [idProof, setIdProof] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
    document.body.style.overflow = 'hidden'
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { setError('Profile photo must be under 5MB.'); return }
    setError('')
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleIdProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { setError('ID proof must be under 5MB.'); return }
    setError('')
    setIdProof(file)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone.trim() || !form.city.trim()) {
      setError('Full name, phone number, and city/area are required.')
      return
    }
    setSaving(true)
    setError('')

    const id = crypto.randomUUID()

    let photo_url: string | null = null
    if (photo) {
      const path = `${id}/photo-${Date.now()}-${photo.name}`
      const { error: upErr } = await supabase.storage.from('companion-photos').upload(path, photo)
      if (upErr) { setError(`Failed to upload profile photo: ${upErr.message}`); setSaving(false); return }
      photo_url = path
    }

    let id_proof_url: string | null = null
    if (idProof) {
      const path = `${id}/id-proof-${Date.now()}-${idProof.name}`
      const { error: upErr } = await supabase.storage.from('companion-documents').upload(path, idProof)
      if (upErr) { setError(`Failed to upload ID proof: ${upErr.message}`); setSaving(false); return }
      id_proof_url = path
    }

    const { data, error: insertErr } = await supabase.from('companions').insert({
      id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      age: form.age ? parseInt(form.age, 10) : null,
      gender: form.gender || null,
      city: form.city.trim(),
      languages,
      skills,
      availability: form.availability || null,
      id_proof_url,
      photo_url,
      status: form.status,
    }).select().single()

    if (insertErr) { setError(insertErr.message); setSaving(false); return }
    onAdded(data)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-companion-title"
        className="bg-white rounded-2xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 id="add-companion-title" className="font-serif text-xl text-green-900">Add Companion</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-green-800 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">Full name *</label>
              <input
                ref={firstFieldRef}
                required
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">Phone number *</label>
              <input
                required
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91..."
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">Age</label>
              <input
                type="number"
                min={18}
                max={100}
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white"
              >
                <option value="">Select...</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">City / Area in Hyderabad *</label>
              <input
                required
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Banjara Hills"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
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
                  <input type="radio" name="availability" className="sr-only peer" checked={form.availability === opt.value} onChange={() => setForm(f => ({ ...f, availability: opt.value }))} />
                  <span className="block text-center text-xs font-medium px-3 py-2 rounded-xl border-2 border-gray-200 peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-700 transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">ID proof (Aadhaar/PAN)</label>
              <input type="file" accept="image/*,application/pdf" onChange={handleIdProofChange} className="w-full text-xs text-gray-500" />
              {idProof && <p className="text-xs text-gray-400 mt-1 truncate">{idProof.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-900 mb-1.5">Profile photo</label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full text-xs text-gray-500" />
              {photoPreview && <img src={photoPreview} alt="Profile photo preview" className="w-12 h-12 rounded-full object-cover mt-2" />}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-green-900 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600 bg-white"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-green-800 px-4 py-2.5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="text-sm font-semibold bg-green-800 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Add Companion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
