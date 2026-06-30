import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Phone, Edit2, Save, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

function initials(name?: string | null) {
  return (name || 'CE').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  const shown = rows.filter(([, v]) => v && v.trim())
  if (!shown.length) return null
  return (
    <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-light)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)' }}>{title}</span>
      </div>
      {shown.map(([label, value]) => (
        <div key={label} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-mid)', flexShrink: 0 }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)', textAlign: 'right' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

interface Contact { name?: string; relation?: string; relationship?: string; phone?: string }
interface Med { name?: string; timing?: string; dose?: string }

// deno-lint-ignore no-explicit-any
function medLabel(m: any): string {
  if (typeof m === 'string') return m
  const mm = m as Med
  return [mm.name, mm.timing || mm.dose].filter(Boolean).join(' · ')
}

const INPUT: React.CSSProperties = {
  width: '100%',
  background: 'var(--cream)',
  border: '1px solid var(--gray-light)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--gray-mid)',
  marginBottom: 4,
}

export function DashboardProfile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const isNri = profile?.user_type === 'nri'

  // deno-lint-ignore no-explicit-any
  const [elder, setElder] = useState<any>(null)
  const [society, setSociety] = useState<{ society_name?: string; flat_number?: string; area?: string; member_id?: string } | null>(null)
  const [lovedOneId, setLovedOneId] = useState<string | null>(null)
  const [elderProfileId, setElderProfileId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [saveOk, setSaveOk] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [photoConsent, setPhotoConsent] = useState(false)

  const [form, setForm] = useState({
    loved_one_name: '',
    address: '',
    age: '',
    medical_conditions: '',
    medications_text: '',
    allergies: '',
    doctor_name: '',
    doctor_phone: '',
    ec1_name: '', ec1_relationship: '', ec1_phone: '',
    ec2_name: '', ec2_relationship: '', ec2_phone: '',
  })

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    whatsapp_number: '',
    country: '',
  })

  useEffect(() => {
    if (!user) return
    setProfileForm({
      full_name: profile?.full_name || '',
      whatsapp_number: profile?.whatsapp_number || '',
      country: profile?.country || '',
    })
    if (isNri) {
      ;(async () => {
        const { data: lo } = await supabase.from('loved_ones').select('id, full_name, relationship').eq('family_user_id', user.id).order('created_at').limit(1).maybeSingle()
        if (!lo?.id) return
        setLovedOneId(lo.id)
        const { data: ep } = await supabase.from('elder_profiles').select('*').eq('loved_one_id', lo.id).maybeSingle()
        setElderProfileId(ep?.id || null)
        setElder({ ...ep, full_name: lo.full_name, relationship: lo.relationship })
        const contacts: Contact[] = Array.isArray(ep?.emergency_contacts) ? ep.emergency_contacts : []
        setForm({
          loved_one_name: lo.full_name || '',
          address: ep?.address || '',
          age: ep?.age ? String(ep.age) : '',
          medical_conditions: ep?.medical_conditions || '',
          medications_text: Array.isArray(ep?.current_medications) ? ep.current_medications.map(medLabel).join(', ') : '',
          allergies: ep?.allergies || '',
          doctor_name: ep?.doctor_name || '',
          doctor_phone: ep?.doctor_phone || '',
          ec1_name: contacts[0]?.name || '',
          ec1_relationship: contacts[0]?.relationship || contacts[0]?.relation || '',
          ec1_phone: contacts[0]?.phone || '',
          ec2_name: contacts[1]?.name || '',
          ec2_relationship: contacts[1]?.relationship || contacts[1]?.relation || '',
          ec2_phone: contacts[1]?.phone || '',
        })
        setPhotoConsent(ep?.photo_consent ?? false)
      })()
    } else {
      supabase.from('society_members').select('society_name, flat_number, area, member_id').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => setSociety(data))
    }
  }, [user, isNri, profile])

  async function handleSignOut() { await signOut(); window.location.replace('/auth') }

  async function handleSave() {
    if (!lovedOneId || !user) return
    if (!form.loved_one_name.trim()) { setSaveErr('Parent name is required.'); return }
    if (!form.address.trim()) { setSaveErr('Address is required.'); return }
    if (!profileForm.whatsapp_number.trim()) { setSaveErr('WhatsApp number is required.'); return }
    const needsConsent = !!(form.medical_conditions.trim() || form.medications_text.trim())
    if (needsConsent && !consentChecked) { setSaveErr('Please check the consent box before saving health details.'); return }
    setSaving(true); setSaveErr(''); setSaveOk(false)
    try {

    const { error: loErr } = await supabase.from('loved_ones').update({ full_name: form.loved_one_name.trim() }).eq('id', lovedOneId)
    if (loErr) throw loErr

    const ec: Contact[] = []
    if (form.ec1_name.trim()) ec.push({ name: form.ec1_name.trim(), relationship: form.ec1_relationship.trim(), phone: form.ec1_phone.trim() })
    if (form.ec2_name.trim()) ec.push({ name: form.ec2_name.trim(), relationship: form.ec2_relationship.trim(), phone: form.ec2_phone.trim() })

    const meds = form.medications_text.split(',').map(s => s.trim()).filter(Boolean)

    const elderData = {
      loved_one_id: lovedOneId,
      address: form.address.trim(),
      age: form.age ? parseInt(form.age, 10) : null,
      medical_conditions: form.medical_conditions.trim() || null,
      current_medications: meds.length ? meds : null,
      allergies: form.allergies.trim() || null,
      doctor_name: form.doctor_name.trim() || null,
      doctor_phone: form.doctor_phone.trim() || null,
      emergency_contacts: ec.length ? ec : null,
      photo_consent: photoConsent,
    }

    if (elderProfileId) {
      const { error: epErr } = await supabase.from('elder_profiles').update(elderData).eq('id', elderProfileId)
      if (epErr) throw epErr
    } else {
      const { data: newEp, error: epErr } = await supabase.from('elder_profiles').insert(elderData).select('id').single()
      if (epErr) throw epErr
      if (newEp?.id) setElderProfileId(newEp.id)
    }

    const { error: profErr } = await supabase.from('profiles').update({
      full_name: profileForm.full_name.trim() || null,
      whatsapp_number: profileForm.whatsapp_number.trim(),
      country: profileForm.country.trim() || null,
    }).eq('id', user.id)
    if (profErr) throw profErr

    // deno-lint-ignore no-explicit-any
    setElder((prev: any) => ({
      ...prev,
      full_name: form.loved_one_name.trim(),
      address: form.address.trim(),
      age: form.age ? parseInt(form.age, 10) : prev?.age,
    }))
    setSaving(false); setSaveOk(true); setEditing(false); setConsentChecked(false)
    } catch (err) {
      console.error('[Profile] save failed:', err)
      setSaveErr('Could not save — please try again.')
      setSaving(false)
    }
  }

  const meds: string[] = Array.isArray(elder?.current_medications) ? elder.current_medications.map(medLabel).filter(Boolean) : []
  const contacts: Contact[] = Array.isArray(elder?.emergency_contacts) ? elder.emergency_contacts : []

  return (
    <div className="ce-slide-up" style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0E2A1F, #1B4332)', padding: '28px 20px', textAlign: 'center' }}>
        <span style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid var(--sage)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>
          {initials(isNri ? elder?.full_name || profile?.full_name : profile?.full_name)}
        </span>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '12px 0 0' }}>{isNri ? (elder?.full_name || profile?.full_name || 'Your loved one') : (profile?.full_name || 'Your account')}</p>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage)', margin: '2px 0 0' }}>
          {isNri ? [elder?.age ? `${elder.age} yrs` : '', elder?.address?.split(',').slice(-1)[0]?.trim()].filter(Boolean).join(' · ') || 'Cared for by Close Eye' : [society?.flat_number, society?.society_name].filter(Boolean).join(' · ') || 'Society Member'}
        </p>
        <span style={{ display: 'inline-block', marginTop: 10, background: 'var(--sage)', color: 'var(--forest)', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 600 }}>
          {isNri ? 'Companion Family' : `Founding Member${society?.member_id ? ` · ${society.member_id}` : ''}`}
        </span>
      </div>

      {isNri ? (
        <>
          {/* Edit / Save controls */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
            {!editing ? (
              <button onClick={() => { setEditing(true); setSaveOk(false) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--gray-light)', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--forest)', cursor: 'pointer' }}>
                <Edit2 size={13} /> Edit profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditing(false); setSaveErr('') }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--gray-light)', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--gray-dark)', cursor: 'pointer' }}>
                  <X size={13} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--forest)', border: 'none', borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                  <Save size={13} /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {saveOk && <p style={{ fontSize: 13, color: 'var(--forest)', textAlign: 'center', margin: '8px 16px 0' }}>✓ Profile updated</p>}
          {saveErr && <p style={{ fontSize: 13, color: '#b42318', textAlign: 'center', margin: '8px 16px 0' }}>{saveErr}</p>}

          {editing ? (
            <>
              {/* My Parent */}
              <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid var(--gray-light)' }}>My Parent</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                  <div>
                    <label style={LABEL}>Name *</label>
                    <input style={INPUT} value={form.loved_one_name} onChange={e => setForm(f => ({ ...f, loved_one_name: e.target.value }))} placeholder="Parent's full name" />
                  </div>
                  <div>
                    <label style={LABEL}>Address *</label>
                    <input style={INPUT} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address in Hyderabad" />
                  </div>
                  <div>
                    <label style={LABEL}>Age</label>
                    <input style={INPUT} type="number" min={1} max={120} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="Age" />
                  </div>
                  <div>
                    <label style={LABEL}>Health conditions (optional)</label>
                    <input style={INPUT} value={form.medical_conditions} onChange={e => setForm(f => ({ ...f, medical_conditions: e.target.value }))} placeholder="e.g. Diabetes, Hypertension" />
                  </div>
                  <div>
                    <label style={LABEL}>Medications (optional — comma-separated)</label>
                    <input style={INPUT} value={form.medications_text} onChange={e => setForm(f => ({ ...f, medications_text: e.target.value }))} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" />
                  </div>
                  <div>
                    <label style={LABEL}>Allergies (optional)</label>
                    <input style={INPUT} value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="e.g. Penicillin" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={LABEL}>Doctor's name (optional)</label>
                      <input style={INPUT} value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} placeholder="Dr. Name" />
                    </div>
                    <div>
                      <label style={LABEL}>Doctor's phone (optional)</label>
                      <input style={INPUT} value={form.doctor_phone} onChange={e => setForm(f => ({ ...f, doctor_phone: e.target.value }))} placeholder="+91..." />
                    </div>
                  </div>
                </div>

                {!!(form.medical_conditions.trim() || form.medications_text.trim()) && (
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16, cursor: 'pointer' }}>
                    <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--gray-mid)', lineHeight: 1.5 }}>
                      I consent to Close Eye storing and using this health information solely to coordinate care visits for my family member.
                    </span>
                  </label>
                )}

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={photoConsent} onChange={e => setPhotoConsent(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--gray-mid)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--black)' }}>Photo updates</strong> — allow the companion to include a photo in the WhatsApp visit report.
                    Photos are only shared with you and stored securely.
                  </span>
                </label>
              </div>

              {/* Emergency Contacts */}
              <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid var(--gray-light)' }}>Emergency Contacts</p>
                {([
                  { label: 'Contact 1', nameKey: 'ec1_name', relKey: 'ec1_relationship', phoneKey: 'ec1_phone' },
                  { label: 'Contact 2 (optional)', nameKey: 'ec2_name', relKey: 'ec2_relationship', phoneKey: 'ec2_phone' },
                ] as { label: string; nameKey: keyof typeof form; relKey: keyof typeof form; phoneKey: keyof typeof form }[]).map(({ label, nameKey, relKey, phoneKey }, i, arr) => (
                  <div key={nameKey} style={{ marginBottom: i < arr.length - 1 ? 20 : 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-mid)', margin: '0 0 10px' }}>{label}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={LABEL}>Name</label>
                        <input style={INPUT} value={form[nameKey]} onChange={e => setForm(f => ({ ...f, [nameKey]: e.target.value }))} placeholder="Full name" />
                      </div>
                      <div>
                        <label style={LABEL}>Relationship</label>
                        <input style={INPUT} value={form[relKey]} onChange={e => setForm(f => ({ ...f, [relKey]: e.target.value }))} placeholder="e.g. Son" />
                      </div>
                    </div>
                    <div>
                      <label style={LABEL}>Phone</label>
                      <input style={INPUT} value={form[phoneKey]} onChange={e => setForm(f => ({ ...f, [phoneKey]: e.target.value }))} placeholder="+91..." />
                    </div>
                  </div>
                ))}
              </div>

              {/* My Account */}
              <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', padding: 20, boxShadow: 'var(--shadow-card)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--black)', margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid var(--gray-light)' }}>My Account</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                  <div>
                    <label style={LABEL}>Your name</label>
                    <input style={INPUT} value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" />
                  </div>
                  <div>
                    <label style={LABEL}>Email</label>
                    <input style={{ ...INPUT, opacity: 0.55, cursor: 'not-allowed' }} value={user?.email || ''} disabled />
                  </div>
                  <div>
                    <label style={LABEL}>WhatsApp number *</label>
                    <input style={INPUT} value={profileForm.whatsapp_number} onChange={e => setProfileForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label style={LABEL}>Country</label>
                    <input style={INPUT} value={profileForm.country} onChange={e => setProfileForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. USA, UK, UAE" />
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 11, color: 'var(--gray-mid)', textAlign: 'center', padding: '12px 24px 0', lineHeight: 1.5 }}>
                Your family's information is private, encrypted, and used only to provide care.
              </p>
            </>
          ) : (
            <>
              <Section title="Health Information" rows={[
                ['Conditions', elder?.medical_conditions || ''],
                ['Medications', meds.join(', ')],
                ['Allergies', elder?.allergies || ''],
                ['Doctor', [elder?.doctor_name, elder?.doctor_phone].filter(Boolean).join(' · ')],
              ]} />
              <Section title="Preferences" rows={[
                ['Food', elder?.food_preferences || ''],
                ['Enjoys talking about', elder?.conversation_interests || ''],
                ['Things to avoid', elder?.things_to_avoid || ''],
                ['Daily routine', elder?.daily_routine || ''],
              ]} />
              {contacts.length > 0 && (
                <div style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-light)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Emergency Contacts</span>
                  </div>
                  {contacts.map((c, i) => (
                    <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--black)', margin: 0 }}>{c.name || 'Contact'}</p>
                        <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: 0 }}>{c.relation || c.relationship || ''}</p>
                      </div>
                      {c.phone && <a href={`tel:${c.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: 'var(--forest)', textDecoration: 'none' }}><Phone size={14} /> Call</a>}
                    </div>
                  ))}
                </div>
              )}
              <Section title="My Plan" rows={[['Account', 'Family'], ['Relationship', elder?.relationship || ''], ['Country', profile?.country || '']]} />
            </>
          )}
        </>
      ) : (
        <>
          <Section title="My Society" rows={[['Society', society?.society_name || ''], ['Flat', society?.flat_number || ''], ['Area', society?.area || '']]} />
          <Section title="My Membership" rows={[['Plan', 'Founding Member'], ['Fee', '₹100 — one-time'], ['Member ID', society?.member_id || '']]} />
          <Section title="Contact" rows={[['Email', user?.email || ''], ['WhatsApp', profile?.whatsapp_number || '']]} />
        </>
      )}

      <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '20px auto 0', background: 'none', border: '1px solid var(--gray-light)', borderRadius: 'var(--radius-btn)', padding: '12px 24px', fontSize: 14, fontWeight: 500, color: 'var(--gray-dark)', cursor: 'pointer' }}>
        <LogOut size={16} /> Sign out
      </button>
    </div>
  )
}
