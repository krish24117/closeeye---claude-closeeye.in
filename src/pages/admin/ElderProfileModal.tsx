import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Index signature lets these satisfy RowEditor's `Record<string, string>` constraint
interface Medication { [k: string]: string; name: string; dosage: string; timing: string }
interface EmergencyContact { [k: string]: string; name: string; relation: string; phone: string; priority: string }
interface SpecialDate { [k: string]: string; occasion: string; date: string }

interface LovedOneOption {
  id: string
  full_name: string | null
  city: string | null
  family_user_id: string | null
}

interface Props {
  elder?: any | null
  lovedOnes: LovedOneOption[]
  onClose: () => void
  onSaved: (row: any) => void
}

// Normalise a jsonb array column into typed rows (rows may be missing keys)
function asRows<T>(value: unknown, blank: T): T[] {
  if (!Array.isArray(value) || value.length === 0) return []
  return value.map(v => ({ ...blank, ...(v as object) }))
}

const BLANK_MED: Medication = { name: '', dosage: '', timing: '' }
const BLANK_CONTACT: EmergencyContact = { name: '', relation: '', phone: '', priority: '' }
const BLANK_DATE: SpecialDate = { occasion: '', date: '' }

export function ElderProfileModal({ elder, lovedOnes, onClose, onSaved }: Props) {
  const isEdit = !!elder?.id

  const [form, setForm] = useState({
    name:                   elder?.name ?? '',
    age:                    elder?.age != null ? String(elder.age) : '',
    address:                elder?.address ?? '',
    city:                   elder?.city ?? '',
    nearest_hospital:       elder?.nearest_hospital ?? '',
    medical_conditions:     elder?.medical_conditions ?? '',
    allergies:              elder?.allergies ?? '',
    doctor_name:            elder?.doctor_name ?? '',
    doctor_phone:           elder?.doctor_phone ?? '',
    food_preferences:       elder?.food_preferences ?? '',
    conversation_interests: elder?.conversation_interests ?? '',
    things_to_avoid:        elder?.things_to_avoid ?? '',
    daily_routine:          elder?.daily_routine ?? '',
    pinned_note:            elder?.pinned_note ?? '',
    loved_one_id:           elder?.loved_one_id ?? '',
  })
  const [medications, setMedications]   = useState<Medication[]>(asRows(elder?.current_medications, BLANK_MED))
  const [contacts, setContacts]         = useState<EmergencyContact[]>(asRows(elder?.emergency_contacts, BLANK_CONTACT))
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>(asRows(elder?.special_dates, BLANK_DATE))

  const [photo, setPhoto]               = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstFieldRef.current?.focus()
    document.body.style.overflow = 'hidden'
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  // Resolve a signed URL for an existing photo
  useEffect(() => {
    if (!elder?.photo_url) return
    supabase.storage.from('elder-photos').createSignedUrl(elder.photo_url, 3600).then(({ data }) => {
      setExistingPhotoUrl(data?.signedUrl ?? null)
    })
  }, [elder?.photo_url])

  function set<K extends keyof typeof form>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) { setError('Photo must be under 5MB.'); return }
    setError('')
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim())    { setError('Full name is required.'); return }
    if (!form.age.trim())     { setError('Age is required.'); return }
    if (!form.address.trim()) { setError('Address is required.'); return }
    if (!form.city.trim())    { setError('City is required.'); return }

    setSaving(true)
    setError('')

    const id = elder?.id ?? crypto.randomUUID()

    // Upload photo if a new one was picked
    let photo_url: string | null = elder?.photo_url ?? null
    if (photo) {
      const path = `${id}/photo-${Date.now()}-${photo.name}`
      const { error: upErr } = await supabase.storage.from('elder-photos').upload(path, photo, { upsert: true })
      if (upErr) { setError(`Failed to upload photo: ${upErr.message}`); setSaving(false); return }
      photo_url = path
    }

    const payload = {
      name:                   form.name.trim(),
      age:                    parseInt(form.age, 10),
      address:                form.address.trim(),
      city:                   form.city.trim(),
      nearest_hospital:       form.nearest_hospital.trim() || null,
      medical_conditions:     form.medical_conditions.trim() || null,
      allergies:              form.allergies.trim() || null,
      doctor_name:            form.doctor_name.trim() || null,
      doctor_phone:           form.doctor_phone.trim() || null,
      food_preferences:       form.food_preferences.trim() || null,
      conversation_interests: form.conversation_interests.trim() || null,
      things_to_avoid:        form.things_to_avoid.trim() || null,
      daily_routine:          form.daily_routine.trim() || null,
      pinned_note:            form.pinned_note.trim() || null,
      loved_one_id:           form.loved_one_id || null,
      photo_url,
      current_medications: medications.filter(m => m.name.trim()),
      emergency_contacts:  contacts.filter(c => c.name.trim() || c.phone.trim())
                                   .map(c => ({
                                     name: c.name, relation: c.relation, phone: c.phone,
                                     priority: c.priority ? Number(c.priority) : null,
                                   })),
      special_dates:       specialDates.filter(d => d.occasion.trim() || d.date.trim()),
    }

    if (isEdit) {
      const { data, error: updErr } = await supabase.from('elder_profiles')
        .update(payload).eq('id', id).select('*, loved_ones(id, full_name, city, family_user_id)').single()
      if (updErr) { setError(updErr.message); setSaving(false); return }
      onSaved(data)
    } else {
      const { data, error: insErr } = await supabase.from('elder_profiles')
        .insert({ id, ...payload }).select('*, loved_ones(id, full_name, city, family_user_id)').single()
      if (insErr) {
        setError(insErr.message.includes('duplicate') || insErr.message.includes('unique')
          ? 'That family member already has an elder profile. Edit the existing one instead.'
          : insErr.message)
        setSaving(false); return
      }
      onSaved(data)
    }
  }

  const photoSrc = photoPreview ?? existingPhotoUrl

  return (
    <>
      <div className="adm-overlay" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="elder-modal-title"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 640,
          maxWidth: '92vw',
          background: '#fff',
          borderRadius: 'var(--radius-card)',
          zIndex: 90,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          maxHeight: '85vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          background: '#fff',
          borderRadius: 'var(--radius-card) var(--radius-card) 0 0',
          zIndex: 10,
        }}>
          <h2 id="elder-modal-title" className="adm-page-h" style={{ fontSize: 18, margin: 0 }}>
            {isEdit ? 'Edit Elder Profile' : 'Add New Elder'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--gray-mid)',
              padding: 4,
              fontSize: 22,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
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

          {/* Identity */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Field label="Full name *">
                <input
                  ref={firstFieldRef}
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="adm-input"
                />
              </Field>
              <Field label="Age *">
                <input
                  type="number"
                  min={1}
                  max={120}
                  required
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                  className="adm-input"
                />
              </Field>
              <Field label="Address *">
                <input
                  required
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className="adm-input"
                />
              </Field>
              <Field label="City *">
                <input
                  required
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="e.g. Hyderabad"
                  className="adm-input"
                />
              </Field>
            </div>

            <Field label="Photo (optional)">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {photoSrc && (
                  <img
                    src={photoSrc}
                    alt="Elder photo preview"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid var(--line)',
                    }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ fontSize: 12, color: 'var(--gray-mid)' }}
                />
              </div>
            </Field>

            <Field label="Link to registered family member (optional)">
              <select
                value={form.loved_one_id}
                onChange={e => set('loved_one_id', e.target.value)}
                className="adm-input"
                style={{ background: '#fff' }}
              >
                <option value="">Not linked yet</option>
                {lovedOnes.map(lo => (
                  <option key={lo.id} value={lo.id}>
                    {lo.full_name || 'Unnamed'}{lo.city ? ` · ${lo.city}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          {/* Pinned note */}
          <ModalSection title="Pinned note" hint="Shown prominently to the companion before every visit">
            <textarea
              value={form.pinned_note}
              onChange={e => set('pinned_note', e.target.value)}
              rows={2}
              placeholder="e.g. Hard of hearing on the left — sit on her right side."
              className="adm-textarea"
              style={{ resize: 'none' }}
            />
          </ModalSection>

          {/* Medical */}
          <ModalSection title="Medical">
            <Field label="Nearest hospital (name + address)">
              <input
                value={form.nearest_hospital}
                onChange={e => set('nearest_hospital', e.target.value)}
                className="adm-input"
              />
            </Field>
            <Field label="Medical conditions">
              <textarea
                value={form.medical_conditions}
                onChange={e => set('medical_conditions', e.target.value)}
                rows={2}
                className="adm-textarea"
                style={{ resize: 'none' }}
              />
            </Field>
            <Field label="Allergies">
              <input
                value={form.allergies}
                onChange={e => set('allergies', e.target.value)}
                className="adm-input"
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <Field label="Doctor name">
                <input
                  value={form.doctor_name}
                  onChange={e => set('doctor_name', e.target.value)}
                  className="adm-input"
                />
              </Field>
              <Field label="Doctor phone">
                <input
                  value={form.doctor_phone}
                  onChange={e => set('doctor_phone', e.target.value)}
                  className="adm-input"
                />
              </Field>
            </div>
          </ModalSection>

          {/* Medications (dynamic rows) */}
          <ModalSection title="Current medications">
            <RowEditor
              rows={medications}
              onChange={setMedications}
              blank={BLANK_MED}
              addLabel="Add medication"
              columns={[
                { key: 'name',   placeholder: 'Medicine name', flex: 2 },
                { key: 'dosage', placeholder: 'Dosage',        flex: 1 },
                { key: 'timing', placeholder: 'Timing',        flex: 1 },
              ]}
            />
          </ModalSection>

          {/* Emergency contacts (dynamic rows) */}
          <ModalSection title="Emergency contacts">
            <RowEditor
              rows={contacts}
              onChange={setContacts}
              blank={BLANK_CONTACT}
              addLabel="Add contact"
              columns={[
                { key: 'name',     placeholder: 'Name',     flex: 2 },
                { key: 'relation', placeholder: 'Relation', flex: 1 },
                { key: 'phone',    placeholder: 'Phone',    flex: 1.5 },
                { key: 'priority', placeholder: 'Priority', flex: 0.7, type: 'number' },
              ]}
            />
          </ModalSection>

          {/* Lifestyle */}
          <ModalSection title="Lifestyle & preferences">
            <Field label="Food preferences">
              <input
                value={form.food_preferences}
                onChange={e => set('food_preferences', e.target.value)}
                className="adm-input"
              />
            </Field>
            <Field label="Conversation interests">
              <input
                value={form.conversation_interests}
                onChange={e => set('conversation_interests', e.target.value)}
                className="adm-input"
              />
            </Field>
            <Field label="Things to avoid">
              <textarea
                value={form.things_to_avoid}
                onChange={e => set('things_to_avoid', e.target.value)}
                rows={2}
                className="adm-textarea"
                style={{ resize: 'none' }}
              />
            </Field>
            <Field label="Daily routine / schedule">
              <textarea
                value={form.daily_routine}
                onChange={e => set('daily_routine', e.target.value)}
                rows={2}
                className="adm-textarea"
                style={{ resize: 'none' }}
              />
            </Field>
          </ModalSection>

          {/* Special dates (dynamic rows) */}
          <ModalSection title="Special dates">
            <RowEditor
              rows={specialDates}
              onChange={setSpecialDates}
              blank={BLANK_DATE}
              addLabel="Add date"
              columns={[
                { key: 'occasion', placeholder: 'Occasion (e.g. Birthday)', flex: 2 },
                { key: 'date',     placeholder: 'Date',                      flex: 1, type: 'date' },
              ]}
            />
          </ModalSection>

          {/* Footer actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            paddingTop: 4,
            position: 'sticky',
            bottom: 0,
            background: '#fff',
            paddingBottom: 4,
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--gray-mid)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="adm-btn adm-btn-primary"
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add Elder'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ModalSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      borderTop: '1px solid var(--line)',
      paddingTop: 20,
    }}>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)', margin: 0 }}>{title}</h3>
        {hint && <p style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 3, marginBottom: 0 }}>{hint}</p>}
      </div>
      {children}
    </section>
  )
}

// Generic add/remove row editor for jsonb-array fields
function RowEditor<T extends Record<string, string>>({
  rows, onChange, blank, addLabel, columns,
}: {
  rows: T[]
  onChange: (rows: T[]) => void
  blank: T
  addLabel: string
  columns: { key: keyof T; placeholder: string; flex: number; type?: string }[]
}) {
  function update(i: number, key: keyof T, value: string) {
    onChange(rows.map((r, j) => j === i ? { ...r, [key]: value } : r))
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {columns.map(col => (
            <input
              key={String(col.key)}
              type={col.type || 'text'}
              value={row[col.key] as string}
              onChange={e => update(i, col.key, e.target.value)}
              placeholder={col.placeholder}
              className="adm-input"
              style={{ flex: col.flex, minWidth: 0 }}
            />
          ))}
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            aria-label="Remove row"
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--gray-mid)',
              padding: 4,
              fontSize: 16,
              lineHeight: 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--clay)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--gray-mid)')}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { ...blank }])}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--forest)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {addLabel}
      </button>
    </div>
  )
}
