import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { signIn, signUp, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Logo } from '@/components/ui/Logo'

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

export function AuthPage() {
  // "Register Family" CTAs link to /auth?mode=signup so they open the create-account tab
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

  // A password reset link logs the user in via a temporary recovery session
  // and Supabase fires this event - switch to the "set new password" form
  // instead of treating it like a normal sign-in.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setError('')
        setMode('update-password')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Once a session exists, go to the correct dashboard for this user's role -
  // unless we're in the middle of a password recovery flow. If the visitor
  // clicked Subscribe/Book on the public pricing page before signing up, resume
  // that checkout instead of landing on the plain dashboard.
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
              // Already paid — clear the stale flag and fall through to dashboard
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

  async function handleLogin(data: LoginData) {
    setError('')
    const { error } = await signIn(data.email, data.password)
    if (error) { setError(error.message); return }
  }

  async function handleSignup(data: SignupData) {
    setError('')
    const { data: signUpData, error } = await signUp(data.email, data.password, data.full_name)
    if (error) { setError(error.message); return }
    // If Supabase email confirmation is enabled, no session comes back yet —
    // the user must click the link in their email before they can sign in.
    // Without this, the user is left on the form with no feedback at all.
    if (!signUpData.session) {
      setSignupConfirmSent(true)
    }
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

  // While the auth context is resolving (including Google OAuth callback parsing the
  // URL hash and fetching the profile), show a blank spinner. Without this guard the
  // login/signup form flashes on screen for ~300ms before the redirect fires.
  if (loading && mode !== 'update-password') {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-green-800 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const InputClass = "w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 transition-colors"

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5">
            <Logo className="w-10 h-10" />
            <span className="font-serif text-2xl text-green-900">close <span className="text-green-600">eye</span></span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">Your trusted presence in India</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8">

          {/* Mode tabs */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
              {(['login', 'signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSignupConfirmSent(false) }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? 'bg-white text-green-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {/* Set new password (from password reset email link) */}
          {mode === 'update-password' && (
            <div>
              <h2 className="font-serif text-xl text-green-900 mb-2">Set a new password</h2>
              <p className="text-sm text-gray-500 mb-5">Enter a new password for your account.</p>
              <form onSubmit={updatePasswordForm.handleSubmit(handleUpdatePassword)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">New password</label>
                  <div className="relative">
                    <input {...updatePasswordForm.register('password')} type={showUpdatePassword ? 'text' : 'password'} placeholder="••••••••" className={`${InputClass} pr-11`} />
                    <button type="button" onClick={() => setShowUpdatePassword(v => !v)} aria-label={showUpdatePassword ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                      {showUpdatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {updatePasswordForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{updatePasswordForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">Confirm new password</label>
                  <div className="relative">
                    <input {...updatePasswordForm.register('confirm_password')} type={showUpdateConfirmPassword ? 'text' : 'password'} placeholder="••••••••" className={`${InputClass} pr-11`} />
                    <button type="button" onClick={() => setShowUpdateConfirmPassword(v => !v)} aria-label={showUpdateConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                      {showUpdateConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {updatePasswordsMismatch ? (
                    <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                  ) : updatePasswordForm.formState.errors.confirm_password && (
                    <p className="text-red-500 text-xs mt-1">{updatePasswordForm.formState.errors.confirm_password.message}</p>
                  )}
                </div>
                {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}
                <button type="submit" disabled={updatePasswordForm.formState.isSubmitting || updatePasswordsMismatch}
                  className="w-full bg-green-800 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-300 text-sm">
                  {updatePasswordForm.formState.isSubmitting ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </div>
          )}

          {/* Reset password */}
          {mode === 'reset' && (
            <div>
              <button onClick={() => { setMode('login'); setError(''); setResetSent(false) }}
                className="text-sm text-gray-400 hover:text-green-800 mb-5 flex items-center gap-1">
                ← Back to sign in
              </button>
              <h2 className="font-serif text-xl text-green-900 mb-2">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-5">Enter your email and we'll send a reset link.</p>
              {resetSent ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-2xl mb-2">✉️</p>
                  <p className="text-sm font-semibold text-green-800">Check your email!</p>
                  <p className="text-xs text-green-600 mt-1">We've sent a password reset link.</p>
                </div>
              ) : (
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-1.5">Email</label>
                    <input {...resetForm.register('email')} type="email" placeholder="you@email.com" className={InputClass} />
                    {resetForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{resetForm.formState.errors.email.message}</p>}
                  </div>
                  {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}
                  <button type="submit" disabled={resetForm.formState.isSubmitting}
                    className="w-full bg-green-800 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-300 text-sm">
                    {resetForm.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <div className="space-y-4">
              <GoogleButton onClick={handleGoogleSignIn} />
              <Divider />
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">Email</label>
                  <input {...loginForm.register('email')} type="email" placeholder="you@email.com" className={InputClass} />
                  {loginForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-semibold text-green-900">Password</label>
                    <button type="button" onClick={() => { setMode('reset'); setError('') }}
                      className="text-xs text-green-600 hover:text-green-800 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input {...loginForm.register('password')} type={showLoginPassword ? 'text' : 'password'} placeholder="••••••••" className={`${InputClass} pr-11`} />
                    <button type="button" onClick={() => setShowLoginPassword(v => !v)} aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>}
                </div>
                {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}
                <button type="submit" disabled={loginForm.formState.isSubmitting}
                  className="w-full bg-green-800 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-300 text-sm">
                  {loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>
          )}

          {/* Signup form */}
          {mode === 'signup' && (
            <div className="space-y-4">
              {signupConfirmSent ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-2xl mb-2">✉️</p>
                  <p className="text-sm font-semibold text-green-800">Check your email to confirm your account</p>
                  <p className="text-xs text-green-600 mt-1">We've sent a confirmation link to {signupForm.getValues('email')}. Click it to finish setting up your account.</p>
                  <button
                    type="button"
                    onClick={() => { setSignupConfirmSent(false); signupForm.reset() }}
                    className="text-xs text-green-700 font-semibold hover:underline mt-3"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <>
                  <GoogleButton onClick={handleGoogleSignIn} label="Sign up with Google" />
                  <Divider />
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-green-900 mb-1.5">Full name</label>
                      <input {...signupForm.register('full_name')} placeholder="Rahul Mehta" className={InputClass} />
                      {signupForm.formState.errors.full_name && <p className="text-red-500 text-xs mt-1">{signupForm.formState.errors.full_name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-green-900 mb-1.5">Email</label>
                      <input {...signupForm.register('email')} type="email" placeholder="you@email.com" className={InputClass} />
                      {signupForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{signupForm.formState.errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-green-900 mb-1.5">Password</label>
                      <div className="relative">
                        <input {...signupForm.register('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className={`${InputClass} pr-11`} />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {signupForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{signupForm.formState.errors.password.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-green-900 mb-1.5">Confirm password</label>
                      <div className="relative">
                        <input {...signupForm.register('confirm_password')} type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" className={`${InputClass} pr-11`} />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(v => !v)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {passwordsMismatch ? (
                        <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                      ) : signupForm.formState.errors.confirm_password && (
                        <p className="text-red-500 text-xs mt-1">{signupForm.formState.errors.confirm_password.message}</p>
                      )}
                    </div>
                    {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}
                    <button type="submit" disabled={signupForm.formState.isSubmitting || passwordsMismatch}
                      className="w-full bg-green-800 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-300 text-sm">
                      {signupForm.formState.isSubmitting ? 'Creating account...' : 'Create account'}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/" className="hover:text-green-700 transition-colors">← Back to closeeye.in</Link>
        </p>
      </div>
    </div>
  )
}

function GoogleButton({ onClick, label = 'Continue with Google' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 bg-[#1a3a2a] hover:bg-[#15301f] active:scale-[0.98] rounded-xl py-3.5 text-sm font-semibold text-white transition-all"
    >
      {/* Google G mark on a white pill so it stays legible on the dark background */}
      <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
        </svg>
      </span>
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs text-gray-400 font-medium">or</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}
