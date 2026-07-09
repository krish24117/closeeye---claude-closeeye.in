import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The ONE shared Supabase browser client.
 *
 * Points at the **existing production** Supabase project for BOTH staging
 * (closeeye-next.vercel.app) and production (closeeye.in) — never a duplicate
 * project, never duplicate data. The URL + publishable key come from env only.
 *
 * Session persists in localStorage, which survives Capacitor WebView relaunches,
 * and auto-refreshes. (Step 3 will back this with Capacitor secure storage.)
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** True only when the env vars are present — every call site guards on this. */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient = createClient(
  url || 'https://unconfigured.supabase.co',
  anonKey || 'unconfigured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // PKCE is required for the Google OAuth code exchange (web auto-detects the
      // code on redirect; native exchanges it in the deep-link handler).
      flowType: 'pkce',
      storageKey: 'closeeye.auth',
    },
  },
)
