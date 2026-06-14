import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) throw new Error('Missing Supabase env variables')

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName, role: 'family' } }
  })
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Land back on /auth so it can route by role (family/companion) and
      // surface any error/cancellation Google or Supabase append as query params.
      redirectTo: `${window.location.origin}/auth`,
      queryParams: {
        prompt: 'select_account',
      }
    }
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
