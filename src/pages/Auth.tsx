import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ShieldCheck, Lock, Users, Loader2 } from 'lucide-react'
import { signIn, signUp, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { LogoLockup } from '@/components/ui/Logo'

/* ── Schemas (unchanged) ─────────────────────────────────────────────── */

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Enter your full name'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match', path: ['confirm_password']
})
const resetSchema = z.object({
  email: z.string().email('Enter a valid email'),
})
const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: "Passwords don't match", path: ['confirm_password']
})

type LoginData = z.infer<typeof loginSchema>
type SignupData = z.infer<typeof signupSchema>
type ResetData = z.infer<typeof resetSchema>
type UpdatePasswordData = z.infer<typeof updatePasswordSchema>
type Mode = 'login' | 'signup' | 'reset' | 'update-password'

function getRoleHome(profile: { role?: string; admin_role?: string | null } | null | undefined) {
  if (profile?.admin_role === 'doctor') return '/doctor'
  if (profile?.role === 'admin') return '/admin'
  if (profile?.role === 'companion') return '/companion'
  return '/dashboard'
}

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919000221261'
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hi, I need help with my Close Eye account.')}`

/* ── Shared sub-components ───────────────────────────────────────────── */

function InputField({
  label,
  error,
  suffix,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; suffix?: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a3a2a', marginBottom: 8, letterSpacing: '.01em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          {...props}
          style={{
            width: '100%', height: 52, borderRadius: 18, border: '1.5px solid #E8E4DE',
            background: '#FAFAF8', padding: suffix ? '0 52px 0 16px' : '0 16px',
            fontSize: 15, color: '#0E2A1F', outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 180ms ease, box-shadow 180ms ease',
            fontFamily: 'inherit',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#2c6b43'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(44,107,67,.12)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = '#E8E4DE'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        {suffix && (
          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {error}
        </p>
      )}
    </div>
  )
}

function PrimaryButton({ children, loading, disabled, style: extraStyle, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        width: '100%', height: 52, borderRadius: 18,
        background: disabled || loading ? '#9ca3af' : 'linear-gradient(180deg, #123B2D 0%, #0E2F22 100%)',
        color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: disabled || loading ? 'default' : 'pointer',
        boxShadow: disabled || loading ? 'none' : '0 4px 16px rgba(14,42,31,.25)',
        transition: 'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'inherit', letterSpacing: '.01em',
        ...extraStyle,
      }}
      onMouseEnter={e => { if (!disabled && !loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(14,42,31,.3)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = disabled || loading ? 'none' : '0 4px 16px rgba(14,42,31,.25)' }}
    >
      {loading && <Loader2 size={17} style={{ animation: 'ce-spin 0.9s linear infinite', flexShrink: 0 }} />}
      {children}
    </button>
  )
}

function EyeToggle({ show, onToggle, label }: { show: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#8E9E98',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, borderRadius: 8,
        transition: 'color 150ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#2c6b43')}
      onMouseLeave={e => (e.currentTarget.style.color = '#8E9E98')}
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}

function ErrorCard({ message }: { message: string }) {
  if (!message) return null
  return (
    <div style={{
      background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: 14,
      padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#912018', margin: 0 }}>Something went wrong</p>
        <p style={{ fontSize: 12, color: '#B42318', margin: '2px 0 0', lineHeight: 1.5 }}>{message}</p>
      </div>
    </div>
  )
}

function GoogleButton({ onClick, label = 'Continue with Google' }: { onClick: () => void; label?: string }) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%', height: 52, borderRadius: 18,
          background: '#1a3a2a', color: '#fff',
          fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          boxShadow: '0 4px 16px rgba(26,58,42,.22)',
          transition: 'transform 160ms ease, box-shadow 160ms ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,58,42,.3)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,58,42,.22)' }}
      >
        <span style={{ width: 22, height: 22, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
        </span>
        {label}
      </button>
      <p style={{ textAlign: 'center', fontSize: 11, color: '#8E9E98', marginTop: 8, fontWeight: 500, letterSpacing: '.03em' }}>
        RECOMMENDED
      </p>
    </div>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: '#EDE8E0' }} />
      <span style={{ fontSize: 11, color: '#A8A09A', fontWeight: 500, whiteSpace: 'nowrap', letterSpacing: '.04em' }}>
        or continue with email
      </span>
      <div style={{ flex: 1, height: 1, background: '#EDE8E0' }} />
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────────── */

export function AuthPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'login')
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [signupConfirmSent, setSignupConfirmSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showUpdatePassword, setShowUpdatePassword] = useState(false)
  const [showUpdateConfirmPassword, setShowUpdateConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()

  /* ── Auth state listeners (unchanged) ──────────────────────────────── */

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setError('')
        setMode('update-password')
      }
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
            navigate(`/dashboard/subscription?autoplan=${pending.planId}`, { replace: true })
            return
          }
          if (pending.type === 'booking') {
            sessionStorage.removeItem('pendingCheckout')
            navigate(`/dashboard/new-booking?service=${pending.serviceType}`, { replace: true })
            return
          }
          if (pending.type === 'membership') {
            if (profile.is_founding_member) {
              sessionStorage.removeItem('pendingCheckout')
            } else {
              navigate('/founding-member/checkout', { replace: true })
              return
            }
          }
        } catch {
          sessionStorage.removeItem('pendingCheckout')
        }
      }
      navigate(getRoleHome(profile), { replace: true })
    }
  }, [loading, user, profile, navigate, mode])

  /* ── Forms (unchanged) ─────────────────────────────────────────────── */

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) })
  const signupPassword = signupForm.watch('password')
  const signupConfirmPassword = signupForm.watch('confirm_password')
  const passwordsMismatch = !!signupConfirmPassword && signupPassword !== signupConfirmPassword
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) })
  const updatePasswordForm = useForm<UpdatePasswordData>({ resolver: zodResolver(updatePasswordSchema) })
  const updatePassword = updatePasswordForm.watch('password')
  const updateConfirmPassword = updatePasswordForm.watch('confirm_password')
  const updatePasswordsMismatch = !!updateConfirmPassword && updatePassword !== updateConfirmPassword

  /* ── Handlers (unchanged) ───────────────────────────────────────────── */

  async function handleLogin(data: LoginData) {
    setError('')
    const { error } = await signIn(data.email, data.password)
    if (error) { setError(error.message); return }
  }

  async function handleSignup(data: SignupData) {
    setError('')
    const { data: signUpData, error } = await signUp(data.email, data.password, data.full_name)
    if (error) { setError(error.message); return }
    if (!signUpData.session) setSignupConfirmSent(true)
  }

  async function handleReset(data: ResetData) {
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth`,
    })
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
      options: {
        redirectTo: `${window.location.origin}/auth`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) setError(error.message)
  }

  /* ── Loading state ───────────────────────────────────────────────────── */

  if (loading && mode !== 'update-password') {
    return (
      <div style={{ minHeight: '100svh', background: 'radial-gradient(ellipse at top, #FAFAF8 0%, #F3F2EC 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} style={{ color: '#2c6b43', animation: 'ce-spin 0.9s linear infinite' }} />
        <style>{`@keyframes ce-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ── Page ─────────────────────────────────────────────────────────────── */

  const switchMode = (m: Mode) => { setMode(m); setError(''); setSignupConfirmSent(false); setResetSent(false) }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'radial-gradient(ellipse at top center, #FAFAF8 0%, #F3F2EC 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      padding: 'max(env(safe-area-inset-top, 24px), 24px) 24px calc(env(safe-area-inset-bottom, 24px) + 24px)',
    }}>
      <style>{`
        @keyframes ce-spin { to { transform: rotate(360deg); } }
        @keyframes ce-fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ce-fade { from { opacity: 0; } to { opacity: 1; } }
        .ce-auth-card { animation: ce-fadeUp 0.35s ease both; }
        .ce-auth-hero { animation: ce-fadeUp 0.3s ease both; }
        .ce-auth-badges { animation: ce-fadeUp 0.35s ease both 0.08s; }
        .ce-auth-form-inner { animation: ce-fade 0.25s ease both; }
        .ce-auth-input:focus { border-color: #2c6b43 !important; box-shadow: 0 0 0 3px rgba(44,107,67,.12) !important; }
      `}</style>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="ce-auth-hero" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16, width: '100%', maxWidth: 420 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <LogoLockup fontSize={22} color="dark" />
        </Link>
      </div>

      {/* ── Trust badges ──────────────────────────────────────────────── */}
      {(mode === 'login' || mode === 'signup') && (
        <div className="ce-auth-badges" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 14px', marginBottom: 16 }}>
          {[
            { icon: ShieldCheck, text: 'Secure Login' },
            { icon: Lock,        text: 'End-to-End Encrypted' },
            { icon: Users,       text: 'Trusted by Families' },
          ].map(({ icon: Icon, text }) => (
            <span key={text} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#5A7A65', letterSpacing: '.02em' }}>
              <Icon size={11} strokeWidth={2.2} style={{ color: '#2c6b43', flexShrink: 0 }} />
              {text}
            </span>
          ))}
        </div>
      )}

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <div className="ce-auth-card" style={{
        width: '100%', maxWidth: 420,
        background: '#fff', borderRadius: 28,
        boxShadow: '0 4px 6px rgba(14,42,31,.04), 0 20px 60px rgba(14,42,31,.10)',
        padding: '20px 24px',
      }}>

        {/* UPDATE PASSWORD ───────────────────────────────────────────── */}
        {mode === 'update-password' && (
          <div className="ce-auth-form-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0E2A1F', margin: '0 0 6px', letterSpacing: '-.02em', textAlign: 'center' }}>Set a new password</h2>
              <p style={{ fontSize: 13, color: '#6B7A72', margin: 0, lineHeight: 1.6, textAlign: 'center' }}>Enter a new password for your account.</p>
            </div>
            <form onSubmit={updatePasswordForm.handleSubmit(handleUpdatePassword)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InputField
                label="New password"
                type={showUpdatePassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                error={updatePasswordForm.formState.errors.password?.message}
                suffix={<EyeToggle show={showUpdatePassword} onToggle={() => setShowUpdatePassword(v => !v)} label={showUpdatePassword ? 'Hide password' : 'Show password'} />}
                {...updatePasswordForm.register('password')}
              />
              <InputField
                label="Confirm new password"
                type={showUpdateConfirmPassword ? 'text' : 'password'}
                placeholder="Repeat your password"
                error={updatePasswordsMismatch ? 'Passwords do not match' : updatePasswordForm.formState.errors.confirm_password?.message}
                suffix={<EyeToggle show={showUpdateConfirmPassword} onToggle={() => setShowUpdateConfirmPassword(v => !v)} label={showUpdateConfirmPassword ? 'Hide password' : 'Show password'} />}
                {...updatePasswordForm.register('confirm_password')}
              />
              <ErrorCard message={error} />
              <PrimaryButton type="submit" loading={updatePasswordForm.formState.isSubmitting} disabled={updatePasswordsMismatch}>
                {updatePasswordForm.formState.isSubmitting ? 'Updating password…' : 'Update password'}
              </PrimaryButton>
            </form>
          </div>
        )}

        {/* RESET PASSWORD ─────────────────────────────────────────────── */}
        {mode === 'reset' && (
          <div className="ce-auth-form-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <button
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6B7A72', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
              >
                ← Back to sign in
              </button>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0E2A1F', margin: '0 0 6px', letterSpacing: '-.02em', textAlign: 'center' }}>Forgot your password?</h2>
              <p style={{ fontSize: 13, color: '#6B7A72', margin: 0, lineHeight: 1.6, textAlign: 'center' }}>Enter your email and we'll send a reset link.</p>
            </div>
            {resetSent ? (
              <div style={{ background: '#F0FAF4', border: '1px solid #B7E4C7', borderRadius: 18, padding: '24px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#0E2A1F', margin: '0 0 6px' }}>Check your email</p>
                <p style={{ fontSize: 13, color: '#5A7A65', margin: 0, lineHeight: 1.6 }}>We've sent a password reset link. It may take a minute to arrive.</p>
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

        {/* LOGIN ──────────────────────────────────────────────────────── */}
        {mode === 'login' && (
          <div key="login" className="ce-auth-form-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 0 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0E2A1F', margin: '0 0 6px', padding: 0, letterSpacing: '-.02em', lineHeight: 1.15 }}>Welcome back</h2>
              <p style={{ fontSize: 13, color: '#6B7A72', margin: 0, padding: 0, lineHeight: 1.5 }}>Sign in to your family's care dashboard.</p>
            </div>
            <GoogleButton onClick={handleGoogleSignIn} />
            <Divider />
            <form onSubmit={loginForm.handleSubmit(handleLogin)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <InputField
                label="Email address"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                error={loginForm.formState.errors.email?.message}
                {...loginForm.register('email')}
              />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', letterSpacing: '.01em' }}>Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#2c6b43', fontFamily: 'inherit', fontWeight: 600, padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    {...loginForm.register('password')}
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%', height: 52, borderRadius: 18, border: '1.5px solid #E8E4DE',
                      background: '#FAFAF8', padding: '0 52px 0 16px', fontSize: 15, color: '#0E2A1F',
                      outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                      transition: 'border-color 180ms ease, box-shadow 180ms ease',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2c6b43'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(44,107,67,.12)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E8E4DE'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EyeToggle show={showLoginPassword} onToggle={() => setShowLoginPassword(v => !v)} label={showLoginPassword ? 'Hide password' : 'Show password'} />
                  </div>
                </div>
                {loginForm.formState.errors.password && (
                  <p style={{ fontSize: 12, color: '#c0392b', marginTop: 6 }}>{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <ErrorCard message={error} />
              <PrimaryButton type="submit" loading={loginForm.formState.isSubmitting}>
                {loginForm.formState.isSubmitting ? 'Signing you in…' : 'Sign in'}
              </PrimaryButton>
            </form>

            {/* Security badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <ShieldCheck size={13} strokeWidth={2} style={{ color: '#8E9E98' }} />
              <span style={{ fontSize: 11, color: '#8E9E98', letterSpacing: '.03em' }}>Protected by Close Eye Security</span>
            </div>

            {/* Switch to signup */}
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7A72', margin: 0 }}>
              New to Close Eye?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#2c6b43', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
              >
                Create your account →
              </button>
            </p>
          </div>
        )}

        {/* SIGNUP ─────────────────────────────────────────────────────── */}
        {mode === 'signup' && (
          <div key="signup" className="ce-auth-form-inner" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {signupConfirmSent ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0E2A1F', margin: '0 0 8px' }}>Check your email</h3>
                <p style={{ fontSize: 13, color: '#6B7A72', lineHeight: 1.6, margin: '0 0 20px' }}>
                  We've sent a confirmation link to <strong style={{ color: '#0E2A1F' }}>{signupForm.getValues('email')}</strong>. Click it to finish setting up your account.
                </p>
                <button
                  type="button"
                  onClick={() => { setSignupConfirmSent(false); signupForm.reset() }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#2c6b43', fontWeight: 700, fontFamily: 'inherit', textDecoration: 'underline', textDecorationColor: 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecorationColor = '#2c6b43')}
                  onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', padding: 0 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0E2A1F', margin: '0 0 6px', padding: 0, letterSpacing: '-.02em', lineHeight: 1.15 }}>Create your account</h2>
                  <p style={{ fontSize: 13, color: '#6B7A72', margin: 0, padding: 0, lineHeight: 1.5 }}>Set up your family's care dashboard in minutes.</p>
                </div>
                <GoogleButton onClick={handleGoogleSignIn} label="Sign up with Google" />
                <Divider />
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
                  <InputField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    error={signupForm.formState.errors.password?.message}
                    suffix={<EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} label={showPassword ? 'Hide password' : 'Show password'} />}
                    {...signupForm.register('password')}
                  />
                  <InputField
                    label="Confirm password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    error={passwordsMismatch ? 'Passwords do not match' : signupForm.formState.errors.confirm_password?.message}
                    suffix={<EyeToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} label={showConfirmPassword ? 'Hide password' : 'Show password'} />}
                    {...signupForm.register('confirm_password')}
                  />
                  <ErrorCard message={error} />
                  <PrimaryButton type="submit" loading={signupForm.formState.isSubmitting} disabled={passwordsMismatch}>
                    {signupForm.formState.isSubmitting ? 'Creating your account…' : 'Create account'}
                  </PrimaryButton>
                </form>

                {/* Switch to login */}
                <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7A72', margin: 0 }}>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#2c6b43', fontWeight: 700, fontFamily: 'inherit', padding: 0 }}
                  >
                    Sign in →
                  </button>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <nav style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px', marginTop: 28 }} aria-label="Footer links">
        {[
          { label: 'Privacy',           to: '/privacy-policy' },
          { label: 'Terms',             to: '/terms' },
          { label: 'Help',              to: '/contact' },
        ].map(({ label, to }) => (
          <Link
            key={label}
            to={to}
            style={{ fontSize: 12, color: '#9CA3A8', textDecoration: 'none', transition: 'color 150ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2c6b43')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3A8')}
          >
            {label}
          </Link>
        ))}
        <a
          href={WA_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#9CA3A8', textDecoration: 'none', transition: 'color 150ms ease' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2c6b43')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9CA3A8')}
        >
          WhatsApp Support
        </a>
      </nav>
    </div>
  )
}
