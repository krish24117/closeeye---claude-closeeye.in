import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import { signIn, signUp, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { LogoLockup } from '@/components/ui/Logo'

/* ── Schemas ─────────────────────────────────────────────────────────────── */

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Enter your full name'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match', path: ['confirm_password'],
})
const resetSchema = z.object({
  email: z.string().email('Enter a valid email'),
})
const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: "Passwords don't match", path: ['confirm_password'],
})

type LoginData         = z.infer<typeof loginSchema>
type SignupData        = z.infer<typeof signupSchema>
type ResetData         = z.infer<typeof resetSchema>
type UpdatePasswordData = z.infer<typeof updatePasswordSchema>
type Mode = 'login' | 'signup' | 'reset' | 'update-password'

function getRoleHome(profile: { role?: string; admin_role?: string | null } | null | undefined) {
  if (profile?.admin_role === 'doctor') return '/doctor'
  if (profile?.role === 'admin') return '/admin'
  if (profile?.role === 'companion') return '/companion'
  return '/dashboard'
}

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919000221261'
const WA_LINK   = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi, I need help with my Close Eye account.')}`

/* ── Design tokens ───────────────────────────────────────────────────────── */

const C = {
  forest:      '#0E2A1F',
  forestDeep:  '#0B2218',
  sage:        '#A8D5B5',
  cream:       '#FAF7F2',
  bg:          '#F5F0E8',
  border:      '#E2DDD6',
  borderFocus: '#0E2A1F',
  inputBg:     '#FAFAF8',
  label:       '#3A5246',
  body:        '#6B7A72',
  muted:       '#9CA8A0',
  error:       '#B42318',
  errorBg:     '#FEF3F2',
  errorBorder: '#FECDCA',
} as const

const inputBase: React.CSSProperties = {
  width: '100%', height: 56, borderRadius: 16,
  border: `1.5px solid ${C.border}`, background: C.inputBg,
  fontSize: 16, color: C.forest, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 180ms, box-shadow 180ms, background 180ms',
  fontFamily: 'inherit', padding: '0 18px',
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function InputField({
  label, error, suffix, onFocus: propFocus, onBlur: propBlur, ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; suffix?: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.label, marginBottom: 8, letterSpacing: '.01em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          {...rest}
          style={{ ...inputBase, paddingRight: suffix ? 56 : 18 }}
          onFocus={e => {
            e.currentTarget.style.borderColor = C.borderFocus
            e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(14,42,31,.10)'
            e.currentTarget.style.background  = '#fff'
            propFocus?.(e)
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = C.border
            e.currentTarget.style.boxShadow   = 'none'
            e.currentTarget.style.background  = C.inputBg
            propBlur?.(e)
          }}
        />
        {suffix && (
          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {suffix}
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 12.5, color: C.error, marginTop: 6, fontWeight: 500 }}>{error}</p>}
    </div>
  )
}

function PasswordField({
  label, showLabel = true, showToggle, show, onToggle, rhfProps, error, autoComplete, placeholder,
}: {
  label: string; showLabel?: boolean; showToggle: boolean; show: boolean; onToggle: () => void
  rhfProps: React.InputHTMLAttributes<HTMLInputElement>; error?: string
  autoComplete?: string; placeholder?: string
}) {
  const { onBlur: rhfBlur, ...rhfRest } = rhfProps as { onBlur?: React.FocusEventHandler<HTMLInputElement> } & React.InputHTMLAttributes<HTMLInputElement>
  return (
    <div>
      {showLabel && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.label, marginBottom: 8, letterSpacing: '.01em' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          {...rhfRest}
          type={show ? 'text' : 'password'}
          placeholder={placeholder ?? '••••••••'}
          autoComplete={autoComplete ?? 'current-password'}
          style={{ ...inputBase, paddingRight: 56 }}
          onFocus={e => { e.currentTarget.style.borderColor = C.borderFocus; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,42,31,.10)'; e.currentTarget.style.background = '#fff' }}
          onBlur={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = C.inputBg; rhfBlur?.(e) }}
        />
        {showToggle && (
          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EyeToggle show={show} onToggle={onToggle} label={show ? 'Hide password' : 'Show password'} />
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 12.5, color: C.error, marginTop: 6, fontWeight: 500 }}>{error}</p>}
    </div>
  )
}

function PrimaryButton({
  children, loading, disabled, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        width: '100%', height: 58, borderRadius: 18,
        background: disabled || loading ? '#C0CECA' : C.forest,
        color: '#fff', fontSize: 16, fontWeight: 700, border: 'none',
        cursor: disabled || loading ? 'default' : 'pointer',
        boxShadow: disabled || loading ? 'none' : '0 4px 20px rgba(14,42,31,.22)',
        transition: 'transform 160ms, box-shadow 160ms, background 160ms',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'inherit', letterSpacing: '.01em',
      }}
      onMouseEnter={e => { if (!disabled && !loading) { e.currentTarget.style.background = C.forestDeep; e.currentTarget.style.boxShadow = '0 8px 28px rgba(14,42,31,.28)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { if (!disabled && !loading) { e.currentTarget.style.background = C.forest; e.currentTarget.style.boxShadow = '0 4px 20px rgba(14,42,31,.22)'; e.currentTarget.style.transform = '' } }}
    >
      {loading && <Loader2 size={18} style={{ animation: 'ce-auth-spin 0.9s linear infinite', flexShrink: 0 }} />}
      {children}
    </button>
  )
}

function EyeToggle({ show, onToggle, label }: { show: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button" onClick={onToggle} aria-label={label}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 8, transition: 'color 150ms' }}
      onMouseEnter={e => (e.currentTarget.style.color = C.forest)}
      onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

function ErrorCard({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#912018', margin: 0 }}>Something went wrong</p>
        <p style={{ fontSize: 12, color: C.error, margin: '2px 0 0', lineHeight: 1.5 }}>{message}</p>
      </div>
    </div>
  )
}

function GoogleButton({ onClick, label = 'Continue with Google' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        width: '100%', height: 58, borderRadius: 18,
        background: '#fff', color: '#1a1a1a',
        fontSize: 15.5, fontWeight: 600,
        border: `1.5px solid ${C.border}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        transition: 'border-color 160ms, box-shadow 160ms, transform 160ms',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#C5BDB4'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.10)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.06)'; e.currentTarget.style.transform = '' }}
    >
      <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
      </svg>
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1, height: 1, background: '#EDE8E0' }} />
      <span style={{ fontSize: 11.5, color: '#B5AFA8', fontWeight: 600, letterSpacing: '.10em' }}>OR</span>
      <div style={{ flex: 1, height: 1, background: '#EDE8E0' }} />
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export function AuthPage() {
  const [searchParams]        = useSearchParams()
  const [mode, setMode]       = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [error, setError]     = useState('')
  const [resetSent, setResetSent]               = useState(false)
  const [signupConfirmSent, setSignupConfirmSent] = useState(false)
  const [showPassword,        setShowPassword]       = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showLoginPassword,   setShowLoginPassword]   = useState(false)
  const [showUpdatePassword,  setShowUpdatePassword]  = useState(false)
  const [showUpdateConfirm,   setShowUpdateConfirm]   = useState(false)
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()

  /* ── Auth state listener ─────────────────────────────────────────────── */

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setError(''); setMode('update-password') }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!loading && user && profile && mode !== 'update-password') {
      const pendingRaw = sessionStorage.getItem('pendingCheckout')
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw) as
            | { type: 'subscription'; planId: string }
            | { type: 'booking'; serviceType: string }
            | { type: 'membership' }
          if (pending.type === 'subscription') {
            sessionStorage.removeItem('pendingCheckout')
            navigate(`/dashboard/subscription?autoplan=${pending.planId}`, { replace: true }); return
          }
          if (pending.type === 'booking') {
            sessionStorage.removeItem('pendingCheckout')
            navigate(`/dashboard/new-booking?service=${pending.serviceType}`, { replace: true }); return
          }
          if (pending.type === 'membership') {
            if (profile.is_founding_member) sessionStorage.removeItem('pendingCheckout')
            else { navigate('/founding-member/checkout', { replace: true }); return }
          }
        } catch { sessionStorage.removeItem('pendingCheckout') }
      }
      navigate(getRoleHome(profile), { replace: true })
    }
  }, [loading, user, profile, navigate, mode])

  /* ── Forms ───────────────────────────────────────────────────────────── */

  const loginForm           = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const signupForm          = useForm<SignupData>({ resolver: zodResolver(signupSchema) })
  const signupPassword      = signupForm.watch('password')
  const signupConfirmPw     = signupForm.watch('confirm_password')
  const passwordsMismatch   = !!signupConfirmPw && signupPassword !== signupConfirmPw
  const resetForm           = useForm<ResetData>({ resolver: zodResolver(resetSchema) })
  const updatePasswordForm  = useForm<UpdatePasswordData>({ resolver: zodResolver(updatePasswordSchema) })
  const updatePw            = updatePasswordForm.watch('password')
  const updateConfirmPw     = updatePasswordForm.watch('confirm_password')
  const updateMismatch      = !!updateConfirmPw && updatePw !== updateConfirmPw

  /* ── Handlers ────────────────────────────────────────────────────────── */

  async function handleLogin(data: LoginData) {
    setError('')
    const { error } = await signIn(data.email, data.password)
    if (error) setError(error.message)
  }

  async function handleSignup(data: SignupData) {
    setError('')
    const { data: signUpData, error } = await signUp(data.email, data.password, data.full_name)
    if (error) { setError(error.message); return }
    if (!signUpData.session) setSignupConfirmSent(true)
  }

  async function handleReset(data: ResetData) {
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo: `${window.location.origin}/auth` })
    if (error) { setError(error.message); return }
    setResetSent(true)
  }

  async function handleUpdatePassword(data: UpdatePasswordData) {
    setError('')
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { setError(error.message); return }
    navigate(getRoleHome(profile), { replace: true })
  }

  async function handleGoogleSignIn() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth`, queryParams: { prompt: 'select_account' } },
    })
    if (error) setError(error.message)
  }

  const switchMode = (m: Mode) => { setMode(m); setError(''); setSignupConfirmSent(false); setResetSent(false) }

  /* ── Loading ─────────────────────────────────────────────────────────── */

  if (loading && mode !== 'update-password') {
    return (
      <div style={{ minHeight: '100svh', background: `linear-gradient(180deg, ${C.cream} 0%, #EDE7DC 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} style={{ color: C.forest, animation: 'ce-auth-spin 0.9s linear infinite' }} />
        <style>{`@keyframes ce-auth-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ── Page ────────────────────────────────────────────────────────────── */

  return (
    <div style={{
      minHeight: '100svh',
      background: `linear-gradient(180deg, ${C.cream} 0%, #EDE7DC 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'max(env(safe-area-inset-top, 0px), 52px) 20px max(env(safe-area-inset-bottom, 0px), 48px)',
    }}>
      <style>{`
        html, body { background: #F5F0E8; }
        @keyframes ce-auth-spin { to { transform: rotate(360deg); } }
        @keyframes ce-auth-up   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes ce-auth-fade { from { opacity: 0; } to { opacity: 1; } }
        .ce-auth-logo  { animation: ce-auth-up 0.32s ease both; }
        .ce-auth-strip { animation: ce-auth-up 0.32s ease both 0.06s; }
        .ce-auth-card  { animation: ce-auth-up 0.36s ease both 0.10s; }
        .ce-auth-body  { animation: ce-auth-fade 0.22s ease both; }
      `}</style>

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div className="ce-auth-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, width: '100%', maxWidth: 420 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <LogoLockup fontSize={22} color="dark" />
        </Link>
        {(mode === 'login' || mode === 'signup') && (
          <p style={{ fontSize: 13.5, color: C.body, marginTop: 10, textAlign: 'center', lineHeight: 1.55, fontWeight: 450, letterSpacing: '-.01em' }}>
            Your trusted presence, even when you can't be there.
          </p>
        )}
      </div>

      {/* ── Trust strip ──────────────────────────────────────────────── */}
      {(mode === 'login' || mode === 'signup') && (
        <div className="ce-auth-strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#2E6845', letterSpacing: '.03em' }}>✓ Secure</span>
          <span style={{ color: '#C5BDB4', fontSize: 10 }}>·</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#5A7A65', letterSpacing: '.02em' }}>Encrypted</span>
          <span style={{ color: '#C5BDB4', fontSize: 10 }}>·</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#5A7A65', letterSpacing: '.02em' }}>Trusted Presence for Families</span>
        </div>
      )}

      {/* ── Card ─────────────────────────────────────────────────────── */}
      <div
        className="ce-auth-card"
        style={{
          width: '100%', maxWidth: 420,
          background: '#fff',
          borderRadius: 28,
          boxShadow: '0 2px 4px rgba(14,42,31,.04), 0 16px 56px rgba(14,42,31,.11)',
          padding: '36px 32px 32px',
        }}
      >

        {/* ── UPDATE PASSWORD ──────────────────────────────────────── */}
        {mode === 'update-password' && (
          <div className="ce-auth-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: C.forest, margin: '0 0 8px', letterSpacing: '-.02em' }}>Set a new password</h2>
              <p style={{ fontSize: 14, color: C.body, margin: 0, lineHeight: 1.55 }}>Enter a strong password for your account.</p>
            </div>
            <form onSubmit={updatePasswordForm.handleSubmit(handleUpdatePassword)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <PasswordField
                label="New password"
                show={showUpdatePassword}
                showToggle
                onToggle={() => setShowUpdatePassword(v => !v)}
                rhfProps={updatePasswordForm.register('password')}
                error={updatePasswordForm.formState.errors.password?.message}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
              <PasswordField
                label="Confirm new password"
                show={showUpdateConfirm}
                showToggle
                onToggle={() => setShowUpdateConfirm(v => !v)}
                rhfProps={updatePasswordForm.register('confirm_password')}
                error={updateMismatch ? 'Passwords do not match' : updatePasswordForm.formState.errors.confirm_password?.message}
                autoComplete="new-password"
                placeholder="Repeat your password"
              />
              <ErrorCard message={error} />
              <PrimaryButton type="submit" loading={updatePasswordForm.formState.isSubmitting} disabled={updateMismatch}>
                {updatePasswordForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
              </PrimaryButton>
            </form>
          </div>
        )}

        {/* ── RESET PASSWORD ───────────────────────────────────────── */}
        {mode === 'reset' && (
          <div className="ce-auth-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <button
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.body, marginBottom: 20, padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
              >
                ← Back to sign in
              </button>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: C.forest, margin: '0 0 8px', letterSpacing: '-.02em' }}>Reset your password</h2>
                <p style={{ fontSize: 14, color: C.body, margin: 0, lineHeight: 1.55 }}>Enter your email and we'll send a reset link.</p>
              </div>
            </div>
            {resetSent ? (
              <div style={{ background: '#F0FAF4', border: '1px solid #B7E4C7', borderRadius: 20, padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>✉️</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.forest, margin: '0 0 8px' }}>Check your email</p>
                <p style={{ fontSize: 13.5, color: '#5A7A65', margin: 0, lineHeight: 1.6 }}>We've sent a password reset link. It may take a minute to arrive.</p>
              </div>
            ) : (
              <form onSubmit={resetForm.handleSubmit(handleReset)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <InputField
                  label="Email address"
                  type="email"
                  placeholder="you@email.com"
                  error={resetForm.formState.errors.email?.message}
                  {...resetForm.register('email')}
                />
                <ErrorCard message={error} />
                <PrimaryButton type="submit" loading={resetForm.formState.isSubmitting}>
                  {resetForm.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
                </PrimaryButton>
              </form>
            )}
          </div>
        )}

        {/* ── LOGIN ────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <div key="login" className="ce-auth-body" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Heading */}
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.forest, margin: '0 0 8px', letterSpacing: '-.03em', lineHeight: 1.15 }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 14, color: C.body, margin: 0, lineHeight: 1.55 }}>
                Stay connected to your family's care from anywhere.
              </p>
            </div>

            {/* Google — primary */}
            <GoogleButton onClick={handleGoogleSignIn} />

            <Divider />

            {/* Email form */}
            <form onSubmit={loginForm.handleSubmit(handleLogin)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InputField
                label="Email address"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />

              {/* Password with forgot link */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.label, letterSpacing: '.01em' }}>
                    Password
                  </label>
                  <button
                    type="button" onClick={() => switchMode('reset')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: C.forest, fontFamily: 'inherit', fontWeight: 600, padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordField
                  label="Password"
                  showLabel={false}
                  show={showLoginPassword}
                  showToggle
                  onToggle={() => setShowLoginPassword(v => !v)}
                  rhfProps={loginForm.register('password')}
                  error={loginForm.formState.errors.password?.message}
                  autoComplete="current-password"
                />
              </div>

              <ErrorCard message={error} />

              <PrimaryButton type="submit" loading={loginForm.formState.isSubmitting}>
                {loginForm.formState.isSubmitting ? 'Signing in…' : 'Sign In'}
              </PrimaryButton>
            </form>

            {/* Encrypted trust line */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ShieldCheck size={13} strokeWidth={2} style={{ color: C.muted, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.muted }}>Your family's information is encrypted and secure.</span>
            </div>

            {/* Switch to signup */}
            <div style={{ textAlign: 'center', borderTop: `1px solid #F0EBE4`, paddingTop: 20 }}>
              <p style={{ fontSize: 13, color: C.body, margin: '0 0 4px' }}>New here?</p>
              <button
                type="button" onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.forest, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
              >
                Create your free account →
              </button>
            </div>

          </div>
        )}

        {/* ── SIGNUP ───────────────────────────────────────────────── */}
        {mode === 'signup' && (
          <div key="signup" className="ce-auth-body" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {signupConfirmSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 44, marginBottom: 18 }}>✉️</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: C.forest, margin: '0 0 10px', letterSpacing: '-.02em' }}>Check your email</h2>
                <p style={{ fontSize: 13.5, color: C.body, lineHeight: 1.65, margin: '0 0 24px' }}>
                  We've sent a confirmation link to{' '}
                  <strong style={{ color: C.forest }}>{signupForm.getValues('email')}</strong>.{' '}
                  Click it to finish setting up your account.
                </p>
                <button
                  type="button"
                  onClick={() => { setSignupConfirmSent(false); signupForm.reset() }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.forest, fontWeight: 700, fontFamily: 'inherit' }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                {/* Heading */}
                <div style={{ textAlign: 'center' }}>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: C.forest, margin: '0 0 8px', letterSpacing: '-.03em', lineHeight: 1.15 }}>
                    Create your account
                  </h1>
                  <p style={{ fontSize: 14, color: C.body, margin: 0, lineHeight: 1.55 }}>
                    Set up your family's care dashboard in minutes.
                  </p>
                </div>

                <GoogleButton onClick={handleGoogleSignIn} label="Continue with Google" />

                <Divider />

                {/* Email signup form */}
                <form onSubmit={signupForm.handleSubmit(handleSignup)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <InputField
                    label="Full name"
                    placeholder="Rahul Mehta"
                    autoComplete="name"
                    error={signupForm.formState.errors.full_name?.message}
                    {...signupForm.register('full_name')}
                  />
                  <InputField
                    label="Email address"
                    type="email"
                    placeholder="you@email.com"
                    autoComplete="email"
                    error={signupForm.formState.errors.email?.message}
                    {...signupForm.register('email')}
                  />
                  <PasswordField
                    label="Password"
                    show={showPassword}
                    showToggle
                    onToggle={() => setShowPassword(v => !v)}
                    rhfProps={signupForm.register('password')}
                    error={signupForm.formState.errors.password?.message}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                  />
                  <PasswordField
                    label="Confirm password"
                    show={showConfirmPassword}
                    showToggle
                    onToggle={() => setShowConfirmPassword(v => !v)}
                    rhfProps={signupForm.register('confirm_password')}
                    error={passwordsMismatch ? 'Passwords do not match' : signupForm.formState.errors.confirm_password?.message}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                  />
                  <ErrorCard message={error} />
                  <PrimaryButton type="submit" loading={signupForm.formState.isSubmitting} disabled={passwordsMismatch}>
                    {signupForm.formState.isSubmitting ? 'Creating your account…' : 'Create account'}
                  </PrimaryButton>
                </form>

                {/* Switch to login */}
                <div style={{ textAlign: 'center', borderTop: '1px solid #F0EBE4', paddingTop: 20 }}>
                  <p style={{ fontSize: 13, color: C.body, margin: '0 0 4px' }}>Already have an account?</p>
                  <button
                    type="button" onClick={() => switchMode('login')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.forest, fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
                  >
                    Sign in →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <nav
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px 18px', marginTop: 28, flexWrap: 'wrap' }}
        aria-label="Footer links"
      >
        {[
          { label: 'Privacy', to: '/privacy-policy' },
          { label: 'Terms',   to: '/terms' },
        ].map(({ label, to }) => (
          <Link
            key={label} to={to}
            style={{ fontSize: 12, color: '#9CA3A8', textDecoration: 'none', transition: 'color 150ms' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.forest)}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3A8')}
          >
            {label}
          </Link>
        ))}
        <span style={{ color: '#D5CFC8', fontSize: 10 }}>·</span>
        <a
          href={WA_LINK}
          target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#9CA3A8', textDecoration: 'none', transition: 'color 150ms' }}
          onMouseEnter={e => (e.currentTarget.style.color = C.forest)}
          onMouseLeave={e => (e.currentTarget.style.color = '#9CA3A8')}
        >
          Support
        </a>
      </nav>
    </div>
  )
}
