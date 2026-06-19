import { useEffect, useRef, useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="elder-modal-title"
        className="bg-white rounded-2xl max-w-2xl w-full my-8 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 id="elder-modal-title" className="font-serif text-xl text-green-900">
            {isEdit ? 'Edit Elder Profile' : 'Add New Elder'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-green-800 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{error}</div>}

          {/* ── Identity ─────────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name *">
                <input ref={firstFieldRef} required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Age *">
                <input type="number" min={1} max={120} required value={form.age} onChange={e => set('age', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Address *">
                <input required value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
              </Field>
              <Field label="City *">
                <input required value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Hyderabad" className={inputCls} />
              </Field>
            </div>

            <Field label="Photo (optional)">
              <div className="flex items-center gap-3">
                {photoSrc && <img src={photoSrc} alt="" className="w-14 h-14 rounded-full object-cover border border-gray-100" />}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-xs text-gray-500" />
              </div>
            </Field>

            <Field label="Link to registered family member (optional)">
              <select value={form.loved_one_id} onChange={e => set('loved_one_id', e.target.value)} className={`${inputCls} bg-white`}>
                <option value="">Not linked yet</option>
                {lovedOnes.map(lo => (
                  <option key={lo.id} value={lo.id}>
                    {lo.full_name || 'Unnamed'}{lo.city ? ` · ${lo.city}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          {/* ── Pinned note ──────────────────────────────────────────── */}
          <Section title="Pinned note" hint="Shown prominently to the companion before every visit">
            <textarea value={form.pinned_note} onChange={e => set('pinned_note', e.target.value)} rows={2}
              placeholder="e.g. Hard of hearing on the left — sit on her right side."
              className={`${inputCls} resize-none`} />
          </Section>

          {/* ── Medical ──────────────────────────────────────────────── */}
          <Section title="Medical">
            <Field label="Nearest hospital (name + address)">
              <input value={form.nearest_hospital} onChange={e => set('nearest_hospital', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Medical conditions">
              <textarea value={form.medical_conditions} onChange={e => set('medical_conditions', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Allergies">
              <input value={form.allergies} onChange={e => set('allergies', e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Doctor name">
                <input value={form.doctor_name} onChange={e => set('doctor_name', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Doctor phone">
                <input value={form.doctor_phone} onChange={e => set('doctor_phone', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* ── Medications (dynamic rows) ───────────────────────────── */}
          <Section title="Current medications">
            <RowEditor
              rows={medications}
              onChange={setMedications}
              blank={BLANK_MED}
              addLabel="Add medication"
              columns={[
                { key: 'name',   placeholder: 'Medicine name', flex: 'flex-[2]' },
                { key: 'dosage', placeholder: 'Dosage',        flex: 'flex-1' },
                { key: 'timing', placeholder: 'Timing',        flex: 'flex-1' },
              ]}
            />
          </Section>

          {/* ── Emergency contacts (dynamic rows) ────────────────────── */}
          <Section title="Emergency contacts">
            <RowEditor
              rows={contacts}
              onChange={setContacts}
              blank={BLANK_CONTACT}
              addLabel="Add contact"
              columns={[
                { key: 'name',     placeholder: 'Name',          flex: 'flex-[2]' },
                { key: 'relation', placeholder: 'Relation',      flex: 'flex-1' },
                { key: 'phone',    placeholder: 'Phone',         flex: 'flex-[1.5]' },
                { key: 'priority', placeholder: 'Priority',      flex: 'flex-[0.7]', type: 'number' },
              ]}
            />
          </Section>

          {/* ── Lifestyle ────────────────────────────────────────────── */}
          <Section title="Lifestyle & preferences">
            <Field label="Food preferences">
              <input value={form.food_preferences} onChange={e => set('food_preferences', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Conversation interests">
              <input value={form.conversation_interests} onChange={e => set('conversation_interests', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Things to avoid">
              <textarea value={form.things_to_avoid} onChange={e => set('things_to_avoid', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </Field>
            <Field label="Daily routine / schedule">
              <textarea value={form.daily_routine} onChange={e => set('daily_routine', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </Field>
          </Section>

          {/* ── Special dates (dynamic rows) ─────────────────────────── */}
          <Section title="Special dates">
            <RowEditor
              rows={specialDates}
              onChange={setSpecialDates}
              blank={BLANK_DATE}
              addLabel="Add date"
              columns={[
                { key: 'occasion', placeholder: 'Occasion (e.g. Birthday)', flex: 'flex-[2]' },
                { key: 'date',     placeholder: 'Date',                      flex: 'flex-1', type: 'date' },
              ]}
            />
          </Section>

          <div className="flex items-center justify-end gap-3 pt-2 sticky bottom-0 bg-white pb-1">
            <button type="button" onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-green-800 px-4 py-2.5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="text-sm font-semibold bg-green-800 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add Elder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-600'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-green-900 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-gray-100 pt-5">
      <div>
        <h3 className="text-sm font-bold text-green-900">{title}</h3>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
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
  columns: { key: keyof T; placeholder: string; flex: string; type?: string }[]
}) {
  function update(i: number, key: keyof T, value: string) {
    onChange(rows.map((r, j) => j === i ? { ...r, [key]: value } : r))
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          {columns.map(col => (
            <input
              key={String(col.key)}
              type={col.type || 'text'}
              value={row[col.key] as string}
              onChange={e => update(i, col.key, e.target.value)}
              placeholder={col.placeholder}
              className={`${col.flex} min-w-0 border-2 border-gray-200 rounded-xl px-2.5 py-2 text-sm focus:outline-none focus:border-green-600`}
            />
          ))}
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1" aria-label="Remove row">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { ...blank }])}
        className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-900 transition-colors">
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  )
}
