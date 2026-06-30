import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Edit2, Save, X, Plus, Phone } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(name?: string | null) {
  return (name || 'CE').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  const shown = rows.filter(([, v]) => v && v.trim())
  if (!shown.length) return null
  return (
    <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-light)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{title}</span>
      </div>
      {shown.map(([label, value]) => (
        <div key={label} style={{ padding: '13px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-mid)', flexShrink: 0 }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)', textAlign: 'right' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

interface Contact { name?: string; relation?: string; relationship?: string; phone?: string }
interface Med { name?: string; timing?: string; dose?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function medLabel(m: any): string {
  if (typeof m === 'string') return m
  const mm = m as Med
  return [mm.name, mm.timing || mm.dose].filter(Boolean).join(' · ')
}

function fmt(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Types ──────────────────────────────────────────────────────────────────

interface LovedOne { id: string; full_name: string; relationship: string | null; city: string | null; phone_number: string | null }
interface ElderProfile {
  id?: string; loved_one_id: string; age: number | null; address: string | null
  medical_conditions: string | null; current_medications: unknown[]; allergies: string | null
  doctor_name: string | null; doctor_phone: string | null; emergency_contacts: Contact[]
  photo_consent: boolean
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

// ── Styles ─────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: '100%', background: 'var(--cream)', border: '1px solid var(--gray-light)',
  borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
}
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', marginBottom: 4,
}

// ── Member form (shared between edit and add-new) ──────────────────────────

function MemberFormFields({
  form, setForm,
}: {
  form: MemberForm
  setForm: (fn: (f: MemberForm) => MemberForm) => void
}) {
  const needsConsent = !!(form.medical_conditions.trim() || form.medications_text.trim())
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Name */}
      <div>
        <label style={LABEL}>Name *</label>
        <input style={INPUT} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
      </div>
      {/* Relationship chips */}
      <div>
        <label style={LABEL}>Relationship</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {RELATIONSHIPS.map(r => (
            <button key={r} type="button" onClick={() => setForm(f => ({ ...f, relationship: f.relationship === r ? '' : r }))}
              style={{ borderRadius: 100, padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontWeight: form.relationship === r ? 600 : 400, background: form.relationship === r ? 'var(--forest)' : 'var(--cream)', color: form.relationship === r ? '#fff' : 'var(--gray-dark)', border: form.relationship === r ? 'none' : '1px solid var(--gray-light)' }}>
              {r}
            </button>
          ))}
        </div>
      </div>
      {/* City + Phone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={LABEL}>City in India</label>
          <input style={INPUT} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Hyderabad" />
        </div>
        <div>
          <label style={LABEL}>Their phone</label>
          <input style={INPUT} value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="+91..." type="tel" />
        </div>
      </div>
      {/* Age + Address */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10 }}>
        <div>
          <label style={LABEL}>Age</label>
          <input style={INPUT} type="number" min={1} max={120} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="Age" />
        </div>
        <div>
          <label style={LABEL}>Address *</label>
          <input style={INPUT} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
        </div>
      </div>

      {/* Health details */}
      <div style={{ borderTop: '1px solid var(--gray-light)', paddingTop: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-mid)', margin: '0 0 10px' }}>HEALTH DETAILS (OPTIONAL)</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label style={LABEL}>Health conditions</label>
            <input style={INPUT} value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} placeholder="e.g. Diabetes, Hypertension" />
          </div>
          <div>
            <label style={LABEL}>Medications (comma-separated)</label>
            <input style={INPUT} value={form.medications_text} onChange={e => setForm(f => ({ ...f, medications_text: e.target.value }))} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={LABEL}>Allergies</label>
              <input style={INPUT} value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="e.g. Penicillin" />
            </div>
            <div>
              <label style={LABEL}>Doctor's name</label>
              <input style={INPUT} value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} placeholder="Dr. Name" />
            </div>
          </div>
          <div>
            <label style={LABEL}>Doctor's phone</label>
            <input style={INPUT} value={form.doctor_phone} onChange={e => setForm(f => ({ ...f, doctor_phone: e.target.value }))} placeholder="+91..." />
          </div>
        </div>
        {needsConsent && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.health_consent} onChange={e => setForm(f => ({ ...f, health_consent: e.target.checked }))} style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--gray-mid)', lineHeight: 1.5 }}>
              I consent to Close Eye storing this health information solely to coordinate care visits.
            </span>
          </label>
        )}
      </div>

      {/* Emergency contacts */}
      <div style={{ borderTop: '1px solid var(--gray-light)', paddingTop: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-mid)', margin: '0 0 10px' }}>EMERGENCY CONTACTS</p>
        {(['Contact 1', 'Contact 2 (optional)'] as const).map((label, i) => {
          const keys = i === 0
            ? { name: 'ec1_name' as const, rel: 'ec1_rel' as const, phone: 'ec1_phone' as const }
            : { name: 'ec2_name' as const, rel: 'ec2_rel' as const, phone: 'ec2_phone' as const }
          return (
            <div key={label} style={{ marginBottom: i === 0 ? 14 : 0 }}>
              <p style={{ fontSize: 11, color: 'var(--gray-mid)', margin: '0 0 8px' }}>{label}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={LABEL}>Name</label>
                  <input style={INPUT} value={form[keys.name]} onChange={e => setForm(f => ({ ...f, [keys.name]: e.target.value }))} placeholder="Full name" />
                </div>
                <div>
                  <label style={LABEL}>Relationship</label>
                  <input style={INPUT} value={form[keys.rel]} onChange={e => setForm(f => ({ ...f, [keys.rel]: e.target.value }))} placeholder="e.g. Son" />
                </div>
              </div>
              <div>
                <label style={LABEL}>Phone</label>
                <input style={INPUT} value={form[keys.phone]} onChange={e => setForm(f => ({ ...f, [keys.phone]: e.target.value }))} placeholder="+91..." />
              </div>
            </div>
          )
        })}
      </div>

      {/* Photo consent */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={form.photo_consent} onChange={e => setForm(f => ({ ...f, photo_consent: e.target.checked }))} style={{ marginTop: 2, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--gray-mid)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--black)' }}>Photo updates</strong> — allow the companion to include a photo in the WhatsApp visit report.
        </span>
      </label>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function DashboardProfile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isNri = profile?.user_type === 'nri'

  // Society state
  const [society, setSociety] = useState<{ society_name?: string; flat_number?: string; area?: string; member_id?: string } | null>(null)

  // NRI state — multiple family members
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([])
  const [elderProfiles, setElderProfiles] = useState<Record<string, ElderProfile>>({})
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [forms, setForms] = useState<Record<string, MemberForm>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [memberErrs, setMemberErrs] = useState<Record<string, string>>({})
  const [memberOk, setMemberOk] = useState<Record<string, boolean>>({})

  // Membership receipt
  const [membership, setMembership] = useState<{ status: string; razorpay_payment_id: string | null; activated_at: string | null } | null>(null)

  // My Account section
  const [profileForm, setProfileForm] = useState({ full_name: '', whatsapp_number: '', country: '' })
  const [editingAccount, setEditingAccount] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountErr, setAccountErr] = useState('')
  const [accountOk, setAccountOk] = useState(false)

  useEffect(() => {
    if (!user) return
    setProfileForm({
      full_name: profile?.full_name || '',
      whatsapp_number: profile?.whatsapp_number || '',
      country: profile?.country || '',
    })
    if (isNri) {
      ;(async () => {
        const { data: los } = await supabase
          .from('loved_ones')
          .select('id, full_name, relationship, city, phone_number')
          .eq('family_user_id', user.id)
          .order('created_at')

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
              full_name: lo.full_name || '',
              relationship: lo.relationship || '',
              city: lo.city || '',
              phone_number: lo.phone_number || '',
              age: ep?.age ? String(ep.age) : '',
              address: ep?.address || '',
              medical_conditions: ep?.medical_conditions || '',
              medications_text: Array.isArray(ep?.current_medications) ? ep.current_medications.map(medLabel).filter(Boolean).join(', ') : '',
              allergies: ep?.allergies || '',
              doctor_name: ep?.doctor_name || '',
              doctor_phone: ep?.doctor_phone || '',
              ec1_name: contacts[0]?.name || '',
              ec1_rel: contacts[0]?.relationship || contacts[0]?.relation || '',
              ec1_phone: contacts[0]?.phone || '',
              ec2_name: contacts[1]?.name || '',
              ec2_rel: contacts[1]?.relationship || contacts[1]?.relation || '',
              ec2_phone: contacts[1]?.phone || '',
              photo_consent: ep?.photo_consent ?? false,
              health_consent: false,
            }
          })
          setForms(formMap)
        }

        // Membership receipt
        const { data: ms } = await supabase
          .from('memberships')
          .select('status, razorpay_payment_id, activated_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
        if (ms) setMembership(ms)
      })()
    } else {
      supabase.from('society_members').select('society_name, flat_number, area, member_id')
        .eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setSociety(data))
    }
  }, [user, isNri, profile])

  async function handleSignOut() { await signOut(); window.location.replace('/auth') }

  function startEdit(id: string) {
    setEditingId(id)
    setMemberErrs(e => ({ ...e, [id]: '' }))
    setMemberOk(o => ({ ...o, [id]: false }))
  }

  function startAddNew() {
    setForms(f => ({ ...f, new: { ...BLANK_FORM } }))
    setEditingId('new')
    setMemberErrs(e => ({ ...e, new: '' }))
  }

  function cancelEdit() { setEditingId(null) }

  function setMemberForm(id: string, fn: (f: MemberForm) => MemberForm) {
    setForms(fs => ({ ...fs, [id]: fn(fs[id] || BLANK_FORM) }))
  }

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
          loved_one_id: newLo.id,
          age: form.age ? parseInt(form.age, 10) : null,
          address: form.address.trim(),
          medical_conditions: form.medical_conditions.trim() || null,
          current_medications: meds.length ? meds : [],
          allergies: form.allergies.trim() || null,
          doctor_name: form.doctor_name.trim() || null,
          doctor_phone: form.doctor_phone.trim() || null,
          emergency_contacts: ecs,
          photo_consent: form.photo_consent,
        }
        const { data: newEp, error: epErr } = await supabase.from('elder_profiles').insert(epData).select('id').single()
        if (epErr) throw epErr

        setLovedOnes(prev => [...prev, newLo as LovedOne])
        setElderProfiles(prev => ({ ...prev, [newLo.id]: { id: newEp.id, ...epData } as ElderProfile }))
        setForms(fs => {
          const next = { ...fs }
          next[newLo.id] = { ...form, health_consent: false }
          delete next.new
          return next
        })
        setEditingId(null)
      } else {
        const { error: loErr } = await supabase.from('loved_ones').update({
          full_name: form.full_name.trim(),
          relationship: form.relationship || null,
          city: form.city.trim() || null,
          phone_number: form.phone_number.trim() || null,
        }).eq('id', id)
        if (loErr) throw loErr

        const epData = {
          loved_one_id: id,
          age: form.age ? parseInt(form.age, 10) : null,
          address: form.address.trim(),
          medical_conditions: form.medical_conditions.trim() || null,
          current_medications: meds.length ? meds : [],
          allergies: form.allergies.trim() || null,
          doctor_name: form.doctor_name.trim() || null,
          doctor_phone: form.doctor_phone.trim() || null,
          emergency_contacts: ecs,
          photo_consent: form.photo_consent,
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
        full_name: profileForm.full_name.trim() || null,
        whatsapp_number: profileForm.whatsapp_number.trim(),
        country: profileForm.country.trim() || null,
      }).eq('id', user.id)
      if (error) throw error
      setAccountOk(true); setEditingAccount(false)
    } catch {
      setAccountErr('Could not save — please try again.')
    } finally {
      setSavingAccount(false)
    }
  }

  // ── JSX ───────────────────────────────────────────────────────────────

  const isFounder = !!profile?.is_founding_member

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 24 }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0E2A1F, #1B4332)', padding: '28px 20px', textAlign: 'center' }}>
        <span style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid var(--sage)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>
          {initials(profile?.full_name)}
        </span>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '12px 0 0' }}>{profile?.full_name || 'Your account'}</p>
        <p style={{ fontSize: 14, color: 'var(--sage)', margin: '2px 0 0' }}>
          {isNri ? `${lovedOnes.length || ''} parent${lovedOnes.length !== 1 ? 's' : ''} in care` : [society?.flat_number, society?.society_name].filter(Boolean).join(' · ') || 'Society Member'}
        </p>
        {isFounder && (
          <span style={{ display: 'inline-block', marginTop: 10, background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '4px 14px', fontSize: 11, fontWeight: 700 }}>
            ★ Founding Member{profile?.founding_number ? ` #${String(profile.founding_number).padStart(4, '0')}` : ''}
          </span>
        )}
      </div>

      {isNri ? (
        <>
          {/* ── Family Members ──────────────────────────────────── */}
          <div style={{ margin: '20px 16px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-mid)', letterSpacing: '0.08em', margin: '0 0 10px' }}>FAMILY MEMBERS</p>

            {lovedOnes.map(lo => {
              const ep = elderProfiles[lo.id]
              const isEditing = editingId === lo.id
              const form = forms[lo.id]
              const meds: string[] = Array.isArray(ep?.current_medications) ? ep.current_medications.map(medLabel).filter(Boolean) : []
              const contacts: Contact[] = Array.isArray(ep?.emergency_contacts) ? ep.emergency_contacts : []
              return (
                <div key={lo.id} style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)', marginBottom: 12 }}>
                  {/* Card header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isEditing ? 16 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--black)', margin: 0 }}>{lo.full_name}</p>
                        {lo.relationship && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--forest)', background: 'rgba(14,42,31,0.07)', borderRadius: 100, padding: '2px 10px' }}>{lo.relationship}</span>
                        )}
                      </div>
                      {!isEditing && (
                        <p style={{ fontSize: 13, color: 'var(--gray-mid)', margin: '4px 0 0' }}>
                          {[lo.city && `📍 ${lo.city}`, ep?.age && `${ep.age} yrs`, lo.phone_number && `📞 ${lo.phone_number}`].filter(Boolean).join(' · ') || 'No details yet'}
                        </p>
                      )}
                    </div>
                    {!isEditing ? (
                      <button onClick={() => startEdit(lo.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--gray-light)', borderRadius: 100, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'var(--forest)', cursor: 'pointer', flexShrink: 0 }}>
                        <Edit2 size={11} /> Edit
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={cancelEdit} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--gray-light)', borderRadius: 100, padding: '7px 14px', fontSize: 12, fontWeight: 500, color: 'var(--gray-dark)', cursor: 'pointer' }}>
                          <X size={11} /> Cancel
                        </button>
                        <button onClick={() => saveMember(lo.id)} disabled={savingId === lo.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--forest)', border: 'none', borderRadius: 100, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: savingId === lo.id ? 0.6 : 1 }}>
                          <Save size={11} /> {savingId === lo.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit form */}
                  {isEditing && form && (
                    <>
                      <MemberFormFields form={form} setForm={fn => setMemberForm(lo.id, fn)} />
                      {memberErrs[lo.id] && <p style={{ fontSize: 13, color: '#b42318', marginTop: 10 }}>{memberErrs[lo.id]}</p>}
                    </>
                  )}

                  {/* View: health + contacts summary */}
                  {!isEditing && (ep?.medical_conditions || meds.length || contacts.length) ? (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-light)' }}>
                      {ep?.medical_conditions && (
                        <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '0 0 2px' }}>
                          <span style={{ fontWeight: 600 }}>Conditions:</span> {ep.medical_conditions}
                        </p>
                      )}
                      {meds.length > 0 && (
                        <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '0 0 2px' }}>
                          <span style={{ fontWeight: 600 }}>Medications:</span> {meds.join(', ')}
                        </p>
                      )}
                      {contacts.length > 0 && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                          {contacts.map((c, i) => c.phone && (
                            <a key={i} href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--forest)', textDecoration: 'none' }}>
                              <Phone size={12} /> {c.name || `EC${i + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {memberOk[lo.id] && !isEditing && (
                    <p style={{ fontSize: 12, color: 'var(--forest)', marginTop: 8 }}>✓ Saved</p>
                  )}
                </div>
              )
            })}

            {/* Add new member form */}
            {editingId === 'new' && forms.new && (
              <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--black)', margin: 0 }}>Add family member</p>
                  <button onClick={cancelEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-mid)' }}><X size={18} /></button>
                </div>
                <MemberFormFields form={forms.new} setForm={fn => setMemberForm('new', fn)} />
                {memberErrs.new && <p style={{ fontSize: 13, color: '#b42318', marginTop: 10 }}>{memberErrs.new}</p>}
                <button
                  onClick={() => saveMember('new')}
                  disabled={savingId === 'new'}
                  style={{ marginTop: 16, width: '100%', background: 'var(--forest)', color: '#fff', border: 'none', borderRadius: 'var(--radius-btn)', padding: '13px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: savingId === 'new' ? 0.6 : 1 }}
                >
                  {savingId === 'new' ? 'Adding…' : 'Add family member →'}
                </button>
              </div>
            )}

            {/* Add button — shown when not in add mode */}
            {editingId !== 'new' && (
              <button
                onClick={startAddNew}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: '1.5px dashed var(--gray-light)', borderRadius: 'var(--radius-card)', padding: '14px 20px', fontSize: 14, fontWeight: 600, color: 'var(--forest)', cursor: 'pointer', justifyContent: 'center' }}
              >
                <Plus size={16} /> Add family member
              </button>
            )}
          </div>

          {/* ── My Account ─────────────────────────────────────── */}
          <div style={{ margin: '20px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', margin: 0 }}>My Account</p>
              {!editingAccount ? (
                <button onClick={() => { setEditingAccount(true); setAccountOk(false) }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--gray-light)', borderRadius: 100, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'var(--forest)', cursor: 'pointer' }}>
                  <Edit2 size={11} /> Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditingAccount(false); setAccountErr('') }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--gray-light)', borderRadius: 100, padding: '7px 14px', fontSize: 12, color: 'var(--gray-dark)', cursor: 'pointer' }}>
                    <X size={11} /> Cancel
                  </button>
                  <button onClick={saveAccount} disabled={savingAccount} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--forest)', border: 'none', borderRadius: 100, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: savingAccount ? 0.6 : 1 }}>
                    <Save size={11} /> {savingAccount ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            {editingAccount ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div><label style={LABEL}>Your name</label><input style={INPUT} value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" /></div>
                <div><label style={LABEL}>Email</label><input style={{ ...INPUT, opacity: 0.55, cursor: 'not-allowed' }} value={user?.email || ''} disabled /></div>
                <div><label style={LABEL}>WhatsApp number *</label><input style={INPUT} value={profileForm.whatsapp_number} onChange={e => setProfileForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="+91 98765 43210" /></div>
                <div><label style={LABEL}>Where you live</label><input style={INPUT} value={profileForm.country} onChange={e => setProfileForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. USA, UK, UAE or city in India" /></div>
                {accountErr && <p style={{ fontSize: 13, color: '#b42318' }}>{accountErr}</p>}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 0 }}>
                {[['Email', user?.email || ''], ['WhatsApp', profile?.whatsapp_number || '—'], ['Location', profile?.country || '—']].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-mid)' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{value}</span>
                  </div>
                ))}
                {accountOk && <p style={{ fontSize: 12, color: 'var(--forest)', marginTop: 8 }}>✓ Saved</p>}
              </div>
            )}
          </div>

          {/* ── Membership & Receipts ─────────────────────────── */}
          {isFounder && (
            <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ background: 'linear-gradient(135deg, #0E2A1F, #1B4332)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>★ Founding Member</span>
                {membership?.status === 'active' && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--forest)', background: 'var(--sage)', borderRadius: 100, padding: '3px 10px' }}>Active</span>
                )}
              </div>
              <div>
                {[
                  ['Member number', profile?.founding_number ? `#${String(profile.founding_number).padStart(4, '0')}` : ''],
                  ['Member since', fmt(membership?.activated_at || (profile as any)?.founding_date)],
                  ['Plan', 'Founding Membership · ₹100 one-time'],
                  ['Payment ID', membership?.razorpay_payment_id || ''],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ padding: '13px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--gray-mid)', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
                  </div>
                ))}
                {membership?.razorpay_payment_id && (
                  <div style={{ padding: '14px 20px' }}>
                    <a
                      href={`https://wa.me/919000221261?text=Hi%2C+I%27d+like+an+invoice+for+my+Founding+Membership+%28Payment+ID%3A+${membership.razorpay_payment_id}%29`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', textDecoration: 'none' }}
                    >
                      Request invoice →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <Section title="My Society" rows={[['Society', society?.society_name || ''], ['Flat', society?.flat_number || ''], ['Area', society?.area || '']]} />
          <Section title="My Membership" rows={[['Plan', 'Founding Member'], ['Fee', '₹100 — one-time'], ['Member ID', society?.member_id || '']]} />
          <Section title="Contact" rows={[['Email', user?.email || ''], ['WhatsApp', profile?.whatsapp_number || '']]} />
        </>
      )}

      <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '24px auto 0', background: 'none', border: '1px solid var(--gray-light)', borderRadius: 'var(--radius-btn)', padding: '12px 24px', fontSize: 14, fontWeight: 500, color: 'var(--gray-dark)', cursor: 'pointer' }}>
        <LogOut size={16} /> Sign out
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--gray-mid)', padding: '12px 24px 0', lineHeight: 1.5 }}>
        Your family's information is private, encrypted, and used only to provide care.
      </p>
    </div>
  )
}
