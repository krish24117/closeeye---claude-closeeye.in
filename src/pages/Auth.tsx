import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, signUp, supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
const signupSchema = loginSchema.extend({
  full_name: z.string().min(2, 'Enter your full name'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: "Passwords don't match", path: ['confirm_password']
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

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
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
  // unless we're in the middle of a password recovery flow.
  useEffect(() => {
    if (!loading && user && mode !== 'update-password') {
      navigate(profile?.role === 'companion' ? '/companion' : '/dashboard', { replace: true })
    }
  }, [loading, user, profile, navigate, mode])

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) })
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) })
  const updatePasswordForm = useForm<UpdatePasswordData>({ resolver: zodResolver(updatePasswordSchema) })

  async function handleLogin(data: LoginData) {
    setError('')
    const { error } = await signIn(data.email, data.password)
    if (error) { setError(error.message); return }
    navigate('/dashboard')
  }

  async function handleSignup(data: SignupData) {
    setError('')
    const { error } = await signUp(data.email, data.password, data.full_name)
    if (error) { setError(error.message); return }
    navigate('/dashboard')
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
    navigate(profile?.role === 'companion' ? '/companion' : '/dashboard', { replace: true })
  }

  const InputClass = "w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 transition-colors"

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none">
              <defs>
                <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a8ff3e"/>
                  <stop offset="100%" stopColor="#1a6b3a"/>
                </linearGradient>
              </defs>
              <path d="M50 10 C50 10, 55 35, 70 35 C55 35, 90 40, 90 50 C90 50, 65 55, 65 70 C65 70, 55 45, 50 90 C50 90, 45 65, 35 70 C35 70, 10 60, 10 50 C10 50, 35 45, 30 30 C30 30, 45 35, 50 10Z" fill="url(#lg)" opacity="0.9"/>
              <circle cx="50" cy="82" r="6" fill="url(#lg)"/>
            </svg>
            <span className="font-serif text-2xl text-green-900">close <span className="text-green-600">eye</span></span>
          </Link>
          <p className="text-gray-500 text-sm mt-2">Your trusted presence in India</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8">

          {/* Mode tabs */}
          {(mode === 'login' || mode === 'signup') && (
            <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
              {(['login', 'signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError('') }}
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
                  <input {...updatePasswordForm.register('password')} type="password" placeholder="••••••••" className={InputClass} />
                  {updatePasswordForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{updatePasswordForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">Confirm new password</label>
                  <input {...updatePasswordForm.register('confirm_password')} type="password" placeholder="••••••••" className={InputClass} />
                  {updatePasswordForm.formState.errors.confirm_password && <p className="text-red-500 text-xs mt-1">{updatePasswordForm.formState.errors.confirm_password.message}</p>}
                </div>
                {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}
                <button type="submit" disabled={updatePasswordForm.formState.isSubmitting}
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
                <input {...loginForm.register('password')} type="password" placeholder="••••••••" className={InputClass} />
                {loginForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>}
              </div>
              {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}
              <button type="submit" disabled={loginForm.formState.isSubmitting}
                className="w-full bg-green-800 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-300 text-sm">
                {loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Signup form */}
          {mode === 'signup' && (
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
                <input {...signupForm.register('password')} type="password" placeholder="••••••••" className={InputClass} />
                {signupForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{signupForm.formState.errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Confirm password</label>
                <input {...signupForm.register('confirm_password')} type="password" placeholder="••••••••" className={InputClass} />
                {signupForm.formState.errors.confirm_password && <p className="text-red-500 text-xs mt-1">{signupForm.formState.errors.confirm_password.message}</p>}
              </div>
              {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}
              <button type="submit" disabled={signupForm.formState.isSubmitting}
                className="w-full bg-green-800 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-300 text-sm">
                {signupForm.formState.isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/" className="hover:text-green-700 transition-colors">← Back to closeeye.in</Link>
        </p>
      </div>
    </div>
  )
}
