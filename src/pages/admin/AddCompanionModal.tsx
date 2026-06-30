import { useEffect, useRef, useState } from 'react'
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--forest)',
    marginBottom: 6,
  }

  const pillBase: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 999,
    border: '2px solid var(--line)',
    display: 'inline-block',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
  }

  const pillActive: React.CSSProperties = {
    borderColor: 'var(--forest)',
    background: 'rgba(14,42,31,0.07)',
    color: 'var(--forest)',
  }

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-companion-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 560,
          maxWidth: '92vw',
          background: '#fff',
          borderRadius: 'var(--radius-card)',
          padding: 24,
          zIndex: 90,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          maxHeight: '85vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 14,
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: -24,
          background: '#fff',
          marginTop: -24,
          paddingTop: 20,
          marginLeft: -24,
          marginRight: -24,
          paddingLeft: 24,
          paddingRight: 24,
          zIndex: 1,
        }}>
          <h2 id="add-companion-title" className="adm-page-h" style={{ fontSize: 18, margin: 0 }}>Add Companion</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-dark)', padding: 4, fontSize: 22, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 13,
              borderRadius: 'var(--radius-card)',
              padding: '10px 14px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Full name *</label>
              <input
                ref={firstFieldRef}
                required
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="adm-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone number *</label>
              <input
                required
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91..."
                className="adm-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="adm-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Age</label>
              <input
                type="number"
                min={18}
                max={100}
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                className="adm-input"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="adm-input"
                style={{ width: '100%' }}
              >
                <option value="">Select...</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>City / Area in Hyderabad *</label>
              <input
                required
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="e.g. Banjara Hills"
                className="adm-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Languages spoken</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LANGUAGES.map(l => (
                <label key={l} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    checked={languages.includes(l)}
                    onChange={() => toggle(languages, setLanguages, l)}
                  />
                  <span style={{ ...pillBase, ...(languages.includes(l) ? pillActive : {}) }}>{l}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Skills / Services</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SKILLS.map(s => (
                <label key={s} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    checked={skills.includes(s)}
                    onChange={() => toggle(skills, setSkills, s)}
                  />
                  <span style={{ ...pillBase, ...(skills.includes(s) ? pillActive : {}) }}>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Availability</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {AVAILABILITY_OPTIONS.map(opt => (
                <label key={opt.value} style={{ flex: 1, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="availability"
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                    checked={form.availability === opt.value}
                    onChange={() => setForm(f => ({ ...f, availability: opt.value }))}
                  />
                  <span style={{
                    display: 'block',
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-card)',
                    border: '2px solid',
                    borderColor: form.availability === opt.value ? 'var(--forest)' : 'var(--line)',
                    background: form.availability === opt.value ? 'rgba(14,42,31,0.07)' : 'transparent',
                    color: form.availability === opt.value ? 'var(--forest)' : 'var(--muted)',
                    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                  }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>ID proof (Aadhaar/PAN)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleIdProofChange}
                style={{ width: '100%', fontSize: 12, color: 'var(--gray-mid)' }}
              />
              {idProof && (
                <p style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {idProof.name}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Profile photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ width: '100%', fontSize: 12, color: 'var(--gray-mid)' }}
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Profile photo preview"
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', marginTop: 8 }}
                />
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="adm-input"
              style={{ width: '100%' }}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-mid)', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="adm-btn adm-btn-primary"
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              {saving ? 'Saving...' : 'Add Companion'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
