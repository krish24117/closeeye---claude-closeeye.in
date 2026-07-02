import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Edit2, Save, X, Plus, ChevronRight, MapPin, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name?: string | null) {
  return (name || 'CE').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function fmt(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function memberEmoji(rel: string | null): string {
  const r = (rel || '').toLowerCase()
  if (r.includes('father') || r.includes('grandfather') || r === 'parent') return '👴'
  if (r.includes('mother') || r.includes('grandmother')) return '👵'
  if (r.includes('son')) return '👦'
  if (r.includes('daughter')) return '👧'
  if (r.includes('spouse')) return '💑'
  if (r.includes('sibling') || r.includes('brother') || r.includes('sister')) return '👫'
  return '👤'
}

// ── Country codes ──────────────────────────────────────────────────────────────

const CC = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
]

function splitPhone(full: string): { code: string; local: string } {
  if (!full) return { code: '+91', local: '' }
  // Try known codes longest-first to avoid +1 matching +19...
  const sorted = [...CC].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    if (full.startsWith(c.code)) return { code: c.code, local: full.slice(c.code.length).replace(/^\s+/, '') }
  }
  if (full.startsWith('+')) {
    const m = full.match(/^(\+\d{1,4})\s*(.*)$/)
    if (m) return { code: m[1], local: m[2] }
  }
  return { code: '+91', local: full }
}

// ── PhoneInput ─────────────────────────────────────────────────────────────────

function PhoneInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { code, local } = splitPhone(value)

  return (
    <div style={{
      display: 'flex', background: 'var(--cream)',
      border: '1.5px solid var(--gray-light)', borderRadius: 12, overflow: 'hidden',
    }}>
      <select
        value={code}
        onChange={e => onChange(e.target.value + local)}
        style={{
          border: 'none', outline: 'none', background: 'transparent',
          padding: '11px 6px 11px 12px', fontSize: 14, fontFamily: 'inherit',
          color: 'var(--black)', cursor: 'pointer', flexShrink: 0,
          borderRight: '1.5px solid var(--gray-light)',
        }}
      >
        {CC.map(c => (
          <option key={c.code + c.name} value={c.code}>{c.flag} {c.code}</option>
        ))}
      </select>
      <input
        type="tel"
        value={local}
        onChange={e => onChange(code + e.target.value.replace(/\s/g, ''))}
        placeholder={placeholder || '9876543210'}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', minWidth: 0,
        }}
      />
    </div>
  )
}

// ── AddressInput ───────────────────────────────────────────────────────────────

function AddressInput({ value, onChange, rows = 2, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const [detecting, setDetecting] = useState(false)
  const [geoErr, setGeoErr] = useState('')

  async function detect() {
    if (!navigator.geolocation) { setGeoErr('Location not supported on this device'); return }
    setDetecting(true); setGeoErr('')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } },
          )
          const d = await res.json()
          const a = d.address || {}
          const parts = [
            a.house_number, a.road,
            a.suburb || a.neighbourhood || a.quarter,
            a.city || a.town || a.village || a.county,
            a.state,
            a.postcode,
          ].filter(Boolean)
          onChange(parts.length ? parts.join(', ') : d.display_name || '')
        } catch {
          setGeoErr('Could not fetch address. Please type it manually.')
        } finally {
          setDetecting(false)
        }
      },
      () => { setGeoErr('Location access denied — type the address manually.'); setDetecting(false) },
      { timeout: 10000, enableHighAccuracy: false },
    )
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={e => { onChange(e.target.value); setGeoErr('') }}
        placeholder={placeholder || 'Flat / house, area, landmark, pincode…'}
        rows={rows}
        style={{
          width: '100%', background: 'var(--cream)', border: '1.5px solid var(--gray-light)',
          borderRadius: 12, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
          outline: 'none', boxSizing: 'border-box', resize: 'none', lineHeight: 1.55,
          display: 'block',
        }}
      />
      <button
        type="button"
        onClick={detect}
        disabled={detecting}
        style={{
          marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(14,42,31,0.05)', border: '1.5px solid rgba(14,42,31,0.12)',
          borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
          color: 'var(--forest)', cursor: detecting ? 'default' : 'pointer',
          opacity: detecting ? 0.6 : 1, fontFamily: 'inherit',
        }}
      >
        {detecting ? <Loader2 size={13} className="ce-spin" /> : <MapPin size={13} />}
        {detecting ? 'Detecting location…' : 'Auto-detect my location'}
      </button>
      {geoErr && <p style={{ fontSize: 12, color: '#b42318', margin: '5px 0 0' }}>{geoErr}</p>}
    </div>
  )
}

// ── Shared field styles ────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', background: 'var(--cream)', border: '1.5px solid var(--gray-light)',
  borderRadius: 12, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--gray-mid)',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em',
}
const FIELD: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0 }

// ── Types ──────────────────────────────────────────────────────────────────────

interface LovedOne { id: string; full_name: string; relationship: string | null; city: string | null; phone_number: string | null }
interface ElderProfile {
  id?: string; loved_one_id: string; age: number | null; address: string | null
  medical_conditions: string | null; current_medications: unknown[]; allergies: string | null
  doctor_name: string | null; doctor_phone: string | null; emergency_contacts: Contact[]
  photo_consent: boolean
}
interface Contact { name?: string; relation?: string; relationship?: string; phone?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function medLabel(m: any): string {
  if (typeof m === 'string') return m
  return [m.name, m.timing || m.dose].filter(Boolean).join(' · ')
}
interface MemberForm {
  full_name: string; relationship: string; city: string; phone_number: string
  age: string; address: string; medical_conditions: string; medications_text: string
  allergies: string; doctor_name: string; doctor_phone: string
  ec1_name: string; ec1_rel: string; ec1_phone: string
  ec2_name: string; ec2_rel: string; ec2_phone: string
  photo_consent: boolean; health_consent: boolean
}

const BLANK_FORM: MemberForm = {
  full_name: '', relationship: '', city: '', phone_number: '',
  age: '', address: '', medical_conditions: '', medications_text: '',
  allergies: '', doctor_name: '', doctor_phone: '',
  ec1_name: '', ec1_rel: '', ec1_phone: '',
  ec2_name: '', ec2_rel: '', ec2_phone: '',
  photo_consent: false, health_consent: false,
}

const RELATIONSHIPS = ['Son', 'Daughter', 'Parent', 'Spouse', 'Sibling', 'Other']

// ── MemberFormFields ───────────────────────────────────────────────────────────

function MemberFormFields({ form, setForm }: { form: MemberForm; setForm: (fn: (f: MemberForm) => MemberForm) => void }) {
  const needsConsent = !!(form.medical_conditions.trim() || form.medications_text.trim())
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Name */}
      <div style={FIELD}>
        <label style={LABEL}>Full name *</label>
        <input style={INPUT} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
      </div>

      {/* Relationship chips */}
      <div>
        <label style={LABEL}>Relationship</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {RELATIONSHIPS.map(r => (
            <button key={r} type="button"
              onClick={() => setForm(f => ({ ...f, relationship: f.relationship === r ? '' : r }))}
              style={{
                borderRadius: 100, padding: '7px 16px', fontSize: 13, cursor: 'pointer',
                fontWeight: form.relationship === r ? 700 : 400,
                background: form.relationship === r ? 'var(--forest)' : 'var(--cream)',
                color: form.relationship === r ? '#fff' : 'var(--gray-dark)',
                border: form.relationship === r ? 'none' : '1.5px solid var(--gray-light)',
                fontFamily: 'inherit',
              }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* City + Phone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={FIELD}>
          <label style={LABEL}>City in India</label>
          <input style={INPUT} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Hyderabad" />
        </div>
        <div style={FIELD}>
          <label style={LABEL}>Age</label>
          <input style={INPUT} type="number" min={1} max={120} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="—" />
        </div>
      </div>

      {/* Their phone with country code */}
      <div style={FIELD}>
        <label style={LABEL}>Their phone number</label>
        <PhoneInput
          value={form.phone_number}
          onChange={v => setForm(f => ({ ...f, phone_number: v }))}
          placeholder="9876543210"
        />
      </div>

      {/* Address with GPS */}
      <div style={FIELD}>
        <label style={LABEL}>Address in India *</label>
        <AddressInput
          value={form.address}
          onChange={v => setForm(f => ({ ...f, address: v }))}
          placeholder="Flat / house, area, landmark, pincode…"
          rows={2}
        />
        <p style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 5 }}>
          "Auto-detect" uses your current device location.
        </p>
      </div>

      {/* Health details */}
      <div style={{ borderTop: '1.5px solid var(--gray-light)', paddingTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Health details (optional)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={FIELD}>
            <label style={LABEL}>Health conditions</label>
            <input style={INPUT} value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} placeholder="e.g. Diabetes, Hypertension" />
          </div>
          <div style={FIELD}>
            <label style={LABEL}>Medications (comma-separated)</label>
            <input style={INPUT} value={form.medications_text} onChange={e => setForm(f => ({ ...f, medications_text: e.target.value }))} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={FIELD}>
              <label style={LABEL}>Allergies</label>
              <input style={INPUT} value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="e.g. Penicillin" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Doctor's name</label>
              <input style={INPUT} value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} placeholder="Dr. Name" />
            </div>
          </div>
          <div style={FIELD}>
            <label style={LABEL}>Doctor's phone</label>
            <PhoneInput
              value={form.doctor_phone}
              onChange={v => setForm(f => ({ ...f, doctor_phone: v }))}
              placeholder="9876543210"
            />
          </div>
        </div>
        {needsConsent && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.health_consent} onChange={e => setForm(f => ({ ...f, health_consent: e.target.checked }))} style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16 }} />
            <span style={{ fontSize: 12, color: 'var(--gray-mid)', lineHeight: 1.55 }}>
              I consent to Close Eye storing this health information solely to coordinate care visits.
            </span>
          </label>
        )}
      </div>

      {/* Emergency contacts */}
      <div style={{ borderTop: '1.5px solid var(--gray-light)', paddingTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Emergency contacts
        </p>
        {(['Primary contact', 'Secondary contact (optional)'] as const).map((lbl, i) => {
          const keys = i === 0
            ? { name: 'ec1_name' as const, rel: 'ec1_rel' as const, phone: 'ec1_phone' as const }
            : { name: 'ec2_name' as const, rel: 'ec2_rel' as const, phone: 'ec2_phone' as const }
          return (
            <div key={lbl} style={{ marginBottom: i === 0 ? 16 : 0 }}>
              <p style={{ fontSize: 11, color: 'var(--gray-mid)', margin: '0 0 8px', fontWeight: 600 }}>{lbl.toUpperCase()}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={FIELD}>
                    <label style={LABEL}>Name</label>
                    <input style={INPUT} value={form[keys.name]} onChange={e => setForm(f => ({ ...f, [keys.name]: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div style={FIELD}>
                    <label style={LABEL}>Relation</label>
                    <input style={INPUT} value={form[keys.rel]} onChange={e => setForm(f => ({ ...f, [keys.rel]: e.target.value }))} placeholder="e.g. Son" />
                  </div>
                </div>
                <div style={FIELD}>
                  <label style={LABEL}>Phone</label>
                  <PhoneInput value={form[keys.phone]} onChange={v => setForm(f => ({ ...f, [keys.phone]: v }))} placeholder="9876543210" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Photo consent */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', background: 'var(--cream)', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{
          width: 20, height: 20, borderRadius: 6, border: '2px solid',
          borderColor: form.photo_consent ? 'var(--forest)' : 'var(--gray-light)',
          background: form.photo_consent ? 'var(--forest)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
        }}>
          {form.photo_consent && <Check size={12} color="#fff" strokeWidth={3} />}
        </div>
        <input type="checkbox" checked={form.photo_consent} onChange={e => setForm(f => ({ ...f, photo_consent: e.target.checked }))} style={{ display: 'none' }} />
        <span style={{ fontSize: 13, color: 'var(--gray-dark)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--black)', display: 'block', marginBottom: 2 }}>Allow photo updates</strong>
          Companion may include a photo in the WhatsApp visit report.
        </span>
      </label>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardProfile() {
  const { user, profile, signOut } = useAuth()
  const isNri = profile?.user_type === 'nri'

  // Society state
  const [society, setSociety] = useState<{ society_name?: string; flat_number?: string; area?: string; member_id?: string } | null>(null)

  // NRI state
  const [lovedOnes, setLovedOnes]       = useState<LovedOne[]>([])
  const [elderProfiles, setElderProfiles] = useState<Record<string, ElderProfile>>({})
  const [editingId, setEditingId]       = useState<string | 'new' | null>(null)
  const [forms, setForms]               = useState<Record<string, MemberForm>>({})
  const [savingId, setSavingId]         = useState<string | null>(null)
  const [memberErrs, setMemberErrs]     = useState<Record<string, string>>({})
  const [memberOk, setMemberOk]         = useState<Record<string, boolean>>({})

  // Account section
  const [profileForm, setProfileForm] = useState({ full_name: '', whatsapp_number: '', country: '', address: '' })
  const [editingAccount, setEditingAccount] = useState(false)
  const [savingAccount, setSavingAccount]   = useState(false)
  const [accountErr, setAccountErr]         = useState('')
  const [accountOk, setAccountOk]           = useState(false)

  useEffect(() => {
    if (!user) return
    setProfileForm({
      full_name:       profile?.full_name || '',
      whatsapp_number: profile?.whatsapp_number || '',
      country:         profile?.country || '',
      address:         (profile as any)?.address || '',
    })
    if (isNri) {
      ;(async () => {
        const { data: los } = await supabase
          .from('loved_ones').select('id, full_name, relationship, city, phone_number')
          .eq('family_user_id', user.id).order('created_at')

        if (los?.length) {
          setLovedOnes(los as LovedOne[])
          const ids = los.map(l => l.id)
          const { data: eps } = await supabase
            .from('elder_profiles')
            .select('id, loved_one_id, age, address, medical_conditions, current_medications, allergies, doctor_name, doctor_phone, emergency_contacts, photo_consent')
            .in('loved_one_id', ids)

          const epMap: Record<string, ElderProfile> = {}
          ;(eps || []).forEach((ep: any) => { epMap[ep.loved_one_id] = ep as ElderProfile })
          setElderProfiles(epMap)

          const formMap: Record<string, MemberForm> = {}
          los.forEach((lo: any) => {
            const ep = epMap[lo.id]
            const contacts: Contact[] = Array.isArray(ep?.emergency_contacts) ? ep.emergency_contacts : []
            formMap[lo.id] = {
              full_name:          lo.full_name || '',
              relationship:       lo.relationship || '',
              city:               lo.city || '',
              phone_number:       lo.phone_number || '',
              age:                ep?.age ? String(ep.age) : '',
              address:            ep?.address || '',
              medical_conditions: ep?.medical_conditions || '',
              medications_text:   Array.isArray(ep?.current_medications) ? ep.current_medications.map(medLabel).filter(Boolean).join(', ') : '',
              allergies:          ep?.allergies || '',
              doctor_name:        ep?.doctor_name || '',
              doctor_phone:       ep?.doctor_phone || '',
              ec1_name:  contacts[0]?.name || '',
              ec1_rel:   contacts[0]?.relationship || contacts[0]?.relation || '',
              ec1_phone: contacts[0]?.phone || '',
              ec2_name:  contacts[1]?.name || '',
              ec2_rel:   contacts[1]?.relationship || contacts[1]?.relation || '',
              ec2_phone: contacts[1]?.phone || '',
              photo_consent: ep?.photo_consent ?? false,
              health_consent: false,
            }
          })
          setForms(formMap)
        }
      })()
    } else {
      supabase.from('society_members').select('society_name, flat_number, area, member_id')
        .eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setSociety(data))
    }
  }, [user, isNri, profile])

  async function handleSignOut() { await signOut(); window.location.replace('/auth') }

  function startEdit(id: string) { setEditingId(id); setMemberErrs(e => ({ ...e, [id]: '' })); setMemberOk(o => ({ ...o, [id]: false })) }
  function startAddNew() { setForms(f => ({ ...f, new: { ...BLANK_FORM } })); setEditingId('new'); setMemberErrs(e => ({ ...e, new: '' })) }
  function cancelEdit() { setEditingId(null) }
  function setMemberForm(id: string, fn: (f: MemberForm) => MemberForm) { setForms(fs => ({ ...fs, [id]: fn(fs[id] || BLANK_FORM) })) }

  async function saveMember(id: string) {
    const form = forms[id]
    if (!user || !form) return
    if (!form.full_name.trim()) { setMemberErrs(e => ({ ...e, [id]: 'Name is required.' })); return }
    if (!form.address.trim()) { setMemberErrs(e => ({ ...e, [id]: 'Address is required.' })); return }
    const needsConsent = !!(form.medical_conditions.trim() || form.medications_text.trim())
    if (needsConsent && !form.health_consent) { setMemberErrs(e => ({ ...e, [id]: 'Please tick the health data consent box.' })); return }

    setSavingId(id); setMemberErrs(e => ({ ...e, [id]: '' }))
    const meds = form.medications_text.split(',').map(s => s.trim()).filter(Boolean)
    const ecs: Contact[] = []
    if (form.ec1_name.trim()) ecs.push({ name: form.ec1_name.trim(), relationship: form.ec1_rel.trim(), phone: form.ec1_phone.trim() })
    if (form.ec2_name.trim()) ecs.push({ name: form.ec2_name.trim(), relationship: form.ec2_rel.trim(), phone: form.ec2_phone.trim() })

    try {
      if (id === 'new') {
        const { data: newLo, error: loErr } = await supabase.from('loved_ones').insert({
          family_user_id: user.id,
          full_name: form.full_name.trim(),
          relationship: form.relationship || null,
          city: form.city.trim() || null,
          phone_number: form.phone_number.trim() || null,
        }).select('id, full_name, relationship, city, phone_number').single()
        if (loErr || !newLo) throw loErr ?? new Error('Could not create family member')

        const epData = {
          loved_one_id: newLo.id, age: form.age ? parseInt(form.age, 10) : null,
          address: form.address.trim(), medical_conditions: form.medical_conditions.trim() || null,
          current_medications: meds.length ? meds : [], allergies: form.allergies.trim() || null,
          doctor_name: form.doctor_name.trim() || null, doctor_phone: form.doctor_phone.trim() || null,
          emergency_contacts: ecs, photo_consent: form.photo_consent,
        }
        const { data: newEp, error: epErr } = await supabase.from('elder_profiles').insert(epData).select('id').single()
        if (epErr) throw epErr

        setLovedOnes(prev => [...prev, newLo as LovedOne])
        setElderProfiles(prev => ({ ...prev, [newLo.id]: { id: newEp.id, ...epData } as ElderProfile }))
        setForms(fs => { const next = { ...fs }; next[newLo.id] = { ...form, health_consent: false }; delete next.new; return next })
        setEditingId(null)
      } else {
        const { error: loErr } = await supabase.from('loved_ones').update({
          full_name: form.full_name.trim(), relationship: form.relationship || null,
          city: form.city.trim() || null, phone_number: form.phone_number.trim() || null,
        }).eq('id', id)
        if (loErr) throw loErr

        const epData = {
          loved_one_id: id, age: form.age ? parseInt(form.age, 10) : null,
          address: form.address.trim(), medical_conditions: form.medical_conditions.trim() || null,
          current_medications: meds.length ? meds : [], allergies: form.allergies.trim() || null,
          doctor_name: form.doctor_name.trim() || null, doctor_phone: form.doctor_phone.trim() || null,
          emergency_contacts: ecs, photo_consent: form.photo_consent,
        }
        const ep = elderProfiles[id]
        if (ep?.id) {
          const { error: epErr } = await supabase.from('elder_profiles').update(epData).eq('id', ep.id)
          if (epErr) throw epErr
        } else {
          const { data: newEp, error: epErr } = await supabase.from('elder_profiles').insert(epData).select('id').single()
          if (epErr) throw epErr
          setElderProfiles(prev => ({ ...prev, [id]: { id: newEp.id, ...epData } as ElderProfile }))
        }
        setLovedOnes(prev => prev.map(lo => lo.id === id
          ? { ...lo, full_name: form.full_name.trim(), relationship: form.relationship || null, city: form.city.trim() || null, phone_number: form.phone_number.trim() || null }
          : lo
        ))
        setElderProfiles(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...epData } as ElderProfile }))
        setForms(fs => ({ ...fs, [id]: { ...form, health_consent: false } }))
        setMemberOk(o => ({ ...o, [id]: true }))
        setEditingId(null)
      }
    } catch (err) {
      console.error('[Profile] saveMember:', err)
      setMemberErrs(e => ({ ...e, [id]: 'Could not save — please try again.' }))
    } finally {
      setSavingId(null)
    }
  }

  async function saveAccount() {
    if (!user) return
    if (!profileForm.whatsapp_number.trim()) { setAccountErr('WhatsApp number is required.'); return }
    setSavingAccount(true); setAccountErr(''); setAccountOk(false)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name:       profileForm.full_name.trim() || null,
        whatsapp_number: profileForm.whatsapp_number.trim(),
        country:         profileForm.country.trim() || null,
        address:         profileForm.address.trim() || null,
      }).eq('id', user.id)
      if (error) throw error
      setAccountOk(true); setEditingAccount(false)
    } catch {
      setAccountErr('Could not save — please try again.')
    } finally {
      setSavingAccount(false)
    }
  }

  const isFounder = !!profile?.is_founding_member

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 40 }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="ce-pr-hero">
        <div className="ce-pr-avatar">{initials(profile?.full_name)}</div>
        <p className="ce-pr-name">{profile?.full_name || 'Your account'}</p>
        <p className="ce-pr-hero-sub">
          {isNri
            ? `${lovedOnes.length || 0} family member${lovedOnes.length !== 1 ? 's' : ''} in care`
            : [society?.flat_number, society?.society_name].filter(Boolean).join(' · ') || 'Society Member'
          }
        </p>
        {isFounder && (
          <div>
            <span className="ce-pr-badge">
              ★ Founding Member{profile?.founding_number ? ` #${String(profile.founding_number).padStart(4, '0')}` : ''}
            </span>
          </div>
        )}
      </div>

      {isNri ? (
        <>
          {/* ── Family in India ───────────────────────────────────────── */}
          <div className="ce-pr-section">
            <p className="ce-pr-sec-lbl">Family in India</p>

            {lovedOnes.map(lo => {
              const ep = elderProfiles[lo.id]
              const isEditing = editingId === lo.id
              const form = forms[lo.id]
              const hasHealth = !!(ep?.medical_conditions || (Array.isArray(ep?.current_medications) && ep.current_medications.length > 0))
              const healthHint = hasHealth
                ? ep?.medical_conditions?.split(',')[0]?.trim() || 'Health details added'
                : 'Tap to add health details'
              const sub = [lo.city, ep?.address ? '📍 Address saved' : healthHint].filter(Boolean).join(' · ')

              if (!isEditing) return (
                <button key={lo.id} className="ce-pr-member" onClick={() => startEdit(lo.id)}>
                  <div className="ce-pr-member-emoji">{memberEmoji(lo.relationship)}</div>
                  <div className="ce-pr-member-content">
                    <div className="ce-pr-member-name">
                      {lo.full_name}{lo.relationship ? <span style={{ fontWeight: 400, color: 'var(--gray-mid)' }}> · {lo.relationship}</span> : ''}
                    </div>
                    <div className="ce-pr-member-sub">{sub || 'Tap to edit'}</div>
                  </div>
                  {memberOk[lo.id] && <Check size={14} color="var(--forest)" style={{ flexShrink: 0 }} />}
                  <ChevronRight size={16} className="ce-pr-member-chevron" color="#D0D0D0" />
                </button>
              )

              return (
                <div key={lo.id} className="ce-pr-edit-card">
                  <div className="ce-pr-edit-hdr">
                    <p className="ce-pr-edit-title">Edit {lo.full_name}</p>
                    <div className="ce-pr-edit-actions">
                      <button onClick={cancelEdit} className="ce-pr-cancel-btn"><X size={11} /> Cancel</button>
                      <button onClick={() => saveMember(lo.id)} disabled={savingId === lo.id} className="ce-pr-save-btn" style={{ opacity: savingId === lo.id ? 0.6 : 1 }}>
                        {savingId === lo.id ? <><Loader2 size={11} className="ce-spin" /> Saving…</> : <><Save size={11} /> Save</>}
                      </button>
                    </div>
                  </div>
                  {form && <MemberFormFields form={form} setForm={fn => setMemberForm(lo.id, fn)} />}
                  {memberErrs[lo.id] && <p style={{ fontSize: 13, color: '#B42318', marginTop: 12 }}>{memberErrs[lo.id]}</p>}
                </div>
              )
            })}

            {editingId === 'new' && forms.new && (
              <div className="ce-pr-edit-card">
                <div className="ce-pr-edit-hdr">
                  <p className="ce-pr-edit-title">Add family member</p>
                  <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-mid)', padding: 4 }}>
                    <X size={18} />
                  </button>
                </div>
                <MemberFormFields form={forms.new} setForm={fn => setMemberForm('new', fn)} />
                {memberErrs.new && <p style={{ fontSize: 13, color: '#B42318', marginTop: 12 }}>{memberErrs.new}</p>}
                <button
                  onClick={() => saveMember('new')}
                  disabled={savingId === 'new'}
                  style={{
                    marginTop: 18, width: '100%', background: 'var(--forest)', color: '#fff',
                    border: 'none', borderRadius: 14, padding: '14px 20px',
                    fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    opacity: savingId === 'new' ? 0.6 : 1, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {savingId === 'new' ? <><Loader2 size={15} className="ce-spin" /> Adding…</> : 'Add family member →'}
                </button>
              </div>
            )}

            {editingId !== 'new' && (
              <button onClick={startAddNew} className="ce-pr-add">
                <Plus size={16} /> Add family member
              </button>
            )}
          </div>

          {/* ── Your account ──────────────────────────────────────────── */}
          <div className="ce-pr-section">
            <p className="ce-pr-sec-lbl">Your account</p>

            {!editingAccount ? (
              <div className="ce-pr-rows">
                <AccountRow label="Name" value={profile?.full_name} />
                <AccountRow label="WhatsApp" value={profile?.whatsapp_number} />
                <AccountRow label="Email" value={user?.email} />
                <AccountRow label="Country" value={profile?.country} />
                <AccountRow label="Address" value={(profile as any)?.address} />
                {accountOk && (
                  <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--forest)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Check size={13} /> Saved
                  </div>
                )}
                <div className="ce-pr-rows-footer">
                  <button onClick={() => { setEditingAccount(true); setAccountOk(false) }} className="ce-pr-edit-inline-btn">
                    <Edit2 size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Edit details
                  </button>
                </div>
              </div>
            ) : (
              <div className="ce-pr-edit-card">
                <div className="ce-pr-edit-hdr">
                  <p className="ce-pr-edit-title">Your details</p>
                  <div className="ce-pr-edit-actions">
                    <button onClick={() => { setEditingAccount(false); setAccountErr('') }} className="ce-pr-cancel-btn"><X size={11} /> Cancel</button>
                    <button onClick={saveAccount} disabled={savingAccount} className="ce-pr-save-btn" style={{ opacity: savingAccount ? 0.6 : 1 }}>
                      {savingAccount ? <><Loader2 size={11} className="ce-spin" /> Saving…</> : <><Save size={11} /> Save</>}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={FIELD}>
                    <label style={LABEL}>Your name</label>
                    <input style={INPUT} value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div style={FIELD}>
                    <label style={LABEL}>Email</label>
                    <input style={{ ...INPUT, opacity: 0.5, cursor: 'not-allowed' }} value={user?.email || ''} disabled />
                  </div>
                  <div style={FIELD}>
                    <label style={LABEL}>WhatsApp number *</label>
                    <PhoneInput
                      value={profileForm.whatsapp_number}
                      onChange={v => setProfileForm(f => ({ ...f, whatsapp_number: v }))}
                      placeholder="9876543210"
                    />
                    <p style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 4 }}>Visit reports and booking updates are sent here.</p>
                  </div>
                  <div style={FIELD}>
                    <label style={LABEL}>Where you live</label>
                    <input style={INPUT} value={profileForm.country} onChange={e => setProfileForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. USA, UK, UAE, Australia…" />
                  </div>
                  <div style={FIELD}>
                    <label style={LABEL}>Your address (optional)</label>
                    <AddressInput
                      value={profileForm.address}
                      onChange={v => setProfileForm(f => ({ ...f, address: v }))}
                      placeholder="Your home address — auto-fills booking forms"
                    />
                  </div>
                </div>
                {accountErr && <p style={{ fontSize: 13, color: '#B42318', marginTop: 12 }}>{accountErr}</p>}
              </div>
            )}
          </div>

          {/* ── Membership & billing ──────────────────────────────────── */}
          {isFounder && (
            <div className="ce-pr-section">
              <p className="ce-pr-sec-lbl">Membership &amp; billing</p>
              <Link to="/dashboard/bookings" className="ce-pr-link">
                <div className="ce-pr-link-emoji">★</div>
                <span className="ce-pr-link-label">
                  Founding Member
                  {profile?.founding_number && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)' }}>#{String(profile.founding_number).padStart(4, '0')}</span>}
                </span>
                <ChevronRight size={16} className="ce-pr-link-chevron" />
              </Link>
              <Link to="/dashboard/bookings" className="ce-pr-link">
                <div className="ce-pr-link-emoji">🧾</div>
                <span className="ce-pr-link-label">Bookings &amp; receipts</span>
                <ChevronRight size={16} className="ce-pr-link-chevron" />
              </Link>
            </div>
          )}
        </>
      ) : (
        /* ── Society member view ──────────────────────────────────────── */
        <>
          <div className="ce-pr-section">
            <p className="ce-pr-sec-lbl">Your society</p>
            <div className="ce-pr-rows">
              <AccountRow label="Society" value={society?.society_name} />
              <AccountRow label="Flat" value={society?.flat_number} />
              <AccountRow label="Area" value={society?.area} />
              <AccountRow label="Member ID" value={society?.member_id} />
            </div>
          </div>

          <div className="ce-pr-section">
            <p className="ce-pr-sec-lbl">Your account</p>
            {!editingAccount ? (
              <div className="ce-pr-rows">
                <AccountRow label="Name" value={profile?.full_name} />
                <AccountRow label="WhatsApp" value={profile?.whatsapp_number} />
                <AccountRow label="Email" value={user?.email} />
                <AccountRow label="Address" value={(profile as any)?.address} />
                {accountOk && (
                  <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--forest)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Check size={13} /> Saved
                  </div>
                )}
                <div className="ce-pr-rows-footer">
                  <button onClick={() => { setEditingAccount(true); setAccountOk(false) }} className="ce-pr-edit-inline-btn">
                    <Edit2 size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />Edit details
                  </button>
                </div>
              </div>
            ) : (
              <div className="ce-pr-edit-card">
                <div className="ce-pr-edit-hdr">
                  <p className="ce-pr-edit-title">Your details</p>
                  <div className="ce-pr-edit-actions">
                    <button onClick={() => { setEditingAccount(false); setAccountErr('') }} className="ce-pr-cancel-btn"><X size={11} /> Cancel</button>
                    <button onClick={saveAccount} disabled={savingAccount} className="ce-pr-save-btn" style={{ opacity: savingAccount ? 0.6 : 1 }}>
                      {savingAccount ? <><Loader2 size={11} className="ce-spin" /> Saving…</> : <><Save size={11} /> Save</>}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={FIELD}>
                    <label style={LABEL}>Name</label>
                    <input style={INPUT} value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div style={FIELD}>
                    <label style={LABEL}>Email</label>
                    <input style={{ ...INPUT, opacity: 0.5, cursor: 'not-allowed' }} value={user?.email || ''} disabled />
                  </div>
                  <div style={FIELD}>
                    <label style={LABEL}>WhatsApp number *</label>
                    <PhoneInput value={profileForm.whatsapp_number} onChange={v => setProfileForm(f => ({ ...f, whatsapp_number: v }))} placeholder="9876543210" />
                  </div>
                  <div style={FIELD}>
                    <label style={LABEL}>Your address</label>
                    <AddressInput value={profileForm.address} onChange={v => setProfileForm(f => ({ ...f, address: v }))} placeholder="Flat / house, area, landmark, pincode…" />
                  </div>
                </div>
                {accountErr && <p style={{ fontSize: 13, color: '#B42318', marginTop: 12 }}>{accountErr}</p>}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Settings & support ────────────────────────────────────────── */}
      <div className="ce-pr-section" style={{ marginBottom: 8 }}>
        <p className="ce-pr-sec-lbl">Support</p>
        <a href="https://wa.me/919000221261" target="_blank" rel="noopener noreferrer" className="ce-pr-link">
          <div className="ce-pr-link-emoji">💬</div>
          <span className="ce-pr-link-label">Contact the care team</span>
          <ChevronRight size={16} className="ce-pr-link-chevron" />
        </a>
        <a href="https://closeeye.in/faq" target="_blank" rel="noopener noreferrer" className="ce-pr-link">
          <div className="ce-pr-link-emoji">❔</div>
          <span className="ce-pr-link-label">Help &amp; FAQ</span>
          <ChevronRight size={16} className="ce-pr-link-chevron" />
        </a>
        <button onClick={handleSignOut} className="ce-pr-link ce-pr-signout">
          <LogOut size={15} style={{ marginRight: 4 }} /> Sign out
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray-mid)', padding: '12px 24px 4px', lineHeight: 1.6 }}>
        Your family's information is private and used only to provide care.
      </p>
    </div>
  )
}

// ── AccountRow ─────────────────────────────────────────────────────────────────

function AccountRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null
  return (
    <div className="ce-pr-row">
      <span className="ce-pr-row-label">{label}</span>
      <span className="ce-pr-row-val">{value}</span>
    </div>
  )
}
