import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, signUp } from '@/lib/supabase'

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

type LoginData = z.infer<typeof loginSchema>
type SignupData = z.infer<typeof signupSchema>

export function AuthPage() {
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) })
  const signupForm = useForm<SignupData>({ resolver: zodResolver(signupSchema) })

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

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-serif text-2xl text-green-900">close <span className="text-green-600">eye</span></Link>
          <p className="text-gray-500 text-sm mt-2">Your trusted presence in India</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-8">
          <div className="flex rounded-xl bg-gray-100 p-1 mb-7">
            {(['login','signup'] as const).map(m=>(
              <button key={m} onClick={()=>setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode===m?'bg-white text-green-900 shadow-sm':'text-gray-400'}`}>
                {m==='login'?'Sign in':'Create account'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Email</label>
                <input {...loginForm.register('email')} type="email" placeholder="you@email.com" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
                {loginForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Password</label>
                <input {...loginForm.register('password')} type="password" placeholder="••••••••" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
                {loginForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{loginForm.formState.errors.password.message}</p>}
              </div>
              {error && <p className="text-red-500 text-sm p-3 bg-red-50 rounded-xl">{error}</p>}
              <button type="submit" disabled={loginForm.formState.isSubmitting}
                className="w-full bg-green-800 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-300 text-sm">
                {loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Full name</label>
                <input {...signupForm.register('full_name')} placeholder="Rahul Mehta" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
                {signupForm.formState.errors.full_name && <p className="text-red-500 text-xs mt-1">{signupForm.formState.errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Email</label>
                <input {...signupForm.register('email')} type="email" placeholder="you@email.com" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
                {signupForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{signupForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Password</label>
                <input {...signupForm.register('password')} type="password" placeholder="••••••••" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-900 mb-1.5">Confirm password</label>
                <input {...signupForm.register('confirm_password')} type="password" placeholder="••••••••" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600" />
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
          <Link to="/" className="hover:text-green-700">← Back to closeeye.in</Link>
        </p>
      </div>
    </div>
  )
}
