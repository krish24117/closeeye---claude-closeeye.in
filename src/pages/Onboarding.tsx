import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { loadRazorpayScript } from '@/lib/razorpay'
import { Logo } from '@/components/ui/Logo'

const F = 'var(--forest)'

// ── Field ──────────────────────────────────────────────────────────────────────

function Field({
  label, required, error, ...rest
}: { label: string; required?: boolean; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: F, marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
      <input
        {...rest}
        style={{
          width: '100%', boxSizing: 'border-box', display: 'block',
          border: `1.5px solid ${error ? '#FCA5A5' : 'rgba(168,213,181,0.55)'}`,
          borderRadius: 10, padding: '13px 14px',
          fontSize: 16, color: F,
          background: rest.readOnly ? 'rgba(0,0,0,0.02)' : '#FAFAF9',
          outline: 'none', fontFamily: 'inherit',
          opacity: rest.readOnly ? 0.6 : 1,
        }}
      />
      {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginBottom: 0 }}>{error}</p>}
    </div>
  )
}

// ── Step bar ────────────────────────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
          {n > 1 && (
            <div style={{ width: 36, height: 2, background: n <= step ? F : '#E5E7EB', transition: 'background .3s' }} />
          )}
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
            background: n <= step ? F : '#E5E7EB',
            color: n <= step ? '#fff' : '#9CA3AF',
            transition: 'background .3s',
          }}>
            {n < step ? '✓' : n}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Section label ───────────────────────────────────────────────────────────────

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      color: F, textTransform: 'uppercase', opacity: 0.5,
      margin: '22px 0 14px',
    }}>
      {children}
    </p>
  )
}

// ── Error banner ────────────────────────────────────────────────────────────────

function ErrBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      background: '#FEF2F2', border: '1px solid #FCA5A5',
      borderRadius: 10, padding: '11px 14px', marginBottom: 18,
      fontSize: 13, color: '#B91C1C',
    }}>
      {msg}
    </div>
  )
}

// ── Primary button ──────────────────────────────────────────────────────────────

function Btn({ children, onClick, disabled, outline }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  outline?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '15px 20px', marginTop: 4,
        background: outline ? 'transparent' : disabled ? '#9CA3AF' : F,
        color: outline ? F : '#fff',
        border: outline ? `1.5px solid ${F}` : 'none',
        borderRadius: 12, fontSize: 16, fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Profile
// ─────────────────────────────────────────────────────────────────────────────

function ProfileStep({ onNext }: { onNext: () => void }) {
  const { user, profile } = useAuth()
  const [name, setName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.whatsapp_number || '')
  const [address, setAddress] = useState(profile?.address || '')
  const [lovedName, setLovedName] = useState('')
  const [lovedCity, setLovedCity] = useState('')
  const [lovedAddress, setLovedAddress] = useState('')
  const [lovedAge, setLovedAge] = useState('')
  const [lovedRel, setLovedRel] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pre-fill if user has a loved one from a prior visit
  useEffect(() => {
    if (!user) return
    supabase.from('loved_ones')
      .select('full_name, city, address, age, relationship')
      .eq('family_user_id', user.id).limit(1).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setLovedName(data.full_name || '')
        setLovedCity(data.city || '')
        setLovedAddress(data.address || '')
        setLovedAge(data.age != null ? String(data.age) : '')
        setLovedRel(data.relationship || '')
      })
  }, [user])

  async function save() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Required'
    if (!phone.trim()) errs.phone = 'Required'
    if (!address.trim()) errs.address = 'Required'
    if (!lovedName.trim()) errs.lovedName = 'Required'
    if (!lovedAddress.trim()) errs.lovedAddress = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const { error: pErr } = await supabase.from('profiles').update({
        full_name: name.trim(),
        whatsapp_number: phone.trim(),
        address: address.trim(),
        user_type: 'nri',
      }).eq('id', user!.id)
      if (pErr) throw pErr

      const { data: existingLO } = await supabase.from('loved_ones')
        .select('id').eq('family_user_id', user!.id).limit(1).maybeSingle()

      const loPayload = {
        full_name: lovedName.trim(),
        city: lovedCity.trim() || null,
        address: lovedAddress.trim(),
        age: lovedAge ? parseInt(lovedAge, 10) : null,
        relationship: lovedRel || null,
      }
      if (existingLO) {
        const { error: loErr } = await supabase.from('loved_ones').update(loPayload).eq('id', existingLO.id)
        if (loErr) throw loErr
      } else {
        const { error: loErr } = await supabase.from('loved_ones').insert({ ...loPayload, family_user_id: user!.id })
        if (loErr) throw loErr
      }

      onNext()
    } catch (err) {
      console.error('[ProfileStep] save failed:', err)
      setErrors({ form: 'Something went wrong — please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const inputSx = (err?: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box', display: 'block',
    border: `1.5px solid ${err ? '#FCA5A5' : 'rgba(168,213,181,0.55)'}`,
    borderRadius: 10, padding: '13px 14px',
    fontSize: 16, color: F, background: '#FAFAF9',
    outline: 'none', fontFamily: 'inherit',
  })

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: F, margin: '0 0 6px' }}>Tell us about yourself</h2>
      <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 4px', lineHeight: 1.5 }}>
        Saved once — we'll never ask again.
      </p>

      {errors.form && <ErrBanner msg={errors.form} />}

      <SLabel>Your account</SLabel>

      <Field label="Your name" required value={name} onChange={e => setName(e.target.value)} error={errors.name} placeholder="e.g. Arjun Kumar" autoComplete="name" />
      <Field label="WhatsApp number" required value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} placeholder="+65 9123 4567" type="tel" autoComplete="tel" />
      <Field label="Email" value={user?.email || ''} readOnly autoComplete="email" />
      <Field label="Where you live" required value={address} onChange={e => setAddress(e.target.value)} error={errors.address} placeholder="City, country — e.g. Singapore" />

      <SLabel>Your loved one in India</SLabel>

      <Field label="Their name" required value={lovedName} onChange={e => setLovedName(e.target.value)} error={errors.lovedName} placeholder="e.g. Kamala Kumar" />
      <Field label="City in India" value={lovedCity} onChange={e => setLovedCity(e.target.value)} placeholder="e.g. Hyderabad, Chennai, Pune" />

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: F, marginBottom: 5 }}>
          Their full address <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <textarea
          value={lovedAddress}
          onChange={e => setLovedAddress(e.target.value)}
          placeholder="Flat/house, street, area, city, pincode"
          rows={3}
          style={{
            ...inputSx(errors.lovedAddress),
            resize: 'none', lineHeight: 1.55,
          }}
        />
        {errors.lovedAddress && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.lovedAddress}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: F, marginBottom: 5 }}>Age</label>
          <input
            type="number" min={50} max={120} placeholder="e.g. 72"
            value={lovedAge} onChange={e => setLovedAge(e.target.value)}
            style={inputSx()}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: F, marginBottom: 5 }}>Relationship</label>
          <select
            value={lovedRel} onChange={e => setLovedRel(e.target.value)}
            style={{ ...inputSx(), color: lovedRel ? F : '#9CA3AF', appearance: 'none' }}
          >
            <option value="">Select…</option>
            {['Mother', 'Father', 'Grandmother', 'Grandfather', 'Other'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <Btn onClick={save} disabled={saving}>
        {saving && <Loader2 size={17} className="animate-spin" />}
        {saving ? 'Saving…' : 'Save and continue →'}
      </Btn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Payment
// ─────────────────────────────────────────────────────────────────────────────

type PayState = 'idle' | 'creating' | 'open' | 'verifying' | 'verify_error'

function PayStep({ onConfirmed }: { onConfirmed: () => Promise<void> }) {
  const { user } = useAuth()
  const [payState, setPayState] = useState<PayState>('idle')
  const [payError, setPayError] = useState('')
  // Store the Razorpay response so we can retry verification without re-paying
  const pendingPayRef = useRef<{
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  } | null>(null)
  const handlerFiredRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => () => { mountedRef.current = false }, [])

  async function doVerify(resp: NonNullable<typeof pendingPayRef.current>) {
    if (!mountedRef.current) return
    setPayState('verifying')
    try {
      const { error } = await supabase.functions.invoke('razorpay-verify-membership', {
        body: {
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_signature: resp.razorpay_signature,
        },
      })
      if (error) throw error
      if (mountedRef.current) await onConfirmed()
    } catch (err) {
      console.error('[PayStep] verify-membership failed:', err)
      if (mountedRef.current) setPayState('verify_error')
    }
  }

  async function pay() {
    if (!user) return
    setPayError('')
    setPayState('creating')
    handlerFiredRef.current = false

    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        setPayError('Could not load payment — check your connection and try again.')
        setPayState('idle')
        return
      }

      const { data, error } = await supabase.functions.invoke('razorpay-create-membership')
      if (error || !data?.order_id) {
        setPayError('Could not start payment — please try again.')
        setPayState('idle')
        return
      }

      setPayState('open')

      const rzp = new window.Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: 'INR',
        name: 'Close Eye',
        description: 'Founding Membership · ₹100',
        theme: { color: '#0E2A1F' },
        modal: {
          ondismiss: () => {
            if (!handlerFiredRef.current && mountedRef.current) setPayState('idle')
          },
        },
        handler: (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          handlerFiredRef.current = true
          pendingPayRef.current = resp
          doVerify(resp)
        },
      }) as { open(): void; on(event: string, cb: (r: unknown) => void): void }

      rzp.on('payment.failed', () => {
        if (mountedRef.current) {
          setPayState('idle')
          setPayError('Payment failed — please try again.')
        }
      })

      rzp.open()
    } catch {
      setPayError('Something went wrong — please try again.')
      setPayState('idle')
    }
  }

  // ── Verifying ────────────────────────────────────────────────────────────────
  if (payState === 'verifying') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: F, margin: '0 auto 20px', display: 'block' }} />
        <p style={{ fontSize: 18, fontWeight: 700, color: F, margin: '0 0 8px' }}>Confirming your membership…</p>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>
          Verifying payment — this takes just a second.
        </p>
      </div>
    )
  }

  // ── Verification failed (payment went through but confirmation errored) ───────
  if (payState === 'verify_error') {
    return (
      <div style={{ textAlign: 'center', padding: '36px 16px 24px' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(168,213,181,0.15)',
          border: '1.5px solid rgba(168,213,181,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle2 size={28} style={{ color: F }} />
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: F, margin: '0 0 12px' }}>Payment received ✓</p>
        <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.65, maxWidth: 290, margin: '0 auto 8px' }}>
          We received your payment but couldn't confirm the membership yet.
        </p>
        <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.5, maxWidth: 260, margin: '0 auto 28px' }}>
          <strong style={{ color: '#6B7280' }}>Do not pay again.</strong> Tap below to retry confirmation.
        </p>
        <Btn onClick={() => pendingPayRef.current && doVerify(pendingPayRef.current)}>
          Retry confirmation →
        </Btn>
      </div>
    )
  }

  // ── Idle / creating / open ───────────────────────────────────────────────────
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: F, margin: '0 0 6px' }}>Become a Founding Member</h2>
      <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 22px', lineHeight: 1.5 }}>
        One-time payment. No subscription, ever.
      </p>

      <div style={{
        background: 'rgba(168,213,181,0.1)',
        border: '1.5px solid rgba(168,213,181,0.5)',
        borderRadius: 16, padding: '20px', marginBottom: 24,
      }}>
        <p style={{ fontSize: 30, fontWeight: 800, color: F, margin: '0 0 2px', letterSpacing: '-0.5px' }}>₹100</p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 18px' }}>Founding Member · one-time</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Priority visits when we launch on 15 August',
            'Ask Close Eye — health guidance from our medical team',
            "Your loved one's details on file, ready to go",
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: F, fontWeight: 700, flexShrink: 0, lineHeight: '1.5rem' }}>✓</span>
              <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.55 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {payError && <ErrBanner msg={payError} />}

      <Btn onClick={pay} disabled={payState !== 'idle'}>
        {(payState === 'creating' || payState === 'open') && <Loader2 size={17} className="animate-spin" />}
        {payState === 'creating' ? 'Setting up payment…'
          : payState === 'open' ? 'Complete payment above'
          : 'Pay ₹100 →'}
      </Btn>

      <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
        Secured by Razorpay · UPI, cards, and net banking accepted
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Confirmed
// ─────────────────────────────────────────────────────────────────────────────

const FOUNDING_BENEFITS = [
  'Priority companion matching on launch day — 15 August',
  '10% off every Close Eye service — forever',
  'Medical team Q&A — 5 free questions/month, starting today',
  'Price locked at ₹1,500/month when companion visits launch',
  'Founding Member badge — your number never changes',
]

function ConfirmStep() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const num = profile?.founding_number

  return (
    <div style={{ textAlign: 'center', padding: '16px 8px 8px' }}>
      <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>🌿</div>
      {num && (
        <div style={{
          display: 'inline-block', background: 'rgba(168,213,181,0.15)',
          border: '1.5px solid rgba(168,213,181,0.6)',
          borderRadius: 100, padding: '5px 16px', fontSize: 13,
          fontWeight: 700, color: F, marginBottom: 16, letterSpacing: '0.02em',
        }}>
          Founding Member #{num}
        </div>
      )}
      <h2 style={{ fontSize: 24, fontWeight: 800, color: F, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
        You're a Founding Member
      </h2>
      <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65, maxWidth: 290, margin: '0 auto 20px' }}>
        We launch companion visits on <strong style={{ color: F }}>15 August</strong>. You'll be first — matched, scheduled, and WhatsApp-ready.
      </p>

      <div style={{ background: 'rgba(168,213,181,0.08)', border: '1px solid rgba(168,213,181,0.3)', borderRadius: 14, padding: '16px', marginBottom: 20, textAlign: 'left' }}>
        {FOUNDING_BENEFITS.map(b => (
          <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ color: F, fontWeight: 700, flexShrink: 0, lineHeight: '1.5rem', fontSize: 14 }}>✓</span>
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{b}</span>
          </div>
        ))}
      </div>

      <Btn onClick={() => navigate('/dashboard/ask', { replace: true })}>
        Open Ask Close Eye →
      </Btn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingPage() {
  const { user, profile, loading, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  // Set true before reloadProfile() so the useEffect below can't redirect while
  // the confirmation screen is rendering (profile change fires before setStep(3)).
  const payConfirmedRef = useRef(false)

  useEffect(() => {
    if (!loading && profile?.is_founding_member && !payConfirmedRef.current) {
      navigate('/dashboard/ask', { replace: true })
    }
  }, [loading, profile, navigate])

  if (loading || (user && !profile)) {
    return (
      <div style={{ minHeight: '100svh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: F }} />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />

  async function handlePayConfirmed() {
    payConfirmedRef.current = true
    await reloadProfile()
    setStep(3)
  }

  return (
    <div style={{
      minHeight: '100svh', background: 'var(--cream)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'max(28px, calc(16px + env(safe-area-inset-top, 0px))) 16px max(56px, calc(40px + env(safe-area-inset-bottom, 0px)))',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo className="w-8 h-8" />
        <span style={{ fontSize: 18, fontWeight: 700, color: F, letterSpacing: '-0.3px' }}>close eye</span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 2px 20px rgba(14,42,31,0.07)',
        padding: '28px 24px',
      }}>
        {step < 3 && <StepBar step={step} />}
        {step === 1 && <ProfileStep onNext={() => setStep(2)} />}
        {step === 2 && <PayStep onConfirmed={handlePayConfirmed} />}
        {step === 3 && <ConfirmStep />}
      </div>
    </div>
  )
}
