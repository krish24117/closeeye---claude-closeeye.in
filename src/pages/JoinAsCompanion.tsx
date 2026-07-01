import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Upload, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

// ── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Urdu', 'Marathi']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GENDERS = ['Male', 'Female', 'Other']
const AVAILABILITY = ['Full-time', 'Part-time', 'Weekends only']
const HOURS = ['1–2', '3–4', '5–6', 'Flexible']

const MAX_FILE_BYTES = 5 * 1024 * 1024

interface Form {
  full_name: string
  age: string
  gender: string
  phone: string
  email: string
  area: string
  languages: string[]
  current_occupation: string
  caregiving_experience: string
  motivation: string
  has_elderly_family: boolean | null
  elderly_family_details: string
  availability_type: string
  days_available: string[]
  hours_per_day: string
  can_travel: boolean
  ref1_name: string
  ref1_phone: string
  ref1_relation: string
  ref2_name: string
  ref2_phone: string
  ref2_relation: string
}

const EMPTY_FORM: Form = {
  full_name: '', age: '', gender: '', phone: '', email: '', area: '',
  languages: [], current_occupation: '', caregiving_experience: '', motivation: '',
  has_elderly_family: null, elderly_family_details: '',
  availability_type: '', days_available: [], hours_per_day: '', can_travel: true,
  ref1_name: '', ref1_phone: '', ref1_relation: '',
  ref2_name: '', ref2_phone: '', ref2_relation: '',
}

// ── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--gray-dark)', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: 16,
  border: '1px solid var(--gray-light)', borderRadius: 10,
  background: 'var(--white)', fontFamily: 'inherit', boxSizing: 'border-box',
}
const textareaStyle: React.CSSProperties = { ...inputStyle, minHeight: 90, resize: 'vertical' }
const fieldWrap: React.CSSProperties = { marginBottom: 18 }
const req = <span style={{ color: '#b42318' }}> *</span>

// ── Small UI helpers ─────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 100, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
      border: active ? '1px solid var(--forest)' : '1px solid var(--gray-light)',
      background: active ? 'rgba(14,42,31,0.04)' : 'var(--white)',
      color: active ? 'var(--forest)' : 'var(--gray-dark)',
      fontWeight: active ? 600 : 400, transition: 'all 150ms',
    }}>{label}</button>
  )
}

function RadioCard({ label, active, onClick, flex }: { label: string; active: boolean; onClick: () => void; flex?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: flex ? 1 : undefined, padding: '12px 16px', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer',
      border: active ? '1px solid var(--forest)' : '1px solid var(--gray-light)',
      background: active ? 'rgba(14,42,31,0.04)' : 'var(--white)',
      color: active ? 'var(--forest)' : 'var(--gray-dark)',
      fontWeight: active ? 600 : 400, transition: 'all 150ms', textAlign: 'center',
    }}>{label}</button>
  )
}

function UploadTile({ label, file, onPick }: { label: string; file: File | null; onPick: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div style={fieldWrap}>
      <button type="button" onClick={() => ref.current?.click()} style={{
        width: '100%', padding: '18px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
        border: file ? '1.5px solid var(--forest)' : '1.5px dashed var(--gray-light)',
        background: file ? 'rgba(14,42,31,0.04)' : 'var(--white)',
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
      }}>
        {file
          ? <Check size={22} color="var(--forest)" style={{ flexShrink: 0 }} />
          : <Upload size={22} color="var(--gray-mid)" style={{ flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)' }}>{label}</div>
          <div style={{ fontSize: 12, color: file ? 'var(--forest)' : 'var(--gray-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file ? file.name : 'Tap to upload (image or PDF)'}
          </div>
        </div>
      </button>
      <input ref={ref} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
        onChange={e => onPick(e.target.files?.[0] || null)} />
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function JoinAsCompanionPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [aadhaar, setAadhaar] = useState<File | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [police, setPolice] = useState<File | null>(null)

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [step, done])

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }
  function toggleArray(key: 'languages' | 'days_available', value: string) {
    setForm(prev => {
      const arr = prev[key]
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }

  function pickFile(setter: (f: File | null) => void) {
    return (f: File | null) => {
      if (f && f.size > MAX_FILE_BYTES) { showToast('File must be 5MB or smaller.', 'error'); return }
      setter(f)
    }
  }

  function back() {
    if (step === 1) { navigate('/companions'); return }
    setStep(s => s - 1)
  }

  function validateAndNext() {
    if (step === 1) {
      if (!form.full_name.trim()) return showToast('Please enter your full name.', 'error')
      if (!form.age) return showToast('Please enter your age.', 'error')
      if (+form.age < 21 || +form.age > 65) return showToast('Age must be between 21 and 65.', 'error')
      if (!form.gender) return showToast('Please select your gender.', 'error')
      if (!form.phone.trim()) return showToast('Please enter your phone number.', 'error')
    }
    if (step === 2) {
      if (!form.motivation.trim()) return showToast('Please tell us why you want to do this.', 'error')
    }
    setStep(s => s + 1)
  }

  async function uploadFile(file: File | null, field: string): Promise<string | null> {
    if (!file) return null
    const path = `${Date.now()}-${field}-${file.name}`
    const { data, error } = await supabase.storage.from('companion-applications').upload(path, file)
    if (error || !data) { showToast(`Couldn't upload ${field.replace('_', ' ')}. Continuing without it.`, 'error'); return null }
    return data.path
  }

  async function submit() {
    setSubmitting(true)
    try {
      const aadhaar_url = await uploadFile(aadhaar, 'aadhaar')
      const photo_url = await uploadFile(photo, 'photo')
      const police_clearance_url = await uploadFile(police, 'police')

      const { error } = await supabase.from('companion_applications').insert({
        full_name: form.full_name.trim(),
        age: form.age ? +form.age : null,
        gender: form.gender || null,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        area: form.area.trim() || null,
        languages: form.languages,
        current_occupation: form.current_occupation.trim() || null,
        caregiving_experience: form.caregiving_experience.trim() || null,
        motivation: form.motivation.trim(),
        has_elderly_family: form.has_elderly_family,
        elderly_family_details: form.has_elderly_family ? (form.elderly_family_details.trim() || null) : null,
        availability_type: form.availability_type || null,
        days_available: form.days_available,
        hours_per_day: form.hours_per_day || null,
        can_travel: form.can_travel !== false,
        ref1_name: form.ref1_name.trim() || null,
        ref1_phone: form.ref1_phone.trim() || null,
        ref1_relation: form.ref1_relation.trim() || null,
        ref2_name: form.ref2_name.trim() || null,
        ref2_phone: form.ref2_phone.trim() || null,
        ref2_relation: form.ref2_relation.trim() || null,
        aadhaar_url, photo_url, police_clearance_url,
      })
      if (error) { showToast(error.message, 'error'); setSubmitting(false); return }
      setDone(true)
    } catch (e: any) {
      showToast(e?.message || 'Something went wrong. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────
  if (done) {
    const firstName = form.full_name.trim().split(' ')[0] || 'there'
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ maxWidth: 420, width: '100%', background: 'var(--white)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)', padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--sage)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Check size={38} color="var(--forest)" strokeWidth={3} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', margin: '0 0 12px' }}>Application received 🌿</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--gray-mid)', margin: '0 0 28px' }}>
            Thank you, {firstName}. Our team reads every application personally. If it's a fit, Aishwarya will call you within a few days.
          </p>
          <Link to="/companions" style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: 'var(--forest)', color: 'var(--white)', textDecoration: 'none', padding: 14, borderRadius: 'var(--radius-btn)', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Back to companions
          </Link>
          <Link to="/" style={{ display: 'inline-block', color: 'var(--gray-mid)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            Close Eye home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      {/* ── Sticky header ───────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10, background: 'var(--white)',
        borderBottom: '0.5px solid var(--gray-light)', padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button type="button" onClick={back} aria-label="Go back" style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--black)',
          }}>
            <ArrowLeft size={22} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Join as a companion
          </span>
        </div>

        <div style={{ display: 'flex', gap: 3, width: 160, flexShrink: 0 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: n <= step ? 'var(--forest)' : 'var(--gray-light)',
              transition: 'background 300ms, width 300ms',
            }} />
          ))}
        </div>

        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray-mid)', flexShrink: 0, marginLeft: 10 }}>
          Step {step} of 5
        </span>
      </header>

      {/* ── Form container ──────────────────────────────────── */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 20px' }}>

        {/* STEP 1 ── About you */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', margin: '0 0 4px' }}>Tell us about yourself</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 28px' }}>A few basics to get started.</p>

            <div style={fieldWrap}>
              <label style={labelStyle}>Full name{req}</label>
              <input style={inputStyle} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Age{req}</label>
              <input style={inputStyle} type="number" min={21} max={65} value={form.age} onChange={e => set('age', e.target.value)} placeholder="21–65" />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Gender{req}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {GENDERS.map(g => (
                  <RadioCard key={g} label={g} flex active={form.gender === g} onClick={() => set('gender', g)} />
                ))}
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Phone number{req}</label>
              <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
              <p style={{ fontSize: 12, color: 'var(--gray-mid)', margin: '6px 0 0' }}>Optional but helpful</p>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Area / locality</label>
              <input style={inputStyle} value={form.area} onChange={e => set('area', e.target.value)} placeholder="e.g. Banjara Hills, Hyderabad" />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Languages</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {LANGUAGES.map(l => (
                  <Chip key={l} label={l} active={form.languages.includes(l)} onClick={() => toggleArray('languages', l)} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* STEP 2 ── Experience */}
        {step === 2 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', margin: '0 0 4px' }}>Your experience</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 28px' }}>Tell us what you've done and why this matters to you.</p>

            <div style={fieldWrap}>
              <label style={labelStyle}>Current occupation</label>
              <input style={inputStyle} value={form.current_occupation} onChange={e => set('current_occupation', e.target.value)} placeholder="What do you do now?" />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Caregiving experience</label>
              <textarea style={textareaStyle} value={form.caregiving_experience} onChange={e => set('caregiving_experience', e.target.value)} placeholder="Any experience caring for elders, family or professional…" />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Why do you want to do this?{req}</label>
              <textarea style={textareaStyle} value={form.motivation} onChange={e => set('motivation', e.target.value)} placeholder="What draws you to caring for elders?" />
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Do you have elderly family you care for?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <RadioCard label="Yes" flex active={form.has_elderly_family === true} onClick={() => set('has_elderly_family', true)} />
                <RadioCard label="No" flex active={form.has_elderly_family === false} onClick={() => set('has_elderly_family', false)} />
              </div>
            </div>

            {form.has_elderly_family === true && (
              <div style={fieldWrap}>
                <label style={labelStyle}>Tell us about them</label>
                <textarea style={textareaStyle} value={form.elderly_family_details} onChange={e => set('elderly_family_details', e.target.value)} placeholder="Who do you care for at home?" />
              </div>
            )}
          </>
        )}

        {/* STEP 3 ── Availability */}
        {step === 3 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', margin: '0 0 4px' }}>Your availability</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 28px' }}>When can you visit families?</p>

            <div style={fieldWrap}>
              <label style={labelStyle}>Availability type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AVAILABILITY.map(a => (
                  <RadioCard key={a} label={a} active={form.availability_type === a} onClick={() => set('availability_type', a)} />
                ))}
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Days available</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DAYS.map(d => (
                  <Chip key={d} label={d} active={form.days_available.includes(d)} onClick={() => toggleArray('days_available', d)} />
                ))}
              </div>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Hours per day</label>
              <select style={inputStyle} value={form.hours_per_day} onChange={e => set('hours_per_day', e.target.value)}>
                <option value="">Select…</option>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div style={fieldWrap}>
              <label style={labelStyle}>Can you travel within the city?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <RadioCard label="Yes" flex active={form.can_travel === true} onClick={() => set('can_travel', true)} />
                <RadioCard label="No" flex active={form.can_travel === false} onClick={() => set('can_travel', false)} />
              </div>
            </div>
          </>
        )}

        {/* STEP 4 ── References */}
        {step === 4 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', margin: '0 0 4px' }}>References</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 28px' }}>Two people who can vouch for you. We'll call them.</p>

            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', margin: '0 0 12px' }}>Reference 1</p>
            <div style={fieldWrap}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={form.ref1_name} onChange={e => set('ref1_name', e.target.value)} placeholder="Their name" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} type="tel" value={form.ref1_phone} onChange={e => set('ref1_phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Relationship</label>
              <input style={inputStyle} value={form.ref1_relation} onChange={e => set('ref1_relation', e.target.value)} placeholder="e.g. Former employer" />
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest)', margin: '24px 0 12px' }}>Reference 2</p>
            <div style={fieldWrap}>
              <label style={labelStyle}>Name</label>
              <input style={inputStyle} value={form.ref2_name} onChange={e => set('ref2_name', e.target.value)} placeholder="Their name" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} type="tel" value={form.ref2_phone} onChange={e => set('ref2_phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Relationship</label>
              <input style={inputStyle} value={form.ref2_relation} onChange={e => set('ref2_relation', e.target.value)} placeholder="e.g. Neighbour" />
            </div>
          </>
        )}

        {/* STEP 5 ── Documents */}
        {step === 5 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--black)', margin: '0 0 4px' }}>Documents</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-mid)', margin: '0 0 28px' }}>Upload what you have. You can bring originals to the interview.</p>

            <UploadTile label="Aadhaar card" file={aadhaar} onPick={pickFile(setAadhaar)} />
            <UploadTile label="Your photo" file={photo} onPick={pickFile(setPhoto)} />
            <UploadTile label="Police clearance (optional)" file={police} onPick={pickFile(setPolice)} />

            <p style={{ fontSize: 12, color: 'var(--gray-mid)', lineHeight: 1.5, margin: '8px 0 0' }}>
              Your documents are stored securely and only seen by the Close Eye founding team.
            </p>
          </>
        )}

        {/* ── Navigation ────────────────────────────────────── */}
        <div style={{ marginTop: 28 }}>
          {step < 5 ? (
            <button type="button" onClick={validateAndNext} style={{
              background: 'var(--forest)', color: 'var(--white)', width: '100%', padding: 14,
              borderRadius: 'var(--radius-btn)', fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Continue →
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} style={{
              background: 'var(--forest)', color: 'var(--white)', width: '100%', padding: 14,
              borderRadius: 'var(--radius-btn)', fontSize: 16, fontWeight: 600, border: 'none',
              cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {submitting
                ? <><Loader2 size={18} className="ce-spin" style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                : 'Submit application'}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
