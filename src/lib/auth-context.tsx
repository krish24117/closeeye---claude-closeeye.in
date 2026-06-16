import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  full_name: string | null
  whatsapp_number: string | null
  country: string | null
  role: 'family' | 'companion' | 'admin'
  avatar_url: string | null
}

interface AuthCtx {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx>({
  user: null, profile: null, session: null, loading: true,
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    }).catch((err) => {
      console.error('Failed to get session:', err)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        // A fresh sign-in needs the profile (and its role) before any
        // redirect decision is made - re-enter the loading state so
        // pages waiting on `profile` don't act on a stale/null value.
        if (event === 'SIGNED_IN') setLoading(true)
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    try {
      // Use maybeSingle so we can distinguish "no row" from a real error
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setProfile(data)
        return
      }

      // No profile row yet — happens on first Google OAuth login before the
      // DB trigger has committed, or if the trigger somehow missed the row.
      // Create one with role 'family' using the OAuth user metadata.
      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata ?? {}

      const { data: created, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: meta.full_name || meta.name || null,
          avatar_url: meta.avatar_url || meta.picture || null,
          role: 'family',
        })
        .select()
        .single()

      if (insertErr) {
        // Trigger beat us to it — fetch the row it already created
        const { data: refetched } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        setProfile(refetched)
      } else {
        setProfile(created)
      }
    } catch (err) {
      console.error('Failed to fetch/create profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setSession(null)
    // Clear any cached responses so the next user on this device sees no stale data
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
