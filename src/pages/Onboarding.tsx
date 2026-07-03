import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'

// ── Brand tokens (matching reference design) ───────────────────────────────────
const T = {
  forest:  '#0E2A1F',
  forest2: '#163b2c',
  cream:   '#FAF7F2',
  cream2:  '#f1ece2',
  sage:    '#A8D5B5',
  sage2:   '#7FBF94',
  muted:   '#5c6b62',
  line:    '#e3ddd1',
  req:     '#c0734f',   // terracotta, not red
}

// ── localStorage ──────────────────────────────────────────────────────────────

const DRAFT_KEY     = 'ce_onboarding_draft'
const DISMISSED_KEY = 'ce_onboarding_dismissed'

interface Draft {
  step: 1 | 2 | 3
  s1: { name: string; whatsapp: string; country: string }
  s2: { lovedName: string; relationship: string; city: string; phone: string; age: string }
}

function loadDraft(userId?: string): Draft {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}_${userId || 'x'}`)
    if (raw) return JSON.parse(raw) as Draft
  } catch { /* ignore */ }
  return { step: 1, s1: { name: '', whatsapp: '', country: '' }, s2: { lovedName: '', relationship: '', city: '', phone: '', age: '' } }
}

function saveDraft(d: Partial<Draft>, userId?: string) {
  try {
    const cur = loadDraft(userId)
    localStorage.setItem(`${DRAFT_KEY}_${userId || 'x'}`, JSON.stringify({ ...cur, ...d }))
  } catch { /* ignore */ }
}

function clearDraft(userId?: string) {
  try { localStorage.removeItem(`${DRAFT_KEY}_${userId || 'x'}`) } catch { /* ignore */ }
}

export function markOnboardingDismissed() {
  try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* ignore */ }
}

export function isOnboardingDismissed() {
  try { return !!localStorage.getItem(DISMISSED_KEY) } catch { return false }
}

// ── Shared primitives ─────────────────────────────────────────────────────────

const inputStyle = (error?: string, focused?: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', fontSize: 14,
  padding: '12px 13px',
  border: `1px solid ${error ? T.req : focused ? T.sage2 : T.line}`,
  borderRadius: 11,
  background: '#fff', color: T.forest,
  outline: 'none',
  marginBottom: error ? 4 : 0,
  minHeight: 46,
  transition: 'border-color .15s',
})

function Field({
  id, label, required, optional, hint, prefill, error, children,
}: {
  id: string; label: string; required?: boolean; optional?: boolean
  hint?: string; prefill?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: hint || prefill || error ? 0 : 14 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: T.req }}> *</span>}
        {optional && <span style={{ color: T.muted, fontWeight: 500, fontSize: 12 }}> (optional)</span>}
      </label>
      {children}
      {prefill && <div style={{ fontSize: 11, color: '#2c6b43', background: '#eaf5ee', border: '1px solid #cfe6d7', display: 'inline-block', padding: '2px 8px', borderRadius: 999, marginBottom: 14, marginTop: 2 }}>{prefill}</div>}
      {error && <p role="alert" style={{ fontSize: 11.5, color: T.req, marginBottom: 14, marginTop: 4 }}>{error}</p>}
      {hint && !error && <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 14, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Inp({ id, error, ...rest }: { id: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      id={id}
      {...rest}
      aria-invalid={!!error}
      style={inputStyle(error, focused)}
      onFocus={e => { setFocused(true); rest.onFocus?.(e) }}
      onBlur={e => { setFocused(false); rest.onBlur?.(e) }}
    />
  )
}

function ErrBanner({ msg }: { msg: string }) {
  return (
    <div role="alert" style={{ background: '#FEF2F2', border: `1px solid ${T.req}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#8b2222' }}>
      {msg}
    </div>
  )
}

// ── Stepper ────────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div role="list" aria-label="Setup steps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0 4px' }}>
      {[1, 2, 3].map((n, i) => {
        const done   = n < step
        const active = n === step
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && (
              <div style={{ width: 26, height: 2, background: done || active ? T.sage2 : T.line, borderRadius: 2, transition: 'background .3s' }} />
            )}
            <div
              role="listitem"
              aria-current={active ? 'step' : undefined}
              style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 700,
                border: `1px solid ${done ? T.sage2 : active ? T.forest : T.line}`,
                background: done ? T.sage2 : active ? T.forest : T.cream2,
                color: done ? T.forest : active ? T.sage : T.muted,
                transition: 'all .3s',
              }}
            >
              {done ? '✓' : n}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1 — About you ────────────────────────────────────────────────────────

function Step1Body({ draft, onSave, saving, formErr }: {
  draft: Draft['s1']
  onSave: (d: Draft['s1']) => void
  saving: boolean
  formErr: string
}) {
  const { user, profile } = useAuth()
  const [name, setName] = useState(draft.name || profile?.full_name || '')
  const [whatsapp, setWhatsapp] = useState(draft.whatsapp || profile?.whatsapp_number || '')
  const [country, setCountry] = useState(draft.country || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Your name is required'
    if (!whatsapp.trim()) e.whatsapp = 'WhatsApp number is required'
    return e
  }

  function submit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({ name: name.trim(), whatsapp: whatsapp.trim(), country: country.trim() })
  }

  // Expose submit via ref trick — footer calls it
  useEffect(() => {
    (window as any).__ob_submit = submit
    return () => { delete (window as any).__ob_submit }
  })

  return (
    <div>
      <h2 style={{ fontSize: 23, letterSpacing: '-.01em', lineHeight: 1.12 }}>Tell us about yourself</h2>
      <p style={{ fontSize: 13, color: T.muted, marginTop: 5, marginBottom: 14 }}>
        So we can send visit updates directly to you.
      </p>

      {formErr && <ErrBanner msg={formErr} />}

      <Field id="ob-name" label="Your name" required error={errors.name}>
        <Inp id="ob-name" value={name} onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })) }} placeholder="e.g. Arjun Kumar" autoComplete="name" error={errors.name} />
      </Field>

      <Field id="ob-email" label="Email" prefill="✓ From your Google account">
        <input id="ob-email" value={user?.email || ''} readOnly style={{ ...inputStyle(), background: T.cream2, color: T.muted, opacity: 1, marginBottom: 0 }} />
      </Field>

      <Field id="ob-whatsapp" label="WhatsApp number" required hint="This is where you'll get visit updates and alerts." error={errors.whatsapp}>
        <Inp id="ob-whatsapp" type="tel" value={whatsapp} onChange={e => { setWhatsapp(e.target.value); setErrors(v => ({ ...v, whatsapp: '' })) }} placeholder="+65 9123 4567" autoComplete="tel" error={errors.whatsapp} />
      </Field>

      <Field id="ob-country" label="Where you live" optional hint="Helps us time calls to your timezone.">
        <Inp id="ob-country" value={country} onChange={e => setCountry(e.target.value)} placeholder="City, country — e.g. Singapore" autoComplete="country-name" />
      </Field>
    </div>
  )
}

// ── Step 2 — Your parent in India ─────────────────────────────────────────────

const RELS = ['Mother', 'Father', 'Grandparent', 'Other'] as const

function Step2Body({ draft, onSave, saving, formErr }: {
  draft: Draft['s2']
  onSave: (d: Draft['s2']) => void
  saving: boolean
  formErr: string
}) {
  const { user } = useAuth()
  const [lovedName, setLovedName] = useState(draft.lovedName || '')
  const [relationship, setRelationship] = useState(draft.relationship || '')
  const [city, setCity] = useState(draft.city || '')
  const [phone, setPhone] = useState(draft.phone || '')
  const [age, setAge] = useState(draft.age || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user || draft.lovedName) return
    supabase.from('loved_ones')
      .select('full_name,city,relationship,age,phone_number')
      .eq('family_user_id', user.id).limit(1).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        if (data.full_name) setLovedName(data.full_name)
        if (data.city) setCity(data.city)
        if (data.relationship) setRelationship(data.relationship)
        if (data.age != null) setAge(String(data.age))
        if (data.phone_number) setPhone(data.phone_number)
      })
  }, [user, draft.lovedName])

  function validate() {
    const e: Record<string, string> = {}
    if (!lovedName.trim()) e.lovedName = 'Their name is required'
    if (!relationship) e.relationship = 'Please choose your relationship'
    if (!city.trim()) e.city = 'City is required'
    return e
  }

  function submit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({ lovedName: lovedName.trim(), relationship, city: city.trim(), phone: phone.trim(), age: age.trim() })
  }

  useEffect(() => {
    (window as any).__ob_submit = submit
    return () => { delete (window as any).__ob_submit }
  })

  return (
    <div>
      <h2 style={{ fontSize: 23, letterSpacing: '-.01em', lineHeight: 1.12 }}>Tell us about your loved one</h2>
      <p style={{ fontSize: 13, color: T.muted, marginTop: 5, marginBottom: 14 }}>
        The person we'll be visiting on your behalf.
      </p>

      {formErr && <ErrBanner msg={formErr} />}

      <Field id="ob-loved-name" label="Their name" required error={errors.lovedName}>
        <Inp id="ob-loved-name" value={lovedName} onChange={e => { setLovedName(e.target.value); setErrors(v => ({ ...v, lovedName: '' })) }} placeholder="e.g. Kamala Kumar" error={errors.lovedName} />
      </Field>

      <div style={{ marginBottom: errors.relationship ? 0 : 14 }}>
        <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
          Your relationship <span style={{ color: T.req }}>*</span>
        </label>
        <div role="group" aria-label="Relationship" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: errors.relationship ? 4 : 14 }}>
          {RELS.map(r => (
            <button
              key={r}
              type="button"
              aria-pressed={relationship === r}
              onClick={() => { setRelationship(r); setErrors(v => ({ ...v, relationship: '' })) }}
              style={{
                fontSize: 13, fontWeight: 600, color: T.forest2,
                background: relationship === r ? T.sage : '#fff',
                border: `1px solid ${relationship === r ? T.sage2 : T.line}`,
                borderRadius: 999, padding: '9px 14px', cursor: 'pointer',
                minHeight: 44, fontFamily: 'inherit', transition: 'all .15s',
              }}
            >
              {r}
            </button>
          ))}
        </div>
        {errors.relationship && <p role="alert" style={{ fontSize: 11.5, color: T.req, marginBottom: 14 }}>{errors.relationship}</p>}
      </div>

      <Field id="ob-city" label="City in India" required hint="We currently serve Hyderabad — more cities coming soon." error={errors.city}>
        <Inp id="ob-city" value={city} onChange={e => { setCity(e.target.value); setErrors(v => ({ ...v, city: '' })) }} placeholder="e.g. Hyderabad" error={errors.city} />
      </Field>

      <Field id="ob-phone" label="Their phone" optional hint="">
        <Inp id="ob-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 ..." />
      </Field>

      <Field id="ob-age" label="Their age" optional hint="">
        <Inp id="ob-age" type="number" min={50} max={110} value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 72" />
      </Field>
    </div>
  )
}

// ── Step 3 — Confirm ──────────────────────────────────────────────────────────

function Step3Body({ s1, s2 }: { s1: Draft['s1']; s2: Draft['s2'] }) {
  const parentLabel = s2.relationship ? `your ${s2.relationship.toLowerCase()}` : 'your parent'
  return (
    <div>
      <h2 style={{ fontSize: 23, letterSpacing: '-.01em', lineHeight: 1.12 }}>One last check</h2>
      <p style={{ fontSize: 13, color: T.muted, marginTop: 5, marginBottom: 14 }}>
        Please confirm your details before we get started.
      </p>

      <div style={{ background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        {[
          ['You', s1.name],
          ['Updates to', 'WhatsApp'],
          ['Caring for', s2.lovedName || parentLabel],
          ['In', s2.city || 'India'],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '7px 0', borderBottom: `1px solid ${T.cream2}` }}>
            <span style={{ color: T.muted }}>{lbl}</span>
            <strong style={{ color: T.forest }}>{val}</strong>
          </div>
        ))}
      </div>

      <div style={{ background: `linear-gradient(100deg,${T.forest},${T.forest2})`, color: T.cream, borderRadius: 14, padding: '15px 16px', fontSize: 13, lineHeight: 1.5 }}>
        <strong style={{ color: T.sage2 }}>What happens next: </strong>
        our care team reaches out within 24–48 hours to set up your parent's care and answer any questions. You can add their health details any time from your dashboard.
      </div>
    </div>
  )
}

// ── Done ──────────────────────────────────────────────────────────────────────

function DoneScreen({ name }: { name: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '30px 10px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eaf5ee', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4 10-10" stroke="#2c6b43" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: T.forest, marginBottom: 8 }}>You're all set.</h2>
      <p style={{ fontSize: 14, color: T.muted, maxWidth: '30ch', marginInline: 'auto', lineHeight: 1.55 }}>
        Welcome to Close Eye, {name.split(' ')[0]}. Our team will reach out within 24–48 hours to schedule your first visit.
      </p>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<Draft>({ step: 1, s1: { name: '', whatsapp: '', country: '' }, s2: { lovedName: '', relationship: '', city: '', phone: '', age: '' } })
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load draft once user is known
  useEffect(() => {
    if (!user) return
    const d = loadDraft(user.id)
    setDraft(d)
    setStep(d.step as 1 | 2 | 3)
  }, [user?.id])

  useEffect(() => () => { if (doneTimerRef.current) clearTimeout(doneTimerRef.current) }, [])

  function goToDashboard() {
    markOnboardingDismissed()
    navigate('/dashboard', { replace: true })
  }

  function handleLater() { goToDashboard() }
  function handleClose() { goToDashboard() }

  // ── Step advance handlers ────────────────────────────────────────────────────

  async function handleStep1(s1: Draft['s1']) {
    setSaving(true); setFormErr('')
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: s1.name,
        whatsapp_number: s1.whatsapp,
        address: s1.country || null,
        user_type: 'nri',
      }).eq('id', user!.id)
      if (error) throw error
      const next: Draft = { ...draft, s1, step: 2 }
      setDraft(next)
      saveDraft(next, user!.id)
      setStep(2)
    } catch {
      setFormErr('Could not save — please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStep2(s2: Draft['s2']) {
    setSaving(true); setFormErr('')
    try {
      const payload = {
        full_name: s2.lovedName,
        relationship: s2.relationship || null,
        city: s2.city || null,
        phone_number: s2.phone || null,
        age: s2.age ? parseInt(s2.age, 10) : null,
      }
      const { data: existing } = await supabase.from('loved_ones')
        .select('id').eq('family_user_id', user!.id).limit(1).maybeSingle()
      if (existing) {
        const { error } = await supabase.from('loved_ones').update(payload).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('loved_ones').insert({ ...payload, family_user_id: user!.id })
        if (error) throw error
      }
      const next: Draft = { ...draft, s2, step: 3 }
      setDraft(next)
      saveDraft(next, user!.id)
      setStep(3)
    } catch {
      setFormErr('Could not save — please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleFinish() {
    clearDraft(user?.id)
    markOnboardingDismissed()
    setDone(true)
    doneTimerRef.current = setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
  }

  function handleContinue() {
    if (done) return
    if (step === 3) { handleFinish(); return }
    // Step 1 and 2 validate via the window global the step component registered
    const submit = (window as any).__ob_submit
    if (typeof submit === 'function') submit()
  }

  function goBack() {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading || (user && !profile)) {
    return (
      <div style={{ minHeight: '100svh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: T.forest }} />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />

  return (
    <div style={{
      minHeight: '100svh', display: 'flex', flexDirection: 'column',
      background: T.cream, paddingTop: 'env(safe-area-inset-top,0px)',
    }}>
      {/* ── Top chrome ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 4px', flexShrink: 0 }}>
        {/* Exit button */}
        {!done ? (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Exit to dashboard"
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: `1px solid ${T.line}`, background: '#fff',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              fontSize: 17, color: T.forest, minWidth: 44, minHeight: 44,
            }}
          >
            ✕
          </button>
        ) : <div style={{ width: 44 }} />}

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: T.forest }}>
          <Logo className="w-4 h-4" />
          Close Eye
        </div>

        {/* Step count */}
        {!done ? (
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, minWidth: 34, textAlign: 'right' }}>
            {step} / 3
          </div>
        ) : <div style={{ width: 34 }} />}
      </div>

      {/* ── Stepper ─────────────────────────────────────────────────────────── */}
      {!done && <Stepper step={step} />}

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 8px' }}>
        {done && <DoneScreen name={draft.s1.name || profile?.full_name || 'there'} />}

        {!done && step === 1 && (
          <Step1Body
            key="s1"
            draft={draft.s1}
            onSave={handleStep1}
            saving={saving}
            formErr={formErr}
          />
        )}
        {!done && step === 2 && (
          <Step2Body
            key="s2"
            draft={draft.s2}
            onSave={handleStep2}
            saving={saving}
            formErr={formErr}
          />
        )}
        {!done && step === 3 && (
          <Step3Body s1={draft.s1} s2={draft.s2} />
        )}
      </div>

      {/* ── Sticky footer ───────────────────────────────────────────────────── */}
      {!done && (
        <div style={{
          padding: '12px 20px',
          paddingBottom: `calc(18px + env(safe-area-inset-bottom,0px))`,
          borderTop: `1px solid ${T.line}`,
          background: T.cream,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                aria-label="Go back"
                style={{
                  flex: '0 0 auto', width: 54,
                  background: '#fff', border: `1px solid ${T.line}`,
                  color: T.forest, fontSize: 18,
                  borderRadius: 13, cursor: 'pointer',
                  fontFamily: 'inherit', minHeight: 52,
                  display: 'grid', placeItems: 'center',
                }}
              >
                ←
              </button>
            )}
            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              style={{
                flex: 1, fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                padding: '14px', borderRadius: 13, cursor: saving ? 'default' : 'pointer',
                border: 0, minHeight: 52,
                background: saving ? '#9CA3AF' : T.forest,
                color: T.cream,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Saving…' : step === 3 ? 'Finish' : 'Continue'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleLater}
            style={{
              display: 'block', width: '100%', textAlign: 'center',
              marginTop: 11, fontSize: 13, color: T.muted, fontWeight: 600,
              background: 'none', border: 0, cursor: 'pointer',
              fontFamily: 'inherit', minHeight: 44,
            }}
          >
            <u style={{ textDecoration: 'none', borderBottom: `1px solid ${T.line}`, paddingBottom: 1 }}>
              I'll do this later
            </u>
          </button>
        </div>
      )}

      {/* Done CTA */}
      {done && (
        <div style={{ padding: '12px 20px', paddingBottom: `calc(18px + env(safe-area-inset-bottom,0px))`, borderTop: `1px solid ${T.line}`, background: T.cream, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            style={{
              width: '100%', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
              padding: '14px', borderRadius: 13, cursor: 'pointer', border: 0, minHeight: 52,
              background: T.forest, color: T.cream,
            }}
          >
            Go to my dashboard
          </button>
        </div>
      )}
    </div>
  )
}
