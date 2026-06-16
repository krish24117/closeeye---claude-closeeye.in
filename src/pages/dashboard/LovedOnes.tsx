import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useJsApiLoader } from '@react-google-maps/api'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/Toast'
import { Plus, X, Pencil, Trash2, Phone, MapPin, Stethoscope, AlertTriangle, User, Navigation } from 'lucide-react'
import { Spinner } from '@/components/ui/Skeleton'
import { MAPS_LIBRARIES, MAPS_SCRIPT_ID, MAPS_KEY } from '@/components/ui/LiveMap'

// ── Form field helper ─────────────────────────────────────────────────────────

function Field({
  label, placeholder, required, error, span, textarea,
  ...rest
}: {
  label: string
  placeholder?: string
  required?: boolean
  error?: string
  span?: boolean
  textarea?: boolean
} & React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>) {
  const base = `w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors ${
    error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-green-600'
  }`
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-green-900 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {textarea ? (
        <textarea
          {...(rest as any)}
          placeholder={placeholder}
          rows={2}
          className={`${base} resize-none`}
        />
      ) : (
        <input
          {...(rest as any)}
          placeholder={placeholder}
          className={base}
        />
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ── Address field with Places Autocomplete + GPS detect ───────────────────────

function AddressField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: MAPS_KEY || '',
    id: MAPS_SCRIPT_ID,
    libraries: MAPS_LIBRARIES,
  })

  // Attach Places Autocomplete once Maps JS is ready
  useEffect(() => {
    if (!isLoaded || !inputRef.current || !MAPS_KEY) return
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'in' },
      fields: ['formatted_address'],
      types: ['address'],
    })
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (place.formatted_address) {
        onChange(place.formatted_address)
        setHint(null)
      }
    })
    return () => window.google.maps.event.removeListener(listener)
  }, [isLoaded, onChange])

  async function detectGps() {
    if (!navigator.geolocation) {
      setHint('Location not supported by this browser.')
      return
    }
    setGpsLoading(true)
    setHint(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const { latitude: lat, longitude: lng } = pos.coords
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${MAPS_KEY}`
      )
      const json = await res.json()
      const addr = json.results?.[0]?.formatted_address
      if (addr) {
        onChange(addr)
        setHint('Location detected — please verify or edit below.')
      } else {
        setHint('Could not determine address. Please type it manually.')
      }
    } catch {
      setHint('Location access denied or timed out.')
    } finally {
      setGpsLoading(false)
    }
  }

  const inputCls = `w-full border-2 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors ${
    error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-green-600'
  }`

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-green-900">
          Home address<span className="text-red-400 ml-0.5">*</span>
        </label>
        <button
          type="button"
          onClick={detectGps}
          disabled={gpsLoading}
          className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline disabled:opacity-50 transition-opacity"
        >
          {gpsLoading ? (
            <><span className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin inline-block" /> Detecting…</>
          ) : (
            <><Navigation size={11} /> Use current location</>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Start typing an address in India…"
        autoComplete="off"
        className={inputCls}
      />
      {hint && (
        <p className={`text-xs mt-1 ${hint.startsWith('Location detected') ? 'text-green-600' : 'text-amber-600'}`}>
          {hint}
        </p>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {isLoaded && !hint && (
        <p className="text-xs text-gray-400 mt-1">Type to see suggestions, or tap "Use current location" if you're at their home.</p>
      )}
    </div>
  )
}

// ── Add / edit form ───────────────────────────────────────────────────────────

function LovedOneForm({
  editing,
  onSave,
  onCancel,
  saving,
}: {
  editing: any | null
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm({ defaultValues: editing || {} })

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-fade-in"
    >
      {/* Form header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-green-900">{editing ? 'Edit profile' : 'Add a loved one'}</h2>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Section: Basic info */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User size={14} className="text-green-600" />
            <p className="text-xs font-bold text-green-800 uppercase tracking-wider">Basic information</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Full name" placeholder="e.g. Sunita Reddy"
              required
              error={(errors as any).full_name?.message}
              {...register('full_name', { required: 'Full name is required' })}
            />
            <Field
              label="Age" placeholder="72"
              type="number"
              error={(errors as any).age?.message}
              {...register('age')}
            />
            <Field
              label="Phone number" placeholder="+91 98765 43210"
              error={(errors as any).phone?.message}
              {...register('phone')}
            />
            <Field
              label="City" placeholder="Hyderabad"
              required
              error={(errors as any).city?.message}
              {...register('city', { required: 'City is required' })}
            />
            <Controller
              name="address"
              control={control}
              rules={{ required: 'Address is required' }}
              render={({ field }) => (
                <AddressField
                  value={field.value || ''}
                  onChange={field.onChange}
                  error={(errors as any).address?.message}
                />
              )}
            />
          </div>
        </div>

        {/* Section: Medical */}
        <div className="pt-5 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={14} className="text-amber-500" />
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Medical details</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Medical notes" placeholder="Diabetes, blood pressure medication…"
              textarea span
              {...register('medical_notes')}
            />
            <Field
              label="Doctor's name" placeholder="Dr. Sharma"
              {...register('doctor_name')}
            />
            <Field
              label="Nearest hospital" placeholder="Apollo Jubilee Hills"
              {...register('nearest_hospital')}
            />
          </div>
        </div>

        {/* Section: Emergency contact */}
        <div className="pt-5 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-red-500" />
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Emergency contact</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Name" placeholder="Suresh (son)"
              {...register('emergency_contact_name')}
            />
            <Field
              label="Phone" placeholder="+91 98765 43210"
              {...register('emergency_contact_phone')}
            />
          </div>
        </div>
      </div>

      {/* Form footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to my family'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Loved one profile card ────────────────────────────────────────────────────

function LovedOneCard({
  person,
  onEdit,
  onDelete,
}: {
  person: any
  onEdit: (p: any) => void
  onDelete: (p: any) => void
}) {
  const initials = person.full_name
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('') || '?'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-700 font-bold text-xl">{initials}</span>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-900 text-base leading-tight">{person.full_name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {person.age && (
                <span className="text-xs text-gray-500">Age {person.age}</span>
              )}
              {person.city && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <MapPin size={10} />{person.city}
                </span>
              )}
            </div>
            {person.phone && (
              <a
                href={`tel:${person.phone}`}
                className="inline-flex items-center gap-1 text-xs text-green-700 font-medium mt-1.5 hover:underline"
              >
                <Phone size={11} />{person.phone}
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0 -mt-1 -mr-1">
            <button
              onClick={() => onEdit(person)}
              aria-label={`Edit ${person.full_name}`}
              className="p-2 rounded-xl text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(person)}
              aria-label={`Remove ${person.full_name}`}
              className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Address */}
        {person.address && (
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
            <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">{person.address}</span>
          </div>
        )}
      </div>

      {/* Medical notes */}
      {(person.medical_notes || person.doctor_name || person.nearest_hospital) && (
        <div className="mx-5 mb-4 bg-amber-50 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Stethoscope size={12} className="text-amber-600" />
            <p className="text-xs font-semibold text-amber-800">Medical</p>
          </div>
          {person.medical_notes && (
            <p className="text-xs text-amber-900 leading-relaxed">{person.medical_notes}</p>
          )}
          {(person.doctor_name || person.nearest_hospital) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {person.doctor_name && (
                <p className="text-xs text-amber-700">
                  <span className="font-medium">Dr:</span> {person.doctor_name}
                </p>
              )}
              {person.nearest_hospital && (
                <p className="text-xs text-amber-700">
                  <span className="font-medium">Hospital:</span> {person.nearest_hospital}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Emergency contact */}
      {person.emergency_contact_name && (
        <div className="mx-5 mb-5 bg-red-50 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={14} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-700">Emergency contact</p>
            <p className="text-xs text-red-600 mt-0.5">{person.emergency_contact_name}</p>
          </div>
          {person.emergency_contact_phone && (
            <a
              href={`tel:${person.emergency_contact_phone}`}
              className="w-9 h-9 bg-red-100 hover:bg-red-200 rounded-xl flex items-center justify-center text-red-600 transition-colors flex-shrink-0"
              title={`Call ${person.emergency_contact_name}`}
            >
              <Phone size={15} />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DashboardLovedOnes() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPerson, setEditingPerson] = useState<any | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.from('loved_ones').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setList(data || [])
    } catch {
      setError('Something went wrong — please try again.')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditingPerson(null)
    setShowForm(true)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  function openEdit(person: any) {
    setEditingPerson(person)
    setShowForm(true)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  function closeForm() {
    setShowForm(false)
    setEditingPerson(null)
  }

  async function handleSave(data: any) {
    if (!user) return
    setSaving(true)
    try {
      if (editingPerson) {
        const { error } = await supabase.from('loved_ones').update(data).eq('id', editingPerson.id)
        if (error) throw error
        showToast('Profile updated', 'success')
      } else {
        const { error } = await supabase.from('loved_ones').insert({ ...data, family_user_id: user.id })
        if (error) throw error
        showToast('Loved one added', 'success')
      }
      await load()
      closeForm()
    } catch {
      showToast('Could not save — please try again', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(person: any) {
    if (!window.confirm(`Remove ${person.full_name} from your loved ones? This cannot be undone.`)) return
    try {
      const { error } = await supabase.from('loved_ones').delete().eq('id', person.id)
      if (error) throw error
      setList(prev => prev.filter(p => p.id !== person.id))
      showToast('Profile removed', 'success')
    } catch {
      showToast('Could not remove — please try again', 'error')
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-green-900">Loved Ones</h1>
          <p className="text-gray-400 text-sm mt-0.5">Care profiles for your family members in India.</p>
        </div>
        {!showForm && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
          >
            <Plus size={15} /> Add person
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center justify-between gap-3">
          {error}
          <button onClick={load} className="font-semibold underline whitespace-nowrap">Retry</button>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <LovedOneForm
          editing={editingPerson}
          onSave={handleSave}
          onCancel={closeForm}
          saving={saving}
        />
      )}

      {/* Loading */}
      {loading && <Spinner />}

      {/* Empty state */}
      {!loading && list.length === 0 && !showForm && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={26} className="text-green-600" />
          </div>
          <p className="font-semibold text-green-900 mb-1">No profiles yet</p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto leading-relaxed">
            Add your parent or family member's profile so we can match the right companion for them.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={15} /> Add your first loved one
          </button>
        </div>
      )}

      {/* Profile cards */}
      {!loading && list.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map(p => (
            <LovedOneCard
              key={p.id}
              person={p}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}

          {/* Add another card */}
          {!showForm && (
            <button
              onClick={openAdd}
              className="bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-500 transition-colors min-h-[120px]"
            >
              <Plus size={22} />
              <span className="text-sm font-medium">Add another person</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
