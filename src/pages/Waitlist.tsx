import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { ArrowRight } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  whatsapp_number: z.string().min(8, 'Enter a valid WhatsApp number'),
  country: z.string().min(1, 'Select your country'),
  loved_one_city: z.string().min(2, "Enter your loved one's city"),
  urgency: z.enum(['this_week', 'one_to_three_months', 'exploring'], {
    required_error: 'Please select when you need support',
  }),
  support_needed: z.string().optional(),
  website: z.string().optional(), // honeypot
})
type FormData = z.infer<typeof schema>

const COUNTRIES = ['USA', 'UK', 'UAE', 'Canada', 'Australia', 'Singapore', 'New Zealand', 'Germany', 'Netherlands', 'Other']
const URGENCY_OPTIONS = [
  { value: 'this_week', label: "Within a week — it's urgent", emoji: '🔴' },
  { value: 'one_to_three_months', label: 'Within 1–3 months', emoji: '🟡' },
  { value: 'exploring', label: 'Just exploring for now', emoji: '🟢' },
]

export function WaitlistPage() {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')
  const mountedAt = useRef(Date.now())

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { urgency: 'exploring' },
  })

  async function onSubmit(data: FormData) {
    setServerError('')

    // Bot check: honeypot filled or form submitted inhuman-fast
    if (data.website || Date.now() - mountedAt.current < 3000) {
      setSuccess(true)
      return
    }

    const { error } = await supabase.functions.invoke('waitlist-signup', {
      body: {
        full_name: data.full_name,
        email: data.email,
        whatsapp_number: data.whatsapp_number,
        country: data.country,
        loved_one_city: data.loved_one_city,
        urgency: data.urgency,
        support_needed: data.support_needed || null,
      },
    })

    if (error) {
      const msg = error?.message || ''
      if (msg.includes('already been registered') || msg.includes('already') || msg.includes('email_exists')) {
        setSuccess(true)
        return
      }
      setServerError('Something went wrong. Please WhatsApp us at +91 90002 21261.')
      return
    }

    setSuccess(true)
  }

  if (success) return (
    <main style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'max(24px, env(safe-area-inset-top, 0px)) 16px max(24px, env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <Logo className="w-10 h-10 mx-auto mb-6" />

        <div style={{ fontSize: 52, marginBottom: 16 }}>🌿</div>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--forest)', margin: '0 0 12px' }}>
          Welcome to Close Eye.
        </h2>
        <p style={{ fontSize: 16, color: 'var(--gray-mid)', lineHeight: 1.6, margin: '0 0 28px' }}>
          We've sent you a welcome message on WhatsApp, and a link to activate your account by email. Once activated, you can use Ask CloseEye — free, up to 5 times a month.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link
            to="/founding-member"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--forest)', color: '#fff', fontWeight: 600,
              padding: '16px 24px', borderRadius: 14, textDecoration: 'none', fontSize: 15,
            }}
          >
            Become a Founding Family — ₹100 <ArrowRight size={16} />
          </Link>
          <p style={{ fontSize: 12, color: 'var(--gray-mid)' }}>
            One-time. Founding Families get priority access and a permanent 10% discount when services launch.
          </p>
        </div>

        <a
          href="https://wa.me/919000221261"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--forest)', marginTop: 20, textDecoration: 'none' }}
        >
          💬 WhatsApp us directly
        </a>
      </div>
    </main>
  )

  return (
    <main style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      {/* Header */}
      {/* paddingTop uses max() so it's never less than 64px but always clears the notch/Dynamic Island */}
      <div style={{ background: 'var(--forest)', color: '#fff', padding: 'max(64px, calc(20px + env(safe-area-inset-top, 0px))) 24px 48px', textAlign: 'center' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, marginBottom: 24 }}>
          <Logo className="w-6 h-6" /> close eye
        </Link>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--sage)', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Free · Pre-launch
        </p>
        <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 700, margin: '0 0 12px', lineHeight: 1.2 }}>
          Join our waitlist.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.6 }}>
          Tell us about your family. You'll be first to know when we launch in your city — and you can use Ask CloseEye free in the meantime.
        </p>
        <Link
          to="/founding-member"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--sage)', color: 'var(--forest)', fontWeight: 600, padding: '10px 20px', borderRadius: 100, fontSize: 13, textDecoration: 'none' }}
        >
          Or become a Founding Family (₹100) →
        </Link>
      </div>

      {/* Form */}
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '40px 16px 80px' }}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Honeypot */}
          <div style={{ position: 'absolute', left: -9999 }} aria-hidden="true">
            <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>Full name *</label>
              <input {...register('full_name')} placeholder="Rahul Mehta" style={inputStyle} />
              {errors.full_name && <p style={errStyle}>{errors.full_name.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input {...register('email')} type="email" placeholder="rahul@email.com" style={inputStyle} />
              {errors.email && <p style={errStyle}>{errors.email.message}</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>WhatsApp number *</label>
              <input {...register('whatsapp_number')} type="tel" placeholder="+1 555 000 0000" style={inputStyle} />
              {errors.whatsapp_number && <p style={errStyle}>{errors.whatsapp_number.message}</p>}
            </div>
            <div>
              <label style={labelStyle}>Your country *</label>
              <select {...register('country')} style={{ ...inputStyle, background: '#fff' }}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
              {errors.country && <p style={errStyle}>{errors.country.message}</p>}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Loved one's city in India *</label>
            <input {...register('loved_one_city')} placeholder="e.g. Hyderabad, Mumbai, Bengaluru..." style={inputStyle} />
            {errors.loved_one_city && <p style={errStyle}>{errors.loved_one_city.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>How soon do you need support? *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {URGENCY_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#fff', border: '1.5px solid #e5e5e5', borderRadius: 12, cursor: 'pointer', fontSize: 14, color: 'var(--gray-dark)' }}>
                  <input type="radio" value={opt.value} {...register('urgency')} style={{ accentColor: 'var(--forest)', width: 16, height: 16 }} />
                  {opt.emoji} {opt.label}
                </label>
              ))}
            </div>
            {errors.urgency && <p style={errStyle}>{errors.urgency.message}</p>}
          </div>

          <div>
            <label style={labelStyle}>What support would help? <span style={{ fontWeight: 400, color: 'var(--gray-mid)' }}>(optional)</span></label>
            <textarea
              {...register('support_needed')}
              rows={3}
              placeholder="Tell us a little about your situation — we read every response personally."
              style={{ ...inputStyle, resize: 'none', minHeight: 80 }}
            />
          </div>

          {serverError && (
            <div style={{ padding: '12px 16px', background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 10 }}>
              <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{serverError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? 'var(--gray-light)' : 'var(--forest)',
              color: '#fff', fontWeight: 700, padding: '16px', borderRadius: 14,
              border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {isSubmitting ? (
              <>
                <svg className="ce-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <circle opacity={0.25} cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} />
                  <path opacity={0.75} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Joining…
              </>
            ) : <>Join the Waitlist <ArrowRight size={16} /></>}
          </button>

          <p style={{ fontSize: 12, textAlign: 'center', color: 'var(--gray-mid)' }}>
            We read every response personally and reply on WhatsApp within 24 hours.
          </p>
        </form>
      </section>
    </main>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--forest)', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #e5e5e5', borderRadius: 12,
  padding: '12px 14px', fontSize: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const errStyle: React.CSSProperties = {
  color: '#dc2626', fontSize: 12, marginTop: 4,
}
