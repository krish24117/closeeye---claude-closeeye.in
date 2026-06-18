import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) throw new Error('Missing Supabase env variables')

export const supabase = createClient(url, key, {
  auth: {
    flowType: 'implicit',   // avoids PKCE code-verifier loss across Google redirect
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})
